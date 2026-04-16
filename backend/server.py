from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import secrets
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Cryptographically-backed RNG for simulation integrity
_rng = secrets.SystemRandom()

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

class SensorReading(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instrument_id: str
    instrument_name: str
    type: Literal["flow", "pressure", "ph", "conductivity", "chlorine", "level"]
    value: float
    unit: str
    status: Literal["online", "offline", "warning"]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["compliance", "leak", "anomaly", "offline"]
    severity: Literal["critical", "warning", "info"]
    message: str
    instrument_id: Optional[str] = None
    instrument_name: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged: bool = False

class Anomaly(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instrument_id: str
    instrument_name: str
    anomaly_type: str
    confidence: float
    description: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIQueryRequest(BaseModel):
    query: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class SystemStats(BaseModel):
    total_flow: float
    avg_pressure: float
    active_alerts: int
    anomalies_detected: int
    online_sensors: int
    total_sensors: int

class LeakEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    zone_id: str
    zone_name: str
    severity: Literal["critical", "warning", "minor"]
    estimated_loss: float  # L/min
    confidence: float
    active: bool = True
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

instruments = [
    # Flow Indicators (FIT)
    {"id": "FIT_10", "name": "Main Feed Flow", "type": "flow", "unit": "L/min", "baseline": 150.0, "variance": 15.0},
    {"id": "FIT_FL", "name": "Fire Line Flow", "type": "flow", "unit": "L/min", "baseline": 95.0, "variance": 10.0},
    {"id": "FIT_8", "name": "Nano Recovery 2 Flow", "type": "flow", "unit": "L/min", "baseline": 85.0, "variance": 8.0},
    {"id": "FIT_6", "name": "Nano Recovery 1 Flow", "type": "flow", "unit": "L/min", "baseline": 120.0, "variance": 12.0},
    {"id": "FIT_CIP", "name": "CIP Line Flow", "type": "flow", "unit": "L/min", "baseline": 60.0, "variance": 8.0},
    # Level Indicators (LIT)
    {"id": "LIT_MR", "name": "Main Reservoir Level", "type": "level", "unit": "m\u00b3", "baseline": 450.0, "variance": 30.0},
    {"id": "LIT_RT4", "name": "Reservoir Tank 4 Level", "type": "level", "unit": "m\u00b3", "baseline": 100.0, "variance": 10.0},
    {"id": "LIT_RR2", "name": "Red Reservoir 2 Level", "type": "level", "unit": "m\u00b3", "baseline": 12.0, "variance": 2.0},
    {"id": "LIT_STW", "name": "Semi Treated Tank Level", "type": "level", "unit": "m\u00b3", "baseline": 30.0, "variance": 4.0},
    {"id": "LIT_TWT", "name": "Treated Water Tank Level", "type": "level", "unit": "m\u00b3", "baseline": 20.0, "variance": 3.0},
    {"id": "LIT_HT", "name": "Holding Tank Level", "type": "level", "unit": "m\u00b3", "baseline": 50.0, "variance": 6.0},
    {"id": "LIT_BRT", "name": "Backwash Recovery Level", "type": "level", "unit": "m\u00b3", "baseline": 28.0, "variance": 5.0},
    {"id": "LIT_ST", "name": "Storage Tank Level", "type": "level", "unit": "m\u00b3", "baseline": 8.0, "variance": 1.5},
    {"id": "LIT_NR2", "name": "Nano Recovery 2 Level", "type": "level", "unit": "m\u00b3", "baseline": 3.5, "variance": 0.5},
    {"id": "LIT_NR1", "name": "Nano Recovery 1 Level", "type": "level", "unit": "m\u00b3", "baseline": 3.5, "variance": 0.5},
    # Pressure Indicators (PIT)
    {"id": "PIT_RACF1", "name": "RACF 1 Pressure", "type": "pressure", "unit": "bar", "baseline": 3.2, "variance": 0.3},
    {"id": "PIT_RACF2", "name": "RACF 2 Pressure", "type": "pressure", "unit": "bar", "baseline": 3.2, "variance": 0.3},
    {"id": "PIT_RACF3", "name": "RACF 3 Pressure", "type": "pressure", "unit": "bar", "baseline": 3.2, "variance": 0.3},
    {"id": "PIT_NACF1", "name": "NACF 1 Pressure", "type": "pressure", "unit": "bar", "baseline": 2.8, "variance": 0.25},
    {"id": "PIT_NACF2", "name": "NACF 2 Pressure", "type": "pressure", "unit": "bar", "baseline": 2.8, "variance": 0.25},
    # Water Quality
    {"id": "pH_RO", "name": "RO Break Tank pH", "type": "ph", "unit": "pH", "baseline": 7.2, "variance": 0.3},
    {"id": "pH_NACF", "name": "NACF pH/Cl", "type": "ph", "unit": "pH", "baseline": 7.0, "variance": 0.4},
    {"id": "CL_001", "name": "Free Chlorine", "type": "chlorine", "unit": "mg/L", "baseline": 0.8, "variance": 0.15},
    {"id": "EC_RO", "name": "RO Conductivity", "type": "conductivity", "unit": "\u00b5S/cm", "baseline": 450.0, "variance": 50.0},
    {"id": "EC_NANO", "name": "Nano Filtration EC", "type": "conductivity", "unit": "\u00b5S/cm", "baseline": 380.0, "variance": 40.0},
    # Differential Pressure (DPT)
    {"id": "DPT_BF", "name": "Bag Filter dP", "type": "pressure", "unit": "bar", "baseline": 0.8, "variance": 0.15},
    {"id": "DPT_PF", "name": "Polishing Filter dP", "type": "pressure", "unit": "bar", "baseline": 0.5, "variance": 0.1},
]

leak_zones = [
    {"id": "LZ_01", "name": "Main Feed Line", "x": "30%", "y": "12%"},
    {"id": "LZ_02", "name": "RO Feed Junction", "x": "40%", "y": "40%"},
    {"id": "LZ_03", "name": "Recovery Line", "x": "55%", "y": "80%"},
    {"id": "LZ_04", "name": "CIP Distribution", "x": "82%", "y": "25%"},
    {"id": "LZ_05", "name": "Nano Recovery Pipe", "x": "60%", "y": "70%"},
    {"id": "LZ_06", "name": "WWTP Outflow", "x": "90%", "y": "85%"},
]

async def _store_doc(collection, model_instance):
    """Serialize and insert a Pydantic model into a MongoDB collection."""
    doc = model_instance.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await collection.insert_one(doc)


async def _create_compliance_alert(instrument, value, alert_type, severity, message):
    """Generate and store a compliance/offline alert."""
    alert = Alert(
        type=alert_type,
        severity=severity,
        message=message,
        instrument_id=instrument["id"],
        instrument_name=instrument["name"],
    )
    await _store_doc(db.alerts, alert)


def _check_compliance(instrument, value):
    """Return (alert_type, severity, message) if value is out-of-spec, else None."""
    itype = instrument["type"]
    if itype == "ph" and (value < 6.5 or value > 8.5):
        return ("compliance", "critical", f"pH out of spec: {value:.2f} (acceptable range: 6.5-8.5)")
    if itype == "chlorine" and (value < 0.5 or value > 1.2):
        return ("compliance", "warning", f"Chlorine out of spec: {value:.2f} mg/L (acceptable range: 0.5-1.2 mg/L)")
    return None


async def generate_sensor_reading(instrument):
    value = instrument["baseline"] + _rng.uniform(-instrument["variance"], instrument["variance"])

    status = "online"
    if _rng.random() < 0.05:
        status = "warning" if _rng.random() < 0.7 else "offline"

    reading = SensorReading(
        instrument_id=instrument["id"],
        instrument_name=instrument["name"],
        type=instrument["type"],
        value=round(value, 2),
        unit=instrument["unit"],
        status=status,
    )
    await _store_doc(db.sensor_readings, reading)

    compliance = _check_compliance(instrument, value)
    if compliance:
        await _create_compliance_alert(instrument, value, *compliance)

    if status == "offline":
        await _create_compliance_alert(
            instrument, value, "offline", "critical",
            f"Sensor {instrument['name']} is offline",
        )

    if _rng.random() < 0.02:
        anomaly = Anomaly(
            instrument_id=instrument["id"],
            instrument_name=instrument["name"],
            anomaly_type="spike" if _rng.random() < 0.5 else "drift",
            confidence=round(_rng.uniform(0.7, 0.95), 2),
            description=f"Unusual pattern detected in {instrument['name']}",
        )
        await _store_doc(db.anomalies, anomaly)

    return reading


async def _simulate_leak():
    """Simulate a random leak event and create associated alert."""
    zone = _rng.choice(leak_zones)
    severity = _rng.choices(["minor", "warning", "critical"], weights=[0.5, 0.35, 0.15])[0]
    loss_map = {"minor": (0.5, 3.0), "warning": (3.0, 10.0), "critical": (10.0, 30.0)}
    lo, hi = loss_map[severity]
    leak = LeakEvent(
        zone_id=zone["id"],
        zone_name=zone["name"],
        severity=severity,
        estimated_loss=round(_rng.uniform(lo, hi), 2),
        confidence=round(_rng.uniform(0.6, 0.98), 2),
    )
    await _store_doc(db.leaks, leak)

    alert = Alert(
        type="leak",
        severity="critical" if severity == "critical" else "warning",
        message=f"Leak detected at {zone['name']}: ~{leak.estimated_loss} L/min loss ({severity})",
        instrument_id=zone["id"],
        instrument_name=zone["name"],
    )
    await _store_doc(db.alerts, alert)

async def sensor_simulation_loop():
    while True:
        try:
            for instrument in instruments:
                await generate_sensor_reading(instrument)

            # Leak simulation: ~3% chance per cycle
            if _rng.random() < 0.03:
                await _simulate_leak()

            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Error in sensor simulation: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(sensor_simulation_loop())

@api_router.get("/")
async def root():
    return {"message": "Digital Twin API"}

@api_router.get("/sensors/latest", response_model=List[SensorReading])
async def get_latest_sensors():
    latest_readings = []
    for instrument in instruments:
        reading = await db.sensor_readings.find_one(
            {"instrument_id": instrument["id"]},
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        if reading:
            _parse_timestamp(reading)
            latest_readings.append(reading)
    return latest_readings

@api_router.get("/sensors/{instrument_id}/history", response_model=List[SensorReading])
async def get_sensor_history(instrument_id: str, limit: int = 50):
    readings = await db.sensor_readings.find(
        {"instrument_id": instrument_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    for reading in readings:
        _parse_timestamp(reading)

    return readings

RANGE_MAP = {
    "1h": timedelta(hours=1),
    "6h": timedelta(hours=6),
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}


def _parse_timestamp(doc):
    """Ensure doc['timestamp'] is a datetime object."""
    if isinstance(doc["timestamp"], str):
        doc["timestamp"] = datetime.fromisoformat(doc["timestamp"])


def _compute_rolling_avg(vals, window):
    """Compute a rolling average with the given window size."""
    result = []
    for i in range(len(vals)):
        start = max(0, i - window + 1)
        result.append(round(sum(vals[start : i + 1]) / (i - start + 1), 2))
    return result


def _compute_stats(values):
    """Return a stats dict from a list of float values."""
    if not values:
        return {}
    mean = sum(values) / len(values)
    return {
        "current": values[-1],
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "mean": round(mean, 2),
        "std_dev": round((sum((v - mean) ** 2 for v in values) / len(values)) ** 0.5, 2),
        "data_points": len(values),
    }


def _get_thresholds(instrument):
    """Return compliance threshold dict for an instrument."""
    itype = instrument["type"]
    if itype == "ph":
        return {"low": 6.5, "high": 8.5, "label": "pH Compliance Range"}
    if itype == "chlorine":
        return {"low": 0.5, "high": 1.2, "label": "Chlorine Compliance Range"}
    if itype in ("pressure", "flow"):
        margin = instrument["variance"] * 2
        return {
            "low": instrument["baseline"] - margin,
            "high": instrument["baseline"] + margin,
            "label": "Normal Operating Range",
        }
    return {}


async def _fetch_recent_docs(collection, instrument_id, limit=10):
    """Fetch recent docs for an instrument, normalizing timestamps to ISO strings."""
    docs = await collection.find(
        {"instrument_id": instrument_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    for d in docs:
        _parse_timestamp(d)
        d["timestamp"] = d["timestamp"].isoformat() if isinstance(d["timestamp"], datetime) else d["timestamp"]
    return docs


@api_router.get("/sensors/{instrument_id}/analytics")
async def get_sensor_analytics(instrument_id: str, time_range: str = "all", start_date: Optional[str] = None, end_date: Optional[str] = None):
    instrument = next((i for i in instruments if i["id"] == instrument_id), None)
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")

    time_filter = {"instrument_id": instrument_id}

    # Custom date range takes precedence over preset ranges
    if start_date and end_date:
        time_filter["timestamp"] = {"$gte": start_date, "$lte": end_date}
    elif time_range in RANGE_MAP:
        cutoff = (datetime.now(timezone.utc) - RANGE_MAP[time_range]).isoformat()
        time_filter["timestamp"] = {"$gte": cutoff}

    readings = await db.sensor_readings.find(
        time_filter, {"_id": 0}
    ).sort("timestamp", 1).limit(500).to_list(500)

    for r in readings:
        _parse_timestamp(r)

    values = [r["value"] for r in readings]
    timestamps = [
        r["timestamp"].isoformat() if isinstance(r["timestamp"], datetime) else r["timestamp"]
        for r in readings
    ]

    return {
        "instrument": {
            "id": instrument["id"],
            "name": instrument["name"],
            "type": instrument["type"],
            "unit": instrument["unit"],
            "baseline": instrument["baseline"],
        },
        "time_series": {
            "timestamps": timestamps,
            "values": values,
            "rolling_avg_5": _compute_rolling_avg(values, 5),
            "rolling_avg_10": _compute_rolling_avg(values, 10),
        },
        "stats": _compute_stats(values),
        "thresholds": _get_thresholds(instrument),
        "recent_alerts": await _fetch_recent_docs(db.alerts, instrument_id),
        "recent_anomalies": await _fetch_recent_docs(db.anomalies, instrument_id),
    }

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(acknowledged: Optional[bool] = None, limit: int = 100):
    query = {}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)

    for alert in alerts:
        _parse_timestamp(alert)

    return alerts

@api_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"acknowledged": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}

@api_router.get("/anomalies", response_model=List[Anomaly])
async def get_anomalies(limit: int = 50):
    anomalies = await db.anomalies.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)

    for anomaly in anomalies:
        _parse_timestamp(anomaly)

    return anomalies

@api_router.get("/stats", response_model=SystemStats)
async def get_system_stats():
    latest_readings = []
    for instrument in instruments:
        reading = await db.sensor_readings.find_one(
            {"instrument_id": instrument["id"]},
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        if reading:
            latest_readings.append(reading)
    
    total_flow = sum(r["value"] for r in latest_readings if r["type"] == "flow")
    pressure_readings = [r["value"] for r in latest_readings if r["type"] == "pressure"]
    avg_pressure = sum(pressure_readings) / len(pressure_readings) if pressure_readings else 0
    
    active_alerts = await db.alerts.count_documents({"acknowledged": False})
    anomalies_count = await db.anomalies.count_documents({})
    online_sensors = sum(1 for r in latest_readings if r["status"] == "online")
    
    return SystemStats(
        total_flow=round(total_flow, 2),
        avg_pressure=round(avg_pressure, 2),
        active_alerts=active_alerts,
        anomalies_detected=anomalies_count,
        online_sensors=online_sensors,
        total_sensors=len(instruments)
    )

@api_router.post("/ai/query")
async def query_ai(request: AIQueryRequest):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.query
        )
        user_doc = user_msg.model_dump()
        user_doc['timestamp'] = user_doc['timestamp'].isoformat()
        await db.chat_messages.insert_one(user_doc)
        
        recent_stats = await get_system_stats()
        latest_alerts = await get_alerts(acknowledged=False, limit=5)
        
        context = f"""You are an AI assistant for a water reticulation digital twin system. Current system status:
- Total Flow: {recent_stats.total_flow} L/min
- Average Pressure: {recent_stats.avg_pressure} bar
- Active Alerts: {recent_stats.active_alerts}
- Anomalies Detected: {recent_stats.anomalies_detected}
- Online Sensors: {recent_stats.online_sensors}/{recent_stats.total_sensors}

Recent Alerts: {[f"{a['severity']}: {a['message']}" for a in latest_alerts[:3]]}

Answer the user's question about the water reticulation system based on this data."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=request.session_id,
            system_message=context
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=request.query)
        response = await chat.send_message(user_message)
        
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response
        )
        assistant_doc = assistant_msg.model_dump()
        assistant_doc['timestamp'] = assistant_doc['timestamp'].isoformat()
        await db.chat_messages.insert_one(assistant_doc)
        
        return {"response": response}
    except Exception as e:
        logger.error(f"AI query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/history/{session_id}", response_model=List[ChatMessage])
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    
    for msg in messages:
        _parse_timestamp(msg)

    return messages

# ── Leak Detection ──────────────────────────────────────────
@api_router.get("/leaks")
async def get_leaks(active_only: bool = True, limit: int = 50):
    query = {}
    if active_only:
        query["active"] = True
    leaks = await db.leaks.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for lk in leaks:
        _parse_timestamp(lk)
        lk["timestamp"] = lk["timestamp"].isoformat() if isinstance(lk["timestamp"], datetime) else lk["timestamp"]
    return leaks

@api_router.get("/leaks/zones")
async def get_leak_zones():
    zones_with_status = []
    for zone in leak_zones:
        active_leak = await db.leaks.find_one(
            {"zone_id": zone["id"], "active": True},
            {"_id": 0},
            sort=[("timestamp", -1)],
        )
        has_leak = active_leak is not None
        zones_with_status.append({
            **zone,
            "has_leak": has_leak,
            "severity": active_leak["severity"] if has_leak else None,
            "estimated_loss": active_leak["estimated_loss"] if has_leak else 0,
            "confidence": active_leak["confidence"] if has_leak else 0,
        })
    return zones_with_status

COMPLIANCE_SPECS = {
    "pH_001": {"name": "RO Water pH", "unit": "pH", "low": 6.5, "high": 8.5},
    "CL_001": {"name": "Free Chlorine", "unit": "mg/L", "low": 0.5, "high": 1.2},
    "EC_001": {"name": "Water Conductivity", "unit": "µS/cm", "low": 200.0, "high": 800.0},
}


async def _build_compliance_row(inst_id, spec, cutoff):
    """Build a single compliance row for the report."""
    readings = await db.sensor_readings.find(
        {"instrument_id": inst_id, "timestamp": {"$gte": cutoff}}, {"_id": 0}
    ).sort("timestamp", 1).to_list(5000)

    values = [r["value"] for r in readings]
    if not values:
        return None

    out_of_spec = [v for v in values if v < spec["low"] or v > spec["high"]]
    total = len(values)
    return {
        "instrument_id": inst_id,
        "instrument_name": spec["name"],
        "unit": spec["unit"],
        "low_limit": spec["low"],
        "high_limit": spec["high"],
        "readings_count": total,
        "min_value": round(min(values), 2),
        "max_value": round(max(values), 2),
        "mean_value": round(sum(values) / total, 2),
        "out_of_spec_count": len(out_of_spec),
        "compliance_pct": round(((total - len(out_of_spec)) / total) * 100, 1),
    }


# ── Compliance Report ───────────────────────────────────────
@api_router.get("/reports/compliance")
async def get_compliance_report(time_range: str = "24h"):
    now = datetime.now(timezone.utc)
    delta = RANGE_MAP.get(time_range, timedelta(hours=24))
    cutoff = (now - delta).isoformat()

    report_rows = []
    for inst_id, spec in COMPLIANCE_SPECS.items():
        row = await _build_compliance_row(inst_id, spec, cutoff)
        if row:
            report_rows.append(row)

    alert_counts = {
        atype: await db.alerts.count_documents({"type": atype, "timestamp": {"$gte": cutoff}})
        for atype in ("compliance", "leak", "anomaly", "offline")
    }

    return {
        "report_generated": now.isoformat(),
        "range": time_range,
        "range_start": cutoff,
        "range_end": now.isoformat(),
        "compliance_data": report_rows,
        "alert_summary": alert_counts,
        "total_leak_events": await db.leaks.count_documents({"timestamp": {"$gte": cutoff}}),
    }

# ── Water Balance ────────────────────────────────────────────

WATER_BALANCE_NODES = {
    "municipal_intake": {"label": "Municipal Intake", "source_sensor": "FIT_10"},
    "cip_consumption": {"label": "CIP Lines", "source_sensor": "FIT_CIP"},
    "fire_line": {"label": "Fire / Production Line", "source_sensor": "FIT_FL"},
    "nano_recovery_1": {"label": "Nano Recovery 1", "source_sensor": "FIT_6"},
    "nano_recovery_2": {"label": "Nano Recovery 2", "source_sensor": "FIT_8"},
    "backwash_recovery": {"label": "Backwash Recovery", "source_sensor": "LIT_BRT"},
}

# Production line split ratios (from fire line flow)
PRODUCTION_SPLIT = {
    "pet_lines": {"label": "PET Lines", "ratio": 0.45},
    "canline": {"label": "Canline", "ratio": 0.30},
    "syrup_room": {"label": "Syrup Room", "ratio": 0.25},
}


@api_router.get("/water-balance")
async def get_water_balance():
    sensor_values = {}
    for key, node in WATER_BALANCE_NODES.items():
        reading = await db.sensor_readings.find_one(
            {"instrument_id": node["source_sensor"]},
            {"_id": 0},
            sort=[("timestamp", -1)],
        )
        sensor_values[key] = reading["value"] if reading else 0.0

    municipal = sensor_values["municipal_intake"]
    cip = sensor_values["cip_consumption"]
    fire_line = sensor_values["fire_line"]
    nano_r1 = sensor_values["nano_recovery_1"]
    nano_r2 = sensor_values["nano_recovery_2"]
    backwash_level = sensor_values["backwash_recovery"]
    backwash_flow = round(backwash_level * 0.35, 2)

    # Additional inflows (simulated)
    rainfall_runoff = round(_rng.uniform(2.5, 8.0), 2)
    borehole = round(_rng.uniform(5.0, 15.0), 2)
    total_inflows = round(municipal + rainfall_runoff + borehole, 2)

    total_recovery = round(nano_r1 + nano_r2 + backwash_flow, 2)
    total_system = round(total_inflows + total_recovery, 2)

    # Treatment
    treatment_loss_pct = 0.05 + _rng.uniform(-0.01, 0.01)
    treatment_loss = round(total_inflows * treatment_loss_pct, 2)
    treated_output = round(total_inflows - treatment_loss, 2)

    # Distribution
    production_from_cip = min(cip, treated_output * 0.40)
    remaining = treated_output - production_from_cip
    pet_lines = round(remaining * 0.28, 2)
    canline = round(remaining * 0.18, 2)
    syrup_room = round(remaining * 0.12, 2)
    total_production = round(production_from_cip + pet_lines + canline + syrup_room, 2)

    # Wastewater
    wastewater_val = round(treated_output * (0.18 + _rng.uniform(-0.02, 0.02)), 2)

    # Loss categories (like Barberton WSB)
    evaporation = round(total_inflows * _rng.uniform(0.02, 0.04), 2)
    seepage = round(total_inflows * _rng.uniform(0.01, 0.025), 2)
    accounted_output = total_production + wastewater_val + treatment_loss + evaporation + seepage
    unaccounted = round(max(0, total_inflows - accounted_output), 2)

    # Leak losses
    recent_cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    active_leaks = await db.leaks.find(
        {"active": True, "timestamp": {"$gte": recent_cutoff}}, {"_id": 0}
    ).to_list(50)
    leak_losses = round(sum(lk.get("estimated_loss", 0) for lk in active_leaks), 2)

    total_losses = round(treatment_loss + evaporation + seepage + unaccounted + leak_losses, 2)
    total_outflows = round(total_production + wastewater_val + total_losses, 2)

    # Change in storage & balance check (like Barberton doc)
    change_in_storage = round(total_inflows - total_outflows + total_recovery * 0.1, 2)
    balance_check = round(abs(change_in_storage) / max(total_inflows, 1) * 100, 1)

    # Efficiency
    water_use_ratio = round((total_production / total_inflows) * 100, 1) if total_inflows > 0 else 0
    recovery_rate = round((total_recovery / total_system) * 100, 1) if total_system > 0 else 0
    loss_rate = round((total_losses / total_inflows) * 100, 1) if total_inflows > 0 else 0

    # L/min to m3/d conversion factor: 1 L/min = 1.44 m3/d
    conv = 1.44

    # Facility-level balance (like Barberton Figures 4-9 to 4-11)
    facilities = [
        {"name": "Main Reservoir", "sensor": "LIT_MR",
         "inflows": [{"label": "Municipal Supply", "value": round(municipal, 1)}, {"label": "Rainfall/Runoff", "value": rainfall_runoff}, {"label": "Borehole", "value": borehole}],
         "outflows": [{"label": "To Treatment Plant", "value": round(treated_output, 1)}, {"label": "Evaporation", "value": round(evaporation * 0.3, 1)}, {"label": "Overflow/Spill", "value": round(_rng.uniform(0, 2), 1)}],
         "storage_change": round(_rng.uniform(-3, 5), 1)},
        {"name": "Treatment Plant", "sensor": "LIT_STW",
         "inflows": [{"label": "From Main Reservoir", "value": round(treated_output, 1)}, {"label": "Recovery Return", "value": round(total_recovery * 0.6, 1)}],
         "outflows": [{"label": "Treated Water", "value": round(treated_output * 0.92, 1)}, {"label": "Treatment Losses", "value": treatment_loss}, {"label": "Backwash", "value": round(backwash_flow * 0.5, 1)}],
         "storage_change": round(_rng.uniform(-2, 3), 1)},
        {"name": "Distribution System", "sensor": "LIT_TWT",
         "inflows": [{"label": "Treated Water", "value": round(treated_output * 0.92, 1)}],
         "outflows": [{"label": "CIP Lines", "value": round(production_from_cip, 1)}, {"label": "PET Lines", "value": pet_lines}, {"label": "Canline", "value": canline}, {"label": "Syrup Room", "value": syrup_room}, {"label": "Leakage", "value": leak_losses}],
         "storage_change": round(_rng.uniform(-1, 2), 1)},
        {"name": "Recovery System", "sensor": "LIT_BRT",
         "inflows": [{"label": "Nano Recovery 1", "value": round(nano_r1, 1)}, {"label": "Nano Recovery 2", "value": round(nano_r2, 1)}, {"label": "Backwash", "value": backwash_flow}],
         "outflows": [{"label": "Return to Treatment", "value": round(total_recovery * 0.6, 1)}, {"label": "Seepage", "value": round(seepage * 0.5, 1)}, {"label": "Evaporation", "value": round(evaporation * 0.2, 1)}],
         "storage_change": round(_rng.uniform(-1, 3), 1)},
        {"name": "WWTP", "sensor": "LIT_HT",
         "inflows": [{"label": "Process Wastewater", "value": round(wastewater_val, 1)}],
         "outflows": [{"label": "Treated Discharge", "value": round(wastewater_val * 0.85, 1)}, {"label": "Sludge", "value": round(wastewater_val * 0.1, 1)}, {"label": "Evaporation", "value": round(wastewater_val * 0.05, 1)}],
         "storage_change": round(_rng.uniform(-0.5, 1), 1)},
    ]

    # 24H time series for water balance chart
    now = datetime.now(timezone.utc)
    hourly_balance = []
    for h in range(24):
        ts = (now - timedelta(hours=23 - h)).isoformat()
        hour = (now - timedelta(hours=23 - h)).hour
        # Simulate diurnal pattern
        if 1 <= hour <= 5:
            demand_factor = 0.4 + _rng.uniform(-0.05, 0.05)
        elif 8 <= hour <= 17:
            demand_factor = 1.1 + _rng.uniform(-0.1, 0.1)
        else:
            demand_factor = 0.7 + _rng.uniform(-0.08, 0.08)
        h_inflow = round(municipal * demand_factor, 1)
        h_outflow = round(h_inflow * (0.85 + _rng.uniform(-0.05, 0.05)), 1)
        h_loss = round(h_inflow * _rng.uniform(0.05, 0.15), 1)
        h_recovery = round(total_recovery * demand_factor * 0.8, 1)
        hourly_balance.append({
            "timestamp": ts,
            "hour": f"{hour:02d}:00",
            "inflows": h_inflow,
            "outflows": h_outflow,
            "losses": h_loss,
            "recovery": h_recovery,
            "net": round(h_inflow - h_outflow - h_loss + h_recovery, 1),
        })

    # TDS/Salt balance at key points (like Barberton Section 5)
    quality_balance = [
        {"point": "Municipal Intake", "tds_mg_l": round(180 + _rng.uniform(-20, 20), 0), "flow_l_min": round(municipal, 1),
         "salt_load_kg_d": 0},
        {"point": "Post-RO Treatment", "tds_mg_l": round(80 + _rng.uniform(-10, 10), 0), "flow_l_min": round(treated_output * 0.5, 1),
         "salt_load_kg_d": 0},
        {"point": "Post-NACF", "tds_mg_l": round(120 + _rng.uniform(-15, 15), 0), "flow_l_min": round(treated_output * 0.3, 1),
         "salt_load_kg_d": 0},
        {"point": "Treated Water (Distribution)", "tds_mg_l": round(95 + _rng.uniform(-10, 10), 0), "flow_l_min": round(treated_output, 1),
         "salt_load_kg_d": 0},
        {"point": "Recovery Return", "tds_mg_l": round(350 + _rng.uniform(-40, 40), 0), "flow_l_min": round(total_recovery, 1),
         "salt_load_kg_d": 0},
        {"point": "WWTP Discharge", "tds_mg_l": round(600 + _rng.uniform(-60, 60), 0), "flow_l_min": round(wastewater_val, 1),
         "salt_load_kg_d": 0},
    ]
    # Calculate salt loads: kg/d = TDS(mg/L) * flow(L/min) * 1.44 / 1000
    for pt in quality_balance:
        pt["salt_load_kg_d"] = round(pt["tds_mg_l"] * pt["flow_l_min"] * conv / 1000, 2)

    return {
        "timestamp": now.isoformat(),
        "intake": {
            "municipal": {"flow_rate": round(municipal, 2), "unit": "L/min", "sensor": "FIT_10", "label": "Municipal Intake"},
            "rainfall_runoff": {"flow_rate": rainfall_runoff, "unit": "L/min", "label": "Rainfall/Runoff"},
            "borehole": {"flow_rate": borehole, "unit": "L/min", "label": "Borehole Supply"},
            "total": total_inflows,
            "total_m3d": round(total_inflows * conv, 1),
        },
        "treatment": {
            "treated_output": round(treated_output, 2),
            "treatment_loss": treatment_loss,
            "loss_pct": round(treatment_loss_pct * 100, 1),
        },
        "distribution": {
            "cip_lines": {"flow_rate": round(cip, 2), "unit": "L/min", "sensor": "FIT_CIP", "label": "CIP Lines"},
            "pet_lines": {"flow_rate": pet_lines, "unit": "L/min", "label": "PET Lines"},
            "canline": {"flow_rate": canline, "unit": "L/min", "label": "Canline"},
            "syrup_room": {"flow_rate": syrup_room, "unit": "L/min", "label": "Syrup Room"},
            "total": total_production,
        },
        "recovery": {
            "nano_recovery_1": {"flow_rate": round(nano_r1, 2), "unit": "L/min", "sensor": "FIT_6", "label": "Nano Recovery 1"},
            "nano_recovery_2": {"flow_rate": round(nano_r2, 2), "unit": "L/min", "sensor": "FIT_8", "label": "Nano Recovery 2"},
            "backwash": {"flow_rate": backwash_flow, "unit": "L/min", "sensor": "LIT_BRT", "label": "Backwash Recovery"},
            "total": total_recovery,
        },
        "wastewater": {"wwtp_output": round(wastewater_val, 2), "unit": "L/min"},
        "losses": {
            "treatment": treatment_loss,
            "evaporation": evaporation,
            "seepage": seepage,
            "leak_losses": leak_losses,
            "unaccounted": unaccounted,
            "total": total_losses,
        },
        "balance_summary": {
            "total_inflows": total_inflows,
            "total_inflows_m3d": round(total_inflows * conv, 1),
            "total_outflows": total_outflows,
            "total_outflows_m3d": round(total_outflows * conv, 1),
            "total_recovery": total_recovery,
            "change_in_storage": change_in_storage,
            "change_in_storage_m3d": round(change_in_storage * conv, 1),
            "balance_check_pct": balance_check,
        },
        "efficiency": {
            "water_use_ratio": water_use_ratio,
            "recovery_rate": recovery_rate,
            "loss_rate": loss_rate,
            "system_efficiency": round(100 - loss_rate, 1),
        },
        "total_system_water": total_system,
        "facilities": facilities,
        "hourly_balance": hourly_balance,
        "quality_balance": quality_balance,
        "flow_paths": [
            {"from": "Municipal Supply", "to": "Main Reservoir", "value": round(municipal, 1), "color": "#007AFF"},
            {"from": "Rainfall/Runoff", "to": "Main Reservoir", "value": rainfall_runoff, "color": "#32ADE6"},
            {"from": "Borehole", "to": "Main Reservoir", "value": borehole, "color": "#007AFF"},
            {"from": "Main Reservoir", "to": "Treatment Plant", "value": round(total_inflows, 1), "color": "#007AFF"},
            {"from": "Treatment Plant", "to": "Distribution", "value": round(treated_output, 1), "color": "#32ADE6"},
            {"from": "Distribution", "to": "CIP Lines", "value": round(production_from_cip, 1), "color": "#34C759"},
            {"from": "Distribution", "to": "PET Lines", "value": pet_lines, "color": "#34C759"},
            {"from": "Distribution", "to": "Canline", "value": canline, "color": "#34C759"},
            {"from": "Distribution", "to": "Syrup Room", "value": syrup_room, "color": "#34C759"},
            {"from": "Process", "to": "Nano Recovery 1", "value": round(nano_r1, 1), "color": "#AF52DE"},
            {"from": "Process", "to": "Nano Recovery 2", "value": round(nano_r2, 1), "color": "#AF52DE"},
            {"from": "Process", "to": "Backwash Recovery", "value": backwash_flow, "color": "#AF52DE"},
            {"from": "Recovery", "to": "Treatment Plant", "value": round(total_recovery, 1), "color": "#AF52DE"},
            {"from": "Treatment Plant", "to": "Losses", "value": treatment_loss, "color": "#FF3B30"},
            {"from": "Process", "to": "WWTP", "value": round(wastewater_val, 1), "color": "#FF9500"},
            {"from": "System", "to": "Evaporation", "value": evaporation, "color": "#FF9500"},
            {"from": "System", "to": "Seepage", "value": seepage, "color": "#FF3B30"},
        ],
    }


# ── Analytics: Non-Revenue Water (NRW) ──────────────────────

DMA_ZONES = [
    {"id": "DMA_01", "name": "Main Treatment", "pipe_km": 2.4, "age_years": 12, "material": "Steel"},
    {"id": "DMA_02", "name": "RO & Filtration", "pipe_km": 1.8, "age_years": 8, "material": "PVC"},
    {"id": "DMA_03", "name": "CIP Distribution", "pipe_km": 3.1, "age_years": 15, "material": "Steel"},
    {"id": "DMA_04", "name": "Production Lines", "pipe_km": 4.2, "age_years": 10, "material": "HDPE"},
    {"id": "DMA_05", "name": "Recovery Network", "pipe_km": 2.0, "age_years": 6, "material": "PVC"},
    {"id": "DMA_06", "name": "WWTP & Outflow", "pipe_km": 1.5, "age_years": 18, "material": "Cast Iron"},
]

PIPE_SEGMENTS = [
    {"id": "PS_01", "name": "Main Feed Header", "dma": "DMA_01", "length_m": 450, "diameter_mm": 200, "material": "Steel", "age_years": 12, "last_break": "2025-08-14"},
    {"id": "PS_02", "name": "RO Feed Pipe", "dma": "DMA_02", "length_m": 280, "diameter_mm": 150, "material": "PVC", "age_years": 8, "last_break": None},
    {"id": "PS_03", "name": "CIP Supply Main", "dma": "DMA_03", "length_m": 620, "diameter_mm": 100, "material": "Steel", "age_years": 15, "last_break": "2025-03-22"},
    {"id": "PS_04", "name": "PET Line Header", "dma": "DMA_04", "length_m": 350, "diameter_mm": 150, "material": "HDPE", "age_years": 10, "last_break": None},
    {"id": "PS_05", "name": "Canline Supply", "dma": "DMA_04", "length_m": 300, "diameter_mm": 100, "material": "HDPE", "age_years": 10, "last_break": "2024-11-05"},
    {"id": "PS_06", "name": "Syrup Room Feed", "dma": "DMA_04", "length_m": 180, "diameter_mm": 80, "material": "HDPE", "age_years": 10, "last_break": None},
    {"id": "PS_07", "name": "Nano Recovery Main", "dma": "DMA_05", "length_m": 400, "diameter_mm": 100, "material": "PVC", "age_years": 6, "last_break": None},
    {"id": "PS_08", "name": "Backwash Return", "dma": "DMA_05", "length_m": 250, "diameter_mm": 80, "material": "PVC", "age_years": 6, "last_break": None},
    {"id": "PS_09", "name": "WWTP Outfall", "dma": "DMA_06", "length_m": 380, "diameter_mm": 200, "material": "Cast Iron", "age_years": 18, "last_break": "2025-06-11"},
    {"id": "PS_10", "name": "Fire Line Branch", "dma": "DMA_01", "length_m": 520, "diameter_mm": 150, "material": "Steel", "age_years": 14, "last_break": "2025-01-19"},
]


@api_router.get("/analytics/nrw")
async def get_nrw_analytics():
    now = datetime.now(timezone.utc)

    # Water balance: input vs consumption vs losses (24h hourly)
    hourly_balance = []
    for h in range(24):
        hour = (now - timedelta(hours=23 - h)).replace(minute=0, second=0, microsecond=0)
        base_input = 150 + _rng.uniform(-20, 20)
        # Night hours (0-5) have lower consumption
        consumption_ratio = 0.35 if h < 6 else (0.85 + _rng.uniform(-0.05, 0.1))
        consumption = round(base_input * consumption_ratio, 1)
        losses = round(base_input - consumption + _rng.uniform(-2, 5), 1)
        hourly_balance.append({
            "hour": hour.strftime("%H:00"),
            "input": round(base_input, 1),
            "consumption": consumption,
            "losses": max(0, losses),
        })

    # DMA analysis
    dma_analysis = []
    for zone in DMA_ZONES:
        input_vol = round(_rng.uniform(80, 250), 1)
        loss_pct = _rng.uniform(3, 25) if zone["age_years"] > 10 else _rng.uniform(1, 12)
        dma_analysis.append({
            **zone,
            "input_volume": input_vol,
            "loss_pct": round(loss_pct, 1),
            "loss_volume": round(input_vol * loss_pct / 100, 1),
            "severity": "critical" if loss_pct > 18 else ("warning" if loss_pct > 10 else "normal"),
            "mnf_ratio": round(_rng.uniform(0.15, 0.55), 2),
        })

    # MNF (Minimum Night Flow) - 24h profile
    mnf_profile = []
    for h in range(24):
        hour_label = f"{h:02d}:00"
        # Night (1-4am) has minimum flow, day peaks at 10am and 2pm
        if 1 <= h <= 4:
            flow = 25 + _rng.uniform(-3, 3)
        elif 8 <= h <= 17:
            flow = 130 + _rng.uniform(-15, 25)
        else:
            flow = 65 + _rng.uniform(-10, 10)
        mnf_profile.append({"hour": hour_label, "flow": round(flow, 1)})

    mnf_baseline = min(p["flow"] for p in mnf_profile if p["hour"] in ["01:00", "02:00", "03:00", "04:00"])

    # Apparent vs Real losses
    total_loss = sum(d["loss_volume"] for d in dma_analysis)
    meter_inaccuracy = round(total_loss * _rng.uniform(0.15, 0.30), 1)
    unauthorized = round(total_loss * _rng.uniform(0.02, 0.08), 1)
    apparent_loss = round(meter_inaccuracy + unauthorized, 1)
    real_loss = round(total_loss - apparent_loss, 1)

    # Leak probability per pipe segment
    pipe_risk = []
    for seg in PIPE_SEGMENTS:
        age_factor = min(seg["age_years"] / 20, 1.0)
        material_factor = {"Cast Iron": 0.9, "Steel": 0.6, "PVC": 0.3, "HDPE": 0.2}[seg["material"]]
        break_factor = 0.3 if seg["last_break"] else 0.0
        prob = round(min(0.95, (age_factor * 0.4 + material_factor * 0.35 + break_factor + _rng.uniform(-0.05, 0.05))), 2)
        pipe_risk.append({
            **seg,
            "leak_probability": prob,
            "risk_level": "high" if prob > 0.6 else ("medium" if prob > 0.35 else "low"),
        })

    # Anomaly flags
    anomaly_flags = []
    for zone in dma_analysis:
        if zone["loss_pct"] > 15:
            anomaly_flags.append({
                "zone": zone["name"],
                "type": "high_loss",
                "message": f"Loss rate {zone['loss_pct']}% exceeds threshold",
                "severity": "critical" if zone["loss_pct"] > 20 else "warning",
            })
    if mnf_baseline > 35:
        anomaly_flags.append({
            "zone": "System",
            "type": "high_mnf",
            "message": f"MNF baseline {mnf_baseline:.1f} L/min suggests background leakage",
            "severity": "warning",
        })

    return {
        "timestamp": now.isoformat(),
        "hourly_balance": hourly_balance,
        "dma_analysis": dma_analysis,
        "mnf_profile": mnf_profile,
        "mnf_baseline": round(mnf_baseline, 1),
        "loss_separation": {
            "total_loss": round(total_loss, 1),
            "apparent": {"total": apparent_loss, "meter_inaccuracy": meter_inaccuracy, "unauthorized": unauthorized},
            "real": {"total": real_loss, "pipe_leaks": round(real_loss * 0.7, 1), "overflow": round(real_loss * 0.3, 1)},
        },
        "pipe_risk": pipe_risk,
        "anomaly_flags": anomaly_flags,
    }


# ── Analytics: Demand & Usage Intelligence ──────────────────

@api_router.get("/analytics/demand")
async def get_demand_analytics():
    now = datetime.now(timezone.utc)

    # Demand forecast (next 24h, hourly)
    forecast = []
    for h in range(24):
        hour = (now + timedelta(hours=h)).replace(minute=0, second=0, microsecond=0)
        # Base pattern: low at night, high during production
        if 1 <= hour.hour <= 5:
            base = 40 + _rng.uniform(-5, 5)
        elif 8 <= hour.hour <= 17:
            base = 145 + _rng.uniform(-15, 20)
        else:
            base = 75 + _rng.uniform(-10, 10)
        forecast.append({
            "hour": hour.strftime("%H:00"),
            "actual": round(base + _rng.uniform(-8, 8), 1),
            "predicted": round(base, 1),
            "lower_bound": round(base * 0.85, 1),
            "upper_bound": round(base * 1.15, 1),
        })

    # Peak demand heatmap (7 days x 24 hours)
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    heatmap = []
    for d_idx, day in enumerate(days):
        for h in range(24):
            if 1 <= h <= 5:
                val = 30 + _rng.uniform(-5, 10)
            elif 8 <= h <= 17:
                val = 140 + _rng.uniform(-20, 25) if d_idx < 5 else 80 + _rng.uniform(-10, 15)
            else:
                val = 65 + _rng.uniform(-10, 15)
            heatmap.append({"day": day, "hour": h, "value": round(val, 1)})

    # Consumer segmentation (production lines)
    total_demand = sum(f["actual"] for f in forecast) / len(forecast)
    segments = [
        {"name": "CIP Lines", "type": "industrial", "share_pct": round(38 + _rng.uniform(-3, 3), 1), "avg_flow": round(total_demand * 0.38, 1)},
        {"name": "PET Lines", "type": "industrial", "share_pct": round(28 + _rng.uniform(-2, 2), 1), "avg_flow": round(total_demand * 0.28, 1)},
        {"name": "Canline", "type": "industrial", "share_pct": round(18 + _rng.uniform(-2, 2), 1), "avg_flow": round(total_demand * 0.18, 1)},
        {"name": "Syrup Room", "type": "industrial", "share_pct": round(10 + _rng.uniform(-1, 1), 1), "avg_flow": round(total_demand * 0.10, 1)},
        {"name": "Utilities & Other", "type": "commercial", "share_pct": round(6 + _rng.uniform(-1, 1), 1), "avg_flow": round(total_demand * 0.06, 1)},
    ]

    # Seasonal trend (12 months)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    seasonal = []
    for i, month in enumerate(months):
        # Summer (Dec-Feb in SA) higher demand
        summer_factor = 1.2 if i in [0, 1, 11] else (0.9 if i in [5, 6, 7] else 1.0)
        seasonal.append({
            "month": month,
            "avg_demand": round(120 * summer_factor + _rng.uniform(-10, 10), 1),
            "peak_demand": round(180 * summer_factor + _rng.uniform(-15, 15), 1),
            "temperature": round(25 * summer_factor + _rng.uniform(-3, 3), 1),
        })

    return {
        "timestamp": now.isoformat(),
        "forecast": forecast,
        "heatmap": heatmap,
        "segments": segments,
        "seasonal_trend": seasonal,
        "summary": {
            "current_demand": round(total_demand, 1),
            "predicted_peak": round(max(f["predicted"] for f in forecast), 1),
            "avg_daily": round(sum(f["predicted"] for f in forecast) / len(forecast), 1),
        },
    }


# ── Analytics: Asset Health & Predictive Maintenance ────────

@api_router.get("/analytics/asset-health")
async def get_asset_health():
    now = datetime.now(timezone.utc)

    assets = []
    for seg in PIPE_SEGMENTS:
        age_score = max(0, 100 - seg["age_years"] * 4)
        material_bonus = {"HDPE": 15, "PVC": 10, "Steel": -5, "Cast Iron": -15}[seg["material"]]
        pressure_penalty = round(_rng.uniform(0, 15), 1)
        condition_score = round(min(100, max(0, age_score + material_bonus - pressure_penalty + _rng.uniform(-5, 5))), 1)

        # RUL estimation
        base_life = {"HDPE": 50, "PVC": 40, "Steel": 30, "Cast Iron": 25}[seg["material"]]
        rul_years = round(max(0, base_life - seg["age_years"] + _rng.uniform(-3, 3)), 1)

        # Failure probability
        fail_prob = round(min(0.95, max(0.01, (1 - condition_score / 100) * 0.8 + _rng.uniform(-0.05, 0.05))), 2)

        assets.append({
            **seg,
            "condition_score": condition_score,
            "condition_grade": "A" if condition_score >= 80 else ("B" if condition_score >= 60 else ("C" if condition_score >= 40 else "D")),
            "rul_years": rul_years,
            "failure_probability": fail_prob,
            "risk_level": "high" if fail_prob > 0.5 else ("medium" if fail_prob > 0.25 else "low"),
            "pressure_variability": round(_rng.uniform(0.1, 0.8), 2),
            "last_inspection": (now - timedelta(days=_rng.randint(30, 365))).strftime("%Y-%m-%d"),
        })

    # Break history (last 12 months)
    break_history = []
    for m in range(12):
        month_date = now - timedelta(days=30 * (11 - m))
        count = _rng.choices([0, 1, 2, 3], weights=[0.4, 0.35, 0.2, 0.05])[0]
        break_history.append({
            "month": month_date.strftime("%b %Y"),
            "breaks": count,
            "cost_estimate": round(count * _rng.uniform(5000, 25000), 0) if count > 0 else 0,
        })

    # Maintenance schedule
    maintenance = []
    for asset in sorted(assets, key=lambda a: a["failure_probability"], reverse=True)[:5]:
        days_until = _rng.randint(7, 90)
        maintenance.append({
            "asset_id": asset["id"],
            "asset_name": asset["name"],
            "type": "preventive" if asset["failure_probability"] < 0.5 else "urgent",
            "scheduled_date": (now + timedelta(days=days_until)).strftime("%Y-%m-%d"),
            "priority": "high" if asset["failure_probability"] > 0.5 else "medium",
            "estimated_cost": round(_rng.uniform(3000, 50000), 0),
        })

    avg_score = round(sum(a["condition_score"] for a in assets) / len(assets), 1)
    high_risk_count = sum(1 for a in assets if a["risk_level"] == "high")

    return {
        "timestamp": now.isoformat(),
        "assets": assets,
        "break_history": break_history,
        "maintenance_schedule": maintenance,
        "summary": {
            "total_assets": len(assets),
            "avg_condition_score": avg_score,
            "high_risk_count": high_risk_count,
            "total_pipe_length_m": sum(a["length_m"] for a in assets),
            "avg_rul_years": round(sum(a["rul_years"] for a in assets) / len(assets), 1),
            "total_breaks_12m": sum(b["breaks"] for b in break_history),
        },
    }


# ── Analytics: Water Quality Intelligence ───────────────────

QUALITY_ZONES = [
    {"id": "QZ_01", "name": "Pre-Treatment", "sensors": ["pH_RO"]},
    {"id": "QZ_02", "name": "Post-RO", "sensors": ["EC_RO"]},
    {"id": "QZ_03", "name": "Chlorination", "sensors": ["CL_001", "pH_NACF"]},
    {"id": "QZ_04", "name": "Nano Filtration", "sensors": ["EC_NANO"]},
    {"id": "QZ_05", "name": "Distribution", "sensors": ["CL_001", "EC_RO"]},
]


@api_router.get("/analytics/water-quality")
async def get_water_quality():
    now = datetime.now(timezone.utc)

    # Live quality metrics
    quality_params = []
    for pid, spec in [
        ("pH", {"name": "pH Level", "unit": "pH", "value": 7.2, "variance": 0.3, "low": 6.5, "high": 8.5}),
        ("chlorine", {"name": "Free Chlorine", "unit": "mg/L", "value": 0.8, "variance": 0.15, "low": 0.5, "high": 1.2}),
        ("conductivity", {"name": "Conductivity", "unit": "uS/cm", "value": 420, "variance": 50, "low": 200, "high": 800}),
        ("turbidity", {"name": "Turbidity", "unit": "NTU", "value": 0.4, "variance": 0.2, "low": 0, "high": 1.0}),
    ]:
        val = round(spec["value"] + _rng.uniform(-spec["variance"], spec["variance"]), 2)
        in_spec = spec["low"] <= val <= spec["high"]
        quality_params.append({
            "id": pid,
            "name": spec["name"],
            "unit": spec["unit"],
            "value": val,
            "low_limit": spec["low"],
            "high_limit": spec["high"],
            "in_spec": in_spec,
            "status": "normal" if in_spec else "alarm",
        })

    # Chlorine decay model (decay over distance from dosing point)
    decay_curve = []
    cl_initial = 1.0 + _rng.uniform(-0.1, 0.1)
    decay_rate = 0.12 + _rng.uniform(-0.02, 0.02)
    for dist in range(0, 2100, 200):
        import math
        cl_level = cl_initial * math.exp(-decay_rate * dist / 1000)
        decay_curve.append({
            "distance_m": dist,
            "chlorine_mg_l": round(cl_level, 3),
            "min_required": 0.2,
        })

    # Spatial quality map (per zone)
    spatial_quality = []
    for zone in QUALITY_ZONES:
        ph_val = round(7.0 + _rng.uniform(-0.5, 0.5), 2)
        cl_val = round(0.8 + _rng.uniform(-0.3, 0.3), 2)
        ec_val = round(400 + _rng.uniform(-100, 100), 0)
        ph_ok = 6.5 <= ph_val <= 8.5
        cl_ok = 0.5 <= cl_val <= 1.2
        ec_ok = 200 <= ec_val <= 800
        all_ok = ph_ok and cl_ok and ec_ok
        spatial_quality.append({
            **zone,
            "ph": ph_val,
            "chlorine": cl_val,
            "conductivity": ec_val,
            "status": "compliant" if all_ok else "non-compliant",
            "parameters_ok": sum([ph_ok, cl_ok, ec_ok]),
            "parameters_total": 3,
        })

    # Contamination events log
    events = []
    event_types = ["pH spike", "Chlorine drop", "Conductivity anomaly", "Turbidity spike"]
    for i in range(6):
        hours_ago = _rng.randint(1, 168)
        evt_type = _rng.choice(event_types)
        severity = _rng.choices(["critical", "warning", "info"], weights=[0.15, 0.45, 0.4])[0]
        source_zone = _rng.choice(QUALITY_ZONES)
        events.append({
            "id": f"CE_{i+1:03d}",
            "type": evt_type,
            "severity": severity,
            "zone": source_zone["name"],
            "timestamp": (now - timedelta(hours=hours_ago)).isoformat(),
            "source_trace": f"Likely originated at {source_zone['name']} ({source_zone['id']})",
            "resolved": hours_ago > 24,
            "duration_hours": round(_rng.uniform(0.5, 12), 1),
        })
    events.sort(key=lambda e: e["timestamp"], reverse=True)

    # Quality degradation predictions
    predictions = []
    for param in quality_params:
        trend = _rng.choice(["stable", "degrading", "improving"])
        hours_to_breach = None
        if trend == "degrading":
            hours_to_breach = round(_rng.uniform(12, 72), 0)
        predictions.append({
            "parameter": param["name"],
            "current_value": param["value"],
            "trend": trend,
            "hours_to_breach": hours_to_breach,
            "confidence": round(_rng.uniform(0.7, 0.95), 2),
        })

    compliant_zones = sum(1 for z in spatial_quality if z["status"] == "compliant")
    all_params_ok = all(p["in_spec"] for p in quality_params)

    return {
        "timestamp": now.isoformat(),
        "quality_parameters": quality_params,
        "decay_curve": decay_curve,
        "spatial_quality": spatial_quality,
        "contamination_events": events,
        "predictions": predictions,
        "summary": {
            "overall_status": "compliant" if all_params_ok else "non-compliant",
            "compliant_zones": compliant_zones,
            "total_zones": len(spatial_quality),
            "active_events": sum(1 for e in events if not e["resolved"]),
            "parameters_in_spec": sum(1 for p in quality_params if p["in_spec"]),
            "total_parameters": len(quality_params),
        },
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()