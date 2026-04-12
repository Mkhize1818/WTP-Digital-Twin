# Digital Twin - Water Reticulation System (Coke MVP)

## Original Problem Statement
Build a digital twin demo/MVP for Coke's water reticulation system with live dashboards, instrumentation status, compliance alerts, leak/anomaly detection, and an Agentic AI query layer.

## Architecture
- **Backend**: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- **Frontend**: React + Tailwind + Recharts + Phosphor Icons + Shadcn UI
- **Database**: MongoDB (sensor_readings, alerts, anomalies, chat_messages)
- **Data**: Simulated live sensor data (10 instruments, 5-second intervals)

## User Personas
- **Coke Operations Engineer**: Monitors water reticulation system in real-time
- **Quality Manager**: Checks compliance alerts and water quality parameters
- **Management**: Reviews analytics and AI-powered insights

## Core Requirements
1. Live digital twin with PFD visualization
2. Flow meters, pressure indicators, water quality probes (pH, conductivity, chlorine)
3. Live dashboards with auto-refresh
4. Instrumentation status (online/offline/warning)
5. Compliance alerts (pH 6.5-8.5, chlorine 0.5-1.2 mg/L)
6. Leak detection and anomaly detection
7. Interactive AI agent (Claude Sonnet 4.5)

## What's Been Implemented (2026-04-12)
- [x] Backend sensor simulation engine (10 instruments)
- [x] Dark control room dashboard with Talbot branding
- [x] 4 summary metric cards (flow, pressure, alerts, sensors)
- [x] Interactive PFD diagram with clickable sensor overlays
- [x] **Sensor Analytics drill-down** - click any sensor for:
  - Time series chart with rolling averages (5 & 10 window)
  - Stat cards (Current, Mean, Min, Max, Std Dev)
  - Trend envelope area chart
  - Compliance threshold reference lines
  - Recent events (alerts + anomalies)
- [x] Instrumentation grid (clickable sensor cards)
- [x] Anomaly detection panel
- [x] Active alerts feed with acknowledge
- [x] AI Agent panel (Claude Sonnet 4.5)
- [x] Auto-refresh (dashboard: 5s, analytics: 10s)

## Prioritized Backlog
### P0 (Done)
- All core features implemented and tested

### P1 (Next Phase)
- Historical data export (CSV/PDF reports)
- Date range selector for analytics
- Leak detection visualization on PFD
- More detailed anomaly classification

### P2 (Future)
- User authentication and role-based access
- Email/SMS alert notifications
- Predictive maintenance using ML
- Integration with real SCADA/PLC data sources
- Multi-site support
