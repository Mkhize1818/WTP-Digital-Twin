import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Crosshair, Drop } from "@phosphor-icons/react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_COLORS = {
  online: "#34C759",
  warning: "#FF9500",
  offline: "#FF3B30",
};

const INSTRUMENT_POSITIONS = [
  { id: "FIT_10", x: "15%", y: "35%" },
  { id: "FIT_8", x: "70%", y: "75%" },
  { id: "FIT_6", x: "50%", y: "85%" },
  { id: "PIT_M1", x: "35%", y: "15%" },
  { id: "PIT_M2", x: "25%", y: "30%" },
  { id: "PIT_M3", x: "45%", y: "45%" },
  { id: "pH_001", x: "55%", y: "55%" },
  { id: "CL_001", x: "62%", y: "50%" },
  { id: "EC_001", x: "68%", y: "55%" },
  { id: "LIT_001", x: "20%", y: "20%" },
];

const SEV_COLORS = {
  critical: { ring: "#FF3B30", bg: "rgba(255,59,48,0.15)" },
  warning: { ring: "#FF9500", bg: "rgba(255,149,0,0.12)" },
  minor: { ring: "#FF9500", bg: "rgba(255,149,0,0.08)" },
};

/* ── Sub-components ─────────────────────────────────────── */

const LeakOverlay = ({ zone, onHoverEnter, onHoverLeave }) => {
  const sc = SEV_COLORS[zone.severity] || SEV_COLORS.minor;
  return (
    <div
      className="absolute"
      style={{ left: zone.x, top: zone.y, transform: "translate(-50%, -50%)" }}
      onMouseEnter={() => onHoverEnter(zone)}
      onMouseLeave={onHoverLeave}
      data-testid={`pfd-leak-${zone.id}`}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: "40px", height: "40px", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          border: `2px solid ${sc.ring}`,
          animation: "leak-pulse 1.5s ease-in-out infinite",
          opacity: 0.6,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "28px", height: "28px", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: sc.bg,
          border: `1px solid ${sc.ring}88`,
        }}
      />
      <div className="relative z-10 flex items-center justify-center" style={{ width: "16px", height: "16px" }}>
        <Drop size={16} color={sc.ring} weight="fill" />
      </div>
    </div>
  );
};

const SensorDot = ({ pos, sensor, status, isHovered, onHoverEnter, onHoverLeave, onClick }) => (
  <div
    className="absolute cursor-pointer group"
    style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
    onMouseEnter={() => onHoverEnter(sensor)}
    onMouseLeave={onHoverLeave}
    onClick={() => onClick(sensor)}
    data-testid={`pfd-sensor-${pos.id}`}
  >
    <div
      className="absolute rounded-full transition-all duration-200"
      style={{
        width: isHovered ? "24px" : "12px",
        height: isHovered ? "24px" : "12px",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: isHovered ? `${STATUS_COLORS[status]}33` : "transparent",
        border: isHovered ? `1px solid ${STATUS_COLORS[status]}88` : "none",
      }}
    />
    <div
      className="w-3 h-3 rounded-full transition-transform duration-200"
      style={{
        backgroundColor: STATUS_COLORS[status],
        boxShadow: `0 0 10px ${STATUS_COLORS[status]}`,
        transform: isHovered ? "scale(1.3)" : "scale(1)",
        animation: status === "offline" ? "pulse 2s ease-in-out infinite" : "none",
      }}
    />
  </div>
);

/* ── Main component ──────────────────────────────────────── */

const PFDVisualization = ({ sensors, onSensorClick }) => {
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const [leakZones, setLeakZones] = useState([]);
  const [hoveredLeak, setHoveredLeak] = useState(null);

  const fetchLeaks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leaks/zones`);
      setLeakZones(res.data);
    } catch (_) { /* silently retry on next interval */ }
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}>
          Process Flow Diagram
        </h3>
        <div className="flex items-center gap-4">
          {activeLeaks.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-sm animate-pulse-border" style={{ border: "1px solid #FF3B30" }} data-testid="leak-indicator-badge">
              <Drop size={14} color="#FF3B30" weight="fill" />
              <span className="text-xs font-bold" style={{ color: "#FF3B30" }}>
                {activeLeaks.length} LEAK{activeLeaks.length > 1 ? "S" : ""} DETECTED
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Crosshair size={16} color="#A3A3A3" />
            <span className="text-xs" style={{ color: "#A3A3A3" }}>Click sensor for analytics</span>
          </div>
        </div>
      </div>

      <div className="relative w-full" style={{ minHeight: "450px" }}>
        <img
          src="https://customer-assets.emergentagent.com/job_08778319-680e-4dcc-9637-79a56dea1c9a/artifacts/z7wc49hm_CCBA%20Digital%20Twin.png"
          alt="Process Flow Diagram"
          className="w-full h-auto opacity-90"
          style={{ filter: "brightness(0.9)" }}
        />

        {/* Leak Zone Overlays */}
        {leakZones.map((zone) =>
          zone.has_leak ? (
            <LeakOverlay key={zone.id} zone={zone} onHoverEnter={setHoveredLeak} onHoverLeave={clearHoveredLeak} />
          ) : null,
        )}

        {/* Leak Tooltip */}
        {hoveredLeak && (
          <div className="absolute z-20 p-3 rounded-sm border pointer-events-none" style={{ backgroundColor: "#1A1A1A", borderColor: "#FF3B30", left: "50%", bottom: "10px", transform: "translateX(-50%)", minWidth: "240px" }}>
            <div className="flex items-center gap-2 mb-2">
              <Drop size={16} color="#FF3B30" weight="fill" />
              <span className="text-sm font-bold text-white">Leak Detected</span>
            </div>
            <p className="text-xs text-[#A3A3A3] mb-1">{hoveredLeak.name}</p>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#FF3B30" }}>Est. Loss: {hoveredLeak.estimated_loss} L/min</span>
              <span style={{ color: "#A3A3A3" }}>Conf: {(hoveredLeak.confidence * 100).toFixed(0)}%</span>
            </div>
            <span className="text-xs uppercase font-bold mt-1 block" style={{ color: hoveredLeak.severity === "critical" ? "#FF3B30" : "#FF9500" }}>
              {hoveredLeak.severity}
            </span>
          </div>
        )}

        {/* Sensor Dots */}
        {INSTRUMENT_POSITIONS.map((pos) => {
          const sensor = sensorMap[pos.id];
          const status = sensor?.status || "offline";
          return (
            <SensorDot
              key={pos.id}
              pos={pos}
              sensor={sensor}
              status={status}
              isHovered={hoveredSensor?.instrument_id === pos.id}
              onHoverEnter={setHoveredSensor}
              onHoverLeave={clearHoveredSensor}
              onClick={handleClick}
            />
          );
        })}

        {/* Sensor Tooltip */}
        {hoveredSensor && !hoveredLeak && (
          <div className="absolute z-10 p-3 rounded-sm border pointer-events-none" style={{ backgroundColor: "#1A1A1A", borderColor: "#007AFF", left: "50%", top: "10px", transform: "translateX(-50%)", minWidth: "220px" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-white">{hoveredSensor.instrument_name}</p>
              <span className="text-xs uppercase font-bold" style={{ color: STATUS_COLORS[hoveredSensor.status] }}>{hoveredSensor.status}</span>
            </div>
            <p className="text-xs mb-2" style={{ color: "#A3A3A3", fontFamily: "JetBrains Mono, monospace" }}>{hoveredSensor.instrument_id}</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}>{hoveredSensor.value}</span>
              <span className="text-xs" style={{ color: "#A3A3A3" }}>{hoveredSensor.unit}</span>
            </div>
            <div className="text-xs flex items-center gap-1 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#007AFF" }}>
              <Crosshair size={12} /> Click to view analytics
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PFDVisualization;
