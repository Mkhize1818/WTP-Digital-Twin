# Digital Twin - Water Reticulation System (Coke MVP)

## Original Problem Statement
Build a digital twin demo/MVP for Coke's water reticulation system with live dashboards, instrumentation status, compliance alerts, leak/anomaly detection, and an Agentic AI query layer.

## Architecture
- **Backend**: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- **Frontend**: React + Tailwind + Recharts + Phosphor Icons + Shadcn UI + jsPDF
- **Database**: MongoDB (sensor_readings, alerts, anomalies, chat_messages, leaks)
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
- [x] Sensor Analytics drill-down (time series, rolling averages, stats, trends)
- [x] **Leak Detection on PFD** - animated leak indicators at 6 pipe zones
- [x] **CSV/PDF Compliance Export** - dashboard-level and per-sensor exports
- [x] **Date Range Selector** - 1H/6H/24H/7D/ALL for analytics
- [x] Instrumentation grid (clickable sensor cards)
- [x] Anomaly detection panel
- [x] Active alerts feed with acknowledge
- [x] AI Agent panel (Claude Sonnet 4.5)
- [x] Auto-refresh (dashboard: 5s, analytics: 10s)

## Prioritized Backlog
### P1 (Next Phase)
- Historical data export with custom date ranges (calendar picker)
- Email/SMS alert notification system
- Multi-site support for different Coke facilities

### P2 (Future)
- User authentication and role-based access
- Predictive maintenance using ML
- Integration with real SCADA/PLC data sources
- Scheduled automated compliance reports
