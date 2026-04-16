import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Crosshair, Drop, Scales, ChartLine, Heartbeat, Flask } from "@phosphor-icons/react";
import axios from "axios";
import WaterBalance from "./WaterBalance";
import NRWAnalytics from "./analytics/NRWAnalytics";
import DemandIntelligence from "./analytics/DemandIntelligence";
import AssetHealth from "./analytics/AssetHealth";
import WaterQualityIntelligence from "./analytics/WaterQualityIntelligence";
import PFDIsometric from "./PFDIsometric";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_COLORS = {
  online: "#34C759",
  warning: "#FF9500",
  offline: "#FF3B30",
};

/*
 * Positions mapped from the actual PFD image analysis.
 * Each tag is placed directly on its corresponding equipment.
 */
const INSTRUMENT_POSITIONS = [
  // Flow Indicators (FIT)
  { id: "FIT_10", x: "15%", y: "37%", label: "FIT 10" },
  { id: "FIT_FL", x: "38%", y: "17%", label: "FIT" },
  { id: "FIT_8", x: "47%", y: "68%", label: "FIT 8" },
  { id: "FIT_6", x: "30%", y: "72%", label: "FIT 6" },
  { id: "FIT_CIP", x: "83%", y: "37%", label: "FIT" },
  // Level Indicators (LIT) — placed on tanks
  { id: "LIT_MR", x: "8%", y: "8%", label: "LIT" },
  { id: "LIT_RT4", x: "50%", y: "8%", label: "LIT" },
  { id: "LIT_RR2", x: "22%", y: "24%", label: "LIT" },
  { id: "LIT_STW", x: "38%", y: "30%", label: "LIT" },
  { id: "LIT_TWT", x: "58%", y: "27%", label: "LIT" },
  { id: "LIT_HT", x: "24%", y: "38%", label: "LIT" },
  { id: "LIT_BRT", x: "8%", y: "35%", label: "LIT" },
  { id: "LIT_ST", x: "43%", y: "62%", label: "LIT" },
  { id: "LIT_NR2", x: "55%", y: "68%", label: "LIT" },
  { id: "LIT_NR1", x: "40%", y: "74%", label: "LIT" },
  // Pressure Indicators (PIT)
  { id: "PIT_RACF1", x: "38%", y: "38%", label: "PIT" },
  { id: "PIT_RACF2", x: "43%", y: "38%", label: "PIT" },
  { id: "PIT_RACF3", x: "48%", y: "38%", label: "PIT" },
  { id: "PIT_NACF1", x: "18%", y: "55%", label: "PIT" },
  { id: "PIT_NACF2", x: "25%", y: "55%", label: "PIT" },
  // Water Quality
  { id: "pH_RO", x: "50%", y: "47%", label: "pH/ORP" },
  { id: "pH_NACF", x: "33%", y: "53%", label: "pH/Cl" },
  { id: "CL_001", x: "56%", y: "47%", label: "Cl" },
  { id: "EC_RO", x: "62%", y: "47%", label: "EC" },
  { id: "EC_NANO", x: "54%", y: "55%", label: "EC" },
  // Differential Pressure (DPT)
  { id: "DPT_BF", x: "32%", y: "24%", label: "DPT" },
  { id: "DPT_PF", x: "46%", y: "52%", label: "DPT" },
];

const SEV_COLORS = {
  critical: { ring: "#FF3B30", bg: "rgba(255,59,48,0.15)" },
  warning: { ring: "#FF9500", bg: "rgba(255,149,0,0.12)" },
  minor: { ring: "#FF9500", bg: "rgba(255,149,0,0.08)" },
};

const TYPE_COLORS = {
  flow: "#007AFF",
  level: "#32ADE6",
  pressure: "#FF9500",
  ph: "#34C759",
  chlorine: "#34C759",
  conductivity: "#AF52DE",
};

/* ── Instrument Tag (clickable label on PFD) ────────────── */

const InstrumentTag = ({ pos, sensor, isHovered, onHoverEnter, onHoverLeave, onClick }) => {
  const status = sensor?.status || "offline";
  const typeColor = TYPE_COLORS[sensor?.type] || "#007AFF";

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        zIndex: isHovered ? 15 : 5,
      }}
      onMouseEnter={() => onHoverEnter(sensor)}
      onMouseLeave={onHoverLeave}
      onClick={() => onClick(sensor)}
      data-testid={`pfd-sensor-${pos.id}`}
    >
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition-all duration-150"
        style={{
          backgroundColor: isHovered ? "#1A1A1AEE" : "#0A0A0ACC",
          border: `1px solid ${isHovered ? typeColor : "rgba(255,255,255,0.15)"}`,
          boxShadow: isHovered ? `0 0 8px ${typeColor}55` : "none",
          transform: isHovered ? "scale(1.15)" : "scale(1)",
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: STATUS_COLORS[status],
            boxShadow: `0 0 4px ${STATUS_COLORS[status]}`,
          }}
        />
        <span
          className="text-[9px] font-bold tracking-wider whitespace-nowrap"
          style={{
            color: isHovered ? "#FFFFFF" : "#C0C0C0",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {pos.label}
        </span>
      </div>
    </div>
  );
};

/* ── Leak Overlay ────────────────────────────────────────── */

const LeakOverlay = ({ zone, onHoverEnter, onHoverLeave }) => {
  const sc = SEV_COLORS[zone.severity] || SEV_COLORS.minor;
  return (
    <div
      className="absolute"
      style={{ left: zone.x, top: zone.y, transform: "translate(-50%, -50%)", zIndex: 10 }}
      onMouseEnter={() => onHoverEnter(zone)}
      onMouseLeave={onHoverLeave}
      data-testid={`pfd-leak-${zone.id}`}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: "36px", height: "36px", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          border: `2px solid ${sc.ring}`,
          animation: "leak-pulse 1.5s ease-in-out infinite",
          opacity: 0.6,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "24px", height: "24px", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: sc.bg,
          border: `1px solid ${sc.ring}88`,
        }}
      />
      <div className="relative z-10 flex items-center justify-center" style={{ width: "14px", height: "14px" }}>
        <Drop size={14} color={sc.ring} weight="fill" />
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────── */

const PFDVisualization = ({ sensors, onSensorClick }) => {
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const [leakZones, setLeakZones] = useState([]);
  const [hoveredLeak, setHoveredLeak] = useState(null);
  const [activeView, setActiveView] = useState("pfd"); // "pfd" | "balance" | "nrw" | "demand" | "assets" | "quality"

  const fetchLeaks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leaks/zones`);
      setLeakZones(res.data);
    } catch (err) { console.error("Failed to fetch leak zones:", err); }
  }, []);

  useEffect(() => {
    fetchLeaks();
    const interval = setInterval(fetchLeaks, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaks]);

  const sensorMap = useMemo(() => {
    const map = {};
    sensors.forEach((s) => { map[s.instrument_id] = s; });
    return map;
  }, [sensors]);

  const activeLeaks = useMemo(() => leakZones.filter((z) => z.has_leak), [leakZones]);

  const handleClick = useCallback(
    (sensor) => { if (onSensorClick && sensor) onSensorClick(sensor.instrument_id); },
    [onSensorClick],
  );

  const clearHoveredSensor = useCallback(() => setHoveredSensor(null), []);
  const clearHoveredLeak = useCallback(() => setHoveredLeak(null), []);

  return (
    <div
      className="grid-border p-4 md:p-6 relative"
      style={{ backgroundColor: "#121212", minHeight: "500px" }}
      data-testid="pfd-visualization"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center rounded-sm border overflow-hidden flex-wrap"
            style={{ borderColor: "rgba(255, 255, 255, 0.1)", backgroundColor: "#1A1A1A" }}
            data-testid="pfd-view-toggle"
          >
            {[
              { id: "pfd", label: "Process Flow", icon: <Crosshair size={12} weight="bold" /> },
              { id: "balance", label: "Water Balance", icon: <Scales size={12} weight="bold" /> },
              { id: "nrw", label: "NRW Analytics", icon: <Drop size={12} weight="bold" /> },
              { id: "demand", label: "Demand", icon: <ChartLine size={12} weight="bold" /> },
              { id: "assets", label: "Asset Health", icon: <Heartbeat size={12} weight="bold" /> },
              { id: "quality", label: "Water Quality", icon: <Flask size={12} weight="bold" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor: activeView === tab.id ? "#007AFF" : "transparent",
                  color: activeView === tab.id ? "#FFFFFF" : "#A3A3A3",
                }}
                data-testid={`${tab.id}-tab-button`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeLeaks.length > 0 && (
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-sm animate-pulse-border"
              style={{ border: "1px solid #FF3B30" }}
              data-testid="leak-indicator-badge"
            >
              <Drop size={14} color="#FF3B30" weight="fill" />
              <span className="text-xs font-bold" style={{ color: "#FF3B30" }}>
                {activeLeaks.length} LEAK{activeLeaks.length > 1 ? "S" : ""} DETECTED
              </span>
            </div>
          )}
          {activeView === "pfd" && (
            <div className="flex items-center gap-2">
              <Crosshair size={16} color="#A3A3A3" />
              <span className="text-xs" style={{ color: "#A3A3A3" }}>
                Click any tag for analytics
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conditional View: PFD or Analytics Tabs */}
      {activeView === "balance" ? (
        <WaterBalance />
      ) : activeView === "nrw" ? (
        <NRWAnalytics />
      ) : activeView === "demand" ? (
        <DemandIntelligence />
      ) : activeView === "assets" ? (
        <AssetHealth />
      ) : activeView === "quality" ? (
        <WaterQualityIntelligence />
      ) : (
        <PFDIsometric sensors={sensors} onSensorClick={handleClick} />
      )}
    </div>
  );
};

export default PFDVisualization;
