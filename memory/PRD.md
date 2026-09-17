# Digital Twin - Water Reticulation System (Coke MVP)

## Architecture
- Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React + Tailwind + Recharts + Phosphor Icons + shadcn + jsPDF
- Database: MongoDB (sensor_readings, alerts, anomalies, chat_messages, leaks)
- 27 simulated instruments, 5-second intervals
- Standalone demo: `/app/standalone_demo.html` (self-contained HTML)

## Brand Identity (Talbot) — LIGHT THEME
| Token | Value | Usage |
|-------|-------|-------|
| RAL 5015 | #1171b8 | Primary brand, active buttons, accents |
| Deep Teal Blue | #163F56 | Body text, labels, section headers |
| Royal Navy Blue | #062C60 | Headings, metric values, primary text |
| Background | #E8F0F8 | Page background + water visual |
| Surface | #FFFFFF | Cards, panels |
| Surface Alt | #F4F8FC | Chart areas, secondary panels |
| Font | Aktiv Grotesk / Chivo / JetBrains Mono |

## 8 Dashboard Tabs
1. Process Flow (3D Isometric PFD — light bg)
2. Plant Overview (3D Canvas plant schematic)
3. Water Balance (Barberton WSB-style)
4. NRW Analytics
5. Demand Intelligence
6. Asset Health
7. Water Quality Intelligence
8. **Geo Quality (NEW)** — Environmental impact by zone

## What's Implemented
- [x] Light theme with water visual backdrop, CCBA logo removed
- [x] 3D Isometric PFD on light gradient background
- [x] Plant Overview (Canvas 2D isometric 3D, ~46 equipment)
- [x] Date range filter on all analytics tabs
- [x] Enhanced Water Balance (Sankey labels visible dark navy)
- [x] NRW Analytics, Demand, Asset Health, Water Quality
- [x] **Geo Quality tab (NEW)**: 8 geo zones, spatial SVG map, env scores, 24H WWTP discharge trends, zone-by-zone expandable analysis with 8 parameters
- [x] Sensor analytics drill-down, CSV/PDF export
- [x] Leak detection, AI Agent (Claude Sonnet 4.5)
- [x] Standalone demo (1:1 replica, light theme, all visibility fixes)

## Key API Endpoints
- GET /api/stats, /api/sensors/latest, /api/sensors/{id}/analytics
- GET /api/alerts, /api/anomalies, /api/leaks/zones
- GET /api/reports/compliance, /api/water-balance
- GET /api/analytics/nrw, /api/analytics/demand
- GET /api/analytics/asset-health, /api/analytics/water-quality
- GET /api/analytics/geo-quality (NEW)
- POST /api/ai/query

## Prioritized Backlog
### P1
- Connect to real data sources/APIs
- Scheduled compliance email reports
- Backend date filtering for analytics
### P2
- Email/SMS alerts, Multi-site support, Auth, Predictive ML, SCADA/PLC
