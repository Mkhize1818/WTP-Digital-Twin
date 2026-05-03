# Digital Twin - Water Reticulation System (Coke MVP)

## Architecture
- Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React + Tailwind + Recharts + Phosphor Icons + shadcn + jsPDF
- Database: MongoDB (sensor_readings, alerts, anomalies, chat_messages, leaks)
- 27 simulated instruments, 5-second intervals
- Standalone demo: `/app/standalone_demo.html` (self-contained HTML)

## Brand Identity (Talbot)
| Color | Hex | Usage |
|-------|-----|-------|
| RAL 5015 | #1171b8 | Primary brand, active buttons, accents |
| Deep Teal Blue | #163F56 | Cards, panels, elevated surfaces |
| Royal Navy Blue | #062C60 | Page backgrounds, header |
| Pastel Sky Blue | #C9E0EF | Secondary text, labels, borders |
| Font: Aktiv Grotesk | Regular + Light | Body text |
| Font: Chivo | Bold/Black | Headings, metric values |
| Font: JetBrains Mono | | Code, sensor IDs, mono values |

## 7 Dashboard Tabs
1. Process Flow (3D Isometric PFD)
2. Plant Overview (3D Canvas plant schematic)
3. Water Balance (Barberton WSB-style)
4. NRW Analytics
5. Demand Intelligence
6. Asset Health
7. Water Quality Intelligence

## What's Implemented
- [x] Talbot brand colors applied across all components + standalone demo
- [x] Header: Talbot logo left | Digital Twin centered | CCBA logo right
- [x] 27 instruments with interactive 3D isometric PFD
- [x] Plant Overview (Canvas 2D isometric 3D, ~46 equipment, orbit/zoom/views)
- [x] Date range filter on all analytics tabs
- [x] Enhanced Water Balance (Sankey, facility table, loss analysis, 24H trend, TDS/salt)
- [x] NRW Analytics, Demand Intelligence, Asset Health, Water Quality Intelligence
- [x] Sensor analytics drill-down with time series + rolling averages
- [x] CSV/PDF compliance export
- [x] Leak detection (6 zones)
- [x] AI Agent (Claude Sonnet 4.5)
- [x] Standalone demo HTML (all features, offline-capable)

## Prioritized Backlog
### P1
- Connect to real data sources/APIs (currently simulated)
- Scheduled compliance email reports (daily/weekly PDF)
- Backend date filtering for analytics endpoints
### P2
- Email/SMS alert notifications
- Multi-site support for different Coke facilities
- User auth & role-based access
- Predictive maintenance ML models
- SCADA/PLC data source integration
