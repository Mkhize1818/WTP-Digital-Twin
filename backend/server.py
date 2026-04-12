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
import random
from emergentintegrations.llm.chat import LlmChat, UserMessage

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

async def generate_sensor_reading(instrument):
    value = instrument["baseline"] + random.uniform(-instrument["variance"], instrument["variance"])
    
    status = "online"
    if random.random() < 0.05:
        status = "warning" if random.random() < 0.7 else "offline"
    
    reading = SensorReading(
        instrument_id=instrument["id"],
        instrument_name=instrument["name"],
        type=instrument["type"],
        value=round(value, 2),
        unit=instrument["unit"],
        status=status
    )
    
    doc = reading.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.sensor_readings.insert_one(doc)
    
    if instrument["type"] == "ph" and (value < 6.5 or value > 8.5):
        alert = Alert(
            type="compliance",
            severity="critical",
            message=f"pH out of spec: {value:.2f} (acceptable range: 6.5-8.5)",
            instrument_id=instrument["id"],
            instrument_name=instrument["name"]
        )
        alert_doc = alert.model_dump()
        alert_doc['timestamp'] = alert_doc['timestamp'].isoformat()
        await db.alerts.insert_one(alert_doc)
    
    if instrument["type"] == "chlorine" and (value < 0.5 or value > 1.2):
        alert = Alert(
            type="compliance",
            severity="warning",
            message=f"Chlorine out of spec: {value:.2f} mg/L (acceptable range: 0.5-1.2 mg/L)",
            instrument_id=instrument["id"],
            instrument_name=instrument["name"]
        )
        alert_doc = alert.model_dump()
        alert_doc['timestamp'] = alert_doc['timestamp'].isoformat()
        await db.alerts.insert_one(alert_doc)
    
    if status == "offline":
        alert = Alert(
            type="offline",
            severity="critical",
            message=f"Sensor {instrument['name']} is offline",
            instrument_id=instrument["id"],
            instrument_name=instrument["name"]
        )
        alert_doc = alert.model_dump()
        alert_doc['timestamp'] = alert_doc['timestamp'].isoformat()
        await db.alerts.insert_one(alert_doc)
    
    if random.random() < 0.02:
        anomaly = Anomaly(
            instrument_id=instrument["id"],
            instrument_name=instrument["name"],
            anomaly_type="spike" if random.random() < 0.5 else "drift",
            confidence=round(random.uniform(0.7, 0.95), 2),
            description=f"Unusual pattern detected in {instrument['name']}"
        )
        anomaly_doc = anomaly.model_dump()
        anomaly_doc['timestamp'] = anomaly_doc['timestamp'].isoformat()
        await db.anomalies.insert_one(anomaly_doc)
    
    return reading

async def sensor_simulation_loop():
    while True:
        try:
            for instrument in instruments:
                await generate_sensor_reading(instrument)
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
            if isinstance(reading['timestamp'], str):
                reading['timestamp'] = datetime.fromisoformat(reading['timestamp'])
            latest_readings.append(reading)
    return latest_readings

@api_router.get("/sensors/{instrument_id}/history", response_model=List[SensorReading])
async def get_sensor_history(instrument_id: str, limit: int = 50):
    readings = await db.sensor_readings.find(
        {"instrument_id": instrument_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for reading in readings:
        if isinstance(reading['timestamp'], str):
            reading['timestamp'] = datetime.fromisoformat(reading['timestamp'])
    
    return readings

@api_router.get("/sensors/{instrument_id}/analytics")
async def get_sensor_analytics(instrument_id: str):
    instrument = next((i for i in instruments if i["id"] == instrument_id), None)
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")

    readings = await db.sensor_readings.find(
        {"instrument_id": instrument_id},
        {"_id": 0}
    ).sort("timestamp", 1).limit(200).to_list(200)

    for r in readings:
        if isinstance(r['timestamp'], str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])

    values = [r["value"] for r in readings]
    timestamps = [r["timestamp"].isoformat() if isinstance(r["timestamp"], datetime) else r["timestamp"] for r in readings]

    # Rolling averages (window of 5 and 10)
    def rolling_avg(vals, window):
        result = []
        for i in range(len(vals)):
            start = max(0, i - window + 1)
            result.append(round(sum(vals[start:i+1]) / (i - start + 1), 2))
        return result

    ra5 = rolling_avg(values, 5)
    ra10 = rolling_avg(values, 10)

    # Stats
    stats = {}
    if values:
        stats["current"] = values[-1]
        stats["min"] = round(min(values), 2)
        stats["max"] = round(max(values), 2)
        stats["mean"] = round(sum(values) / len(values), 2)
        stats["std_dev"] = round((sum((v - stats["mean"]) ** 2 for v in values) / len(values)) ** 0.5, 2)
        stats["data_points"] = len(values)

    # Compliance thresholds
    thresholds = {}
    if instrument["type"] == "ph":
        thresholds = {"low": 6.5, "high": 8.5, "label": "pH Compliance Range"}
    elif instrument["type"] == "chlorine":
        thresholds = {"low": 0.5, "high": 1.2, "label": "Chlorine Compliance Range"}
    elif instrument["type"] == "pressure":
        thresholds = {"low": instrument["baseline"] - instrument["variance"] * 2, "high": instrument["baseline"] + instrument["variance"] * 2, "label": "Normal Operating Range"}
    elif instrument["type"] == "flow":
        thresholds = {"low": instrument["baseline"] - instrument["variance"] * 2, "high": instrument["baseline"] + instrument["variance"] * 2, "label": "Normal Operating Range"}

    # Recent alerts for this instrument
    recent_alerts = await db.alerts.find(
        {"instrument_id": instrument_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    for a in recent_alerts:
        if isinstance(a['timestamp'], str):
            a['timestamp'] = datetime.fromisoformat(a['timestamp'])
        a['timestamp'] = a['timestamp'].isoformat() if isinstance(a['timestamp'], datetime) else a['timestamp']

    # Recent anomalies
    recent_anomalies = await db.anomalies.find(
        {"instrument_id": instrument_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    for an in recent_anomalies:
        if isinstance(an['timestamp'], str):
            an['timestamp'] = datetime.fromisoformat(an['timestamp'])
        an['timestamp'] = an['timestamp'].isoformat() if isinstance(an['timestamp'], datetime) else an['timestamp']

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
            "rolling_avg_5": ra5,
            "rolling_avg_10": ra10,
        },
        "stats": stats,
        "thresholds": thresholds,
        "recent_alerts": recent_alerts,
        "recent_anomalies": recent_anomalies,
    }

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(acknowledged: Optional[bool] = None, limit: int = 100):
    query = {}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for alert in alerts:
        if isinstance(alert['timestamp'], str):
            alert['timestamp'] = datetime.fromisoformat(alert['timestamp'])
    
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
        if isinstance(anomaly['timestamp'], str):
            anomaly['timestamp'] = datetime.fromisoformat(anomaly['timestamp'])
    
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
        if isinstance(msg['timestamp'], str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

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