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
    {"id": "FIT_10", "name": "Main Feed Flow", "type": "flow", "unit": "L/min", "baseline": 150.0, "variance": 15.0},
    {"id": "FIT_8", "name": "Nano Recovery Tank Flow", "type": "flow", "unit": "L/min", "baseline": 85.0, "variance": 8.0},
    {"id": "FIT_6", "name": "Recovery Line Flow", "type": "flow", "unit": "L/min", "baseline": 120.0, "variance": 12.0},
    {"id": "PIT_M1", "name": "Main Tank Pressure", "type": "pressure", "unit": "bar", "baseline": 3.2, "variance": 0.3},
    {"id": "PIT_M2", "name": "Feed Tank Pressure", "type": "pressure", "unit": "bar", "baseline": 2.8, "variance": 0.25},
    {"id": "PIT_M3", "name": "RO System Pressure", "type": "pressure", "unit": "bar", "baseline": 4.5, "variance": 0.4},
    {"id": "pH_001", "name": "RO Water pH", "type": "ph", "unit": "pH", "baseline": 7.2, "variance": 0.3},
    {"id": "CL_001", "name": "Free Chlorine", "type": "chlorine", "unit": "mg/L", "baseline": 0.8, "variance": 0.15},
    {"id": "EC_001", "name": "Water Conductivity", "type": "conductivity", "unit": "µS/cm", "baseline": 450.0, "variance": 50.0},
    {"id": "LIT_001", "name": "Main Reservoir Level", "type": "level", "unit": "m³", "baseline": 450.0, "variance": 30.0},
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
async def get_sensor_analytics(instrument_id: str, time_range: str = "all"):
    instrument = next((i for i in instruments if i["id"] == instrument_id), None)
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")

    time_filter = {"instrument_id": instrument_id}
    if time_range in RANGE_MAP:
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