# Digital Twin - Water Reticulation System (Coke MVP)

## Architecture
- Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React + Tailwind + Recharts + Phosphor Icons + shadcn + jsPDF
- Database: MongoDB (sensor_readings, alerts, anomalies, chat_messages, leaks)
- 27 simulated instruments, 5-second intervals
- Standalone demo: `/app/standalone_demo.html` (self-contained HTML)

## Brand Identity (Talbot) — LIGHT THEME
| Color | Hex | Usage |
|-------|-----|-------|
| RAL 5015 | #1171b8 | Primary brand, active buttons, accents |
| Deep Teal Blue | #163F56 | Body text, labels, section headers |
| Royal Navy Blue | #062C60 | Headings, metric values, primary text |
| Pastel Sky Blue | #C9E0EF | PFD scene accents (NOT for text on light bg) |
| Light Background | #E8F0F8 | Page background (+ water visual) |
| White Surface | #FFFFFF | Cards, panels |
| Off-White Surface | #F4F8FC | Chart areas, secondary panels |
| Font: Aktiv Grotesk | Regular + Light | Body text |
| Font: Chivo | Bold/Black | Headings, metric values |
| Font: JetBrains Mono | | Code, sensor IDs, mono values |

## 7 Dashboard Tabs
1. Process Flow (3D Isometric PFD — dark scene for contrast)
2. Plant Overview (3D Canvas plant — dark scene for contrast)
3. Water Balance (Barberton WSB-style)
4. NRW Analytics
5. Demand Intelligence
6. Asset Health
7. Water Quality Intelligence

## What's Implemented
- [x] Light theme with water visual backdrop
- [x] Talbot-only branding (CCBA logo removed)
- [x] Header: Talbot logo + Live badge | Digital Twin centered
- [x] 27 instruments with interactive 3D isometric PFD
- [x] Plant Overview (Canvas 2D isometric 3D, ~46 equipment)
- [x] Date range filter on all analytics tabs
- [x] Enhanced Water Balance (Sankey, facility table, loss analysis, 24H trend, TDS/salt)
- [x] NRW Analytics, Demand Intelligence, Asset Health, Water Quality Intelligence
- [x] Sensor analytics drill-down with time series + rolling averages
- [x] CSV/PDF compliance export
- [x] Leak detection (6 zones)
- [x] AI Agent (Claude Sonnet 4.5)
- [x] MongoDB indexes on sensor_readings for performance
- [x] Standalone demo HTML (all features, light theme, offline-capable)

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
