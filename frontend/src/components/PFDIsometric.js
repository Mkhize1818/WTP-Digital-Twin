import React, { useMemo, useCallback } from "react";
import "./PFDIsometric.css";

/* ── Tank positions on the isometric grid ──────────── */
const TANK_LAYOUT = [
  { id: "LIT_MR", label: "Main Reservoir", x: 2, y: 0, w: 1.3, h: 140, group: "intake" },
  { id: "LIT_BRT", label: "Backwash Recovery", x: 0, y: 2, w: 1, h: 110, group: "recovery" },
  { id: "LIT_RR2", label: "RO Recovery", x: 3, y: 1.5, w: 1, h: 110, group: "treatment" },
  { id: "LIT_STW", label: "Semi-Treated", x: 5, y: 1, w: 1.2, h: 130, group: "treatment" },
  { id: "LIT_HT", label: "Holding Tank", x: 4, y: 2.5, w: 1, h: 100, group: "treatment" },
  { id: "LIT_TWT", label: "Treated Water", x: 7, y: 0.5, w: 1.3, h: 140, group: "distribution" },
  { id: "LIT_RT4", label: "Reservoir T4", x: 7, y: 2.5, w: 1, h: 110, group: "distribution" },
  { id: "LIT_ST", label: "Storage Tank", x: 5, y: 3.5, w: 1, h: 100, group: "production" },
  { id: "LIT_NR1", label: "Nano Recovery 1", x: 3, y: 4, w: 0.9, h: 90, group: "recovery" },
  { id: "LIT_NR2", label: "Nano Recovery 2", x: 6, y: 4, w: 0.9, h: 90, group: "recovery" },
];

/* Flow meter, pressure, quality positions near pipes/tanks */
const INSTRUMENT_LAYOUT = [
  { id: "FIT_10", label: "FIT 10", x: 1, y: 0.5, group: "intake" },
  { id: "FIT_FL", label: "FIT FL", x: 4.5, y: 0.3, group: "distribution" },
  { id: "FIT_CIP", label: "FIT CIP", x: 9, y: 1.5, group: "production" },
  { id: "FIT_6", label: "FIT 6", x: 2, y: 3.5, group: "recovery" },
  { id: "FIT_8", label: "FIT 8", x: 5, y: 4.5, group: "recovery" },
  { id: "PIT_RACF1", label: "PIT 1", x: 4.8, y: 1.8, group: "treatment" },
  { id: "PIT_RACF2", label: "PIT 2", x: 5.5, y: 2, group: "treatment" },
  { id: "PIT_RACF3", label: "PIT 3", x: 6.2, y: 1.5, group: "treatment" },
  { id: "PIT_NACF1", label: "PIT N1", x: 2.5, y: 3, group: "treatment" },
  { id: "PIT_NACF2", label: "PIT N2", x: 3.5, y: 3, group: "treatment" },
  { id: "pH_RO", label: "pH/ORP", x: 6, y: 2.5, group: "quality" },
  { id: "pH_NACF", label: "pH/Cl", x: 4, y: 3.5, group: "quality" },
  { id: "CL_001", label: "Cl", x: 7, y: 1.5, group: "quality" },
  { id: "EC_RO", label: "EC", x: 8, y: 1, group: "quality" },
  { id: "EC_NANO", label: "EC", x: 6.5, y: 3.5, group: "quality" },
  { id: "DPT_BF", label: "DPT", x: 3.5, y: 1, group: "treatment" },
  { id: "DPT_PF", label: "DPT", x: 5.5, y: 3, group: "treatment" },
];

/* Pipe connections (from tank/position to tank/position) */
const PIPES = [
  { from: [0, 0], to: [2, 0.5], label: "Municipal In", flow: true, color: "#007AFF" },
  { from: [2.6, 0.8], to: [5, 1.2], label: "", flow: true, color: "#32ADE6" },
  { from: [5.6, 1.8], to: [7, 1], label: "", flow: true, color: "#32ADE6" },
  { from: [3.5, 2], to: [4, 2.5], label: "", flow: true, color: "#32ADE6" },
  { from: [4.5, 3], to: [5, 3.5], label: "", flow: true, color: "#34C759" },
  { from: [7.6, 1.2], to: [9.5, 1.5], label: "CIP Out", flow: true, color: "#34C759" },
  { from: [7.6, 2.8], to: [9.5, 3], label: "Prod Out", flow: true, color: "#34C759" },
  { from: [3.5, 4.2], to: [3, 2], label: "", flow: true, color: "#AF52DE" },
  { from: [6.5, 4.2], to: [5.5, 2.5], label: "", flow: true, color: "#AF52DE" },
  { from: [0.5, 2.5], to: [3, 1.8], label: "", flow: true, color: "#AF52DE" },
  { from: [7.5, 3], to: [9, 4], label: "WWTP", flow: true, color: "#FF9500" },
];

const GROUP_COLORS = {
  intake: "#007AFF",
  treatment: "#32ADE6",
  distribution: "#34C759",
  production: "#34C759",
  recovery: "#AF52DE",
  quality: "#FF9500",
};

const STATUS_GLOW = {
  online: "0 0 12px rgba(52, 199, 89, 0.4)",
  warning: "0 0 12px rgba(255, 149, 0, 0.5)",
  offline: "0 0 12px rgba(255, 59, 48, 0.5)",
};

const STATUS_COLORS = {
  online: "#34C759",
  warning: "#FF9500",
  offline: "#FF3B30",
};

/* ── Sub-components ─────────────────────────────────── */

const IsometricTank = ({ tank, sensor, onClick }) => {
  const level = sensor ? Math.min(100, Math.max(0, sensor.value)) : 50;
  const status = sensor?.status || "offline";
  const groupColor = GROUP_COLORS[tank.group] || "#007AFF";
  const waterHeight = (level / 100) * tank.h * 0.75;

  return (
    <div
      className="iso-tank"
      style={{
        left: `${tank.x * 100}px`,
        top: `${tank.y * 110}px`,
        width: `${tank.w * 90}px`,
        zIndex: Math.round(tank.y * 10),
      }}
      onClick={() => onClick(tank.id)}
      data-testid={`iso-tank-${tank.id}`}
    >
      {/* Tank cap (elliptical top) */}
      <div className="iso-tank-cap" style={{ borderColor: `${groupColor}66` }} />

      {/* Tank body */}
      <div
        className="iso-tank-body"
        style={{
          height: `${tank.h}px`,
          borderColor: `${groupColor}44`,
          boxShadow: STATUS_GLOW[status],
        }}
      >
        {/* Water fill */}
        <div
          className="iso-tank-water"
          style={{
            height: `${waterHeight}px`,
            background: `linear-gradient(to top, ${groupColor}88, ${groupColor}22)`,
          }}
        >
          <div className="iso-water-shimmer" />
        </div>

        {/* Level text */}
        <div className="iso-tank-level">
          <span className="iso-level-value">{sensor?.value ?? "—"}</span>
          <span className="iso-level-unit">{sensor?.unit || "%"}</span>
        </div>
      </div>

      {/* Tank base */}
      <div className="iso-tank-base" style={{ borderColor: `${groupColor}44` }} />

      {/* Label */}
      <div className="iso-tank-label">
        <div className="iso-status-dot" style={{ backgroundColor: STATUS_COLORS[status] }} />
        <span>{tank.label}</span>
      </div>

      {/* ID tag */}
      <div className="iso-tank-id" style={{ color: groupColor }}>{tank.id}</div>
    </div>
  );
};

const InstrumentMarker = ({ inst, sensor, onClick }) => {
  const status = sensor?.status || "offline";
  const groupColor = GROUP_COLORS[inst.group] || "#007AFF";
  const typeColor = {
    flow: "#007AFF",
    level: "#32ADE6",
    pressure: "#FF9500",
    ph: "#34C759",
    chlorine: "#34C759",
    conductivity: "#AF52DE",
  }[sensor?.type] || groupColor;

  return (
    <div
      className="iso-instrument"
      style={{
        left: `${inst.x * 100}px`,
        top: `${inst.y * 110}px`,
        zIndex: Math.round(inst.y * 10) + 5,
      }}
      onClick={() => onClick(inst.id)}
      data-testid={`iso-inst-${inst.id}`}
    >
      <div className="iso-inst-inner" style={{ borderColor: typeColor }}>
        <div className="iso-inst-dot" style={{ backgroundColor: STATUS_COLORS[status] }} />
        <span className="iso-inst-label" style={{ color: typeColor }}>{inst.label}</span>
        {sensor && (
          <span className="iso-inst-value">{sensor.value}</span>
        )}
      </div>
    </div>
  );
};

const PipeConnection = ({ pipe, index }) => {
  const x1 = pipe.from[0] * 100 + 40;
  const y1 = pipe.from[1] * 110 + 40;
  const x2 = pipe.to[0] * 100 + 40;
  const y2 = pipe.to[1] * 110 + 40;

  return (
    <g key={index}>
      {/* Pipe shadow */}
      <line
        x1={x1} y1={y1 + 2} x2={x2} y2={y2 + 2}
        stroke="rgba(0,0,0,0.3)" strokeWidth="6" strokeLinecap="round"
      />
      {/* Pipe body */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={pipe.color + "44"} strokeWidth="4" strokeLinecap="round"
      />
      {/* Flow animation */}
      {pipe.flow && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={pipe.color} strokeWidth="2" strokeLinecap="round"
          strokeDasharray="8 16"
          className="iso-pipe-flow"
          style={{ animationDelay: `${index * 0.3}s` }}
        />
      )}
      {/* Flow direction arrow */}
      {pipe.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 8}
          fill={pipe.color}
          fontSize="8"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          textAnchor="middle"
        >
          {pipe.label}
        </text>
      )}
    </g>
  );
};

/* ── Main Component ─────────────────────────────────── */

const PFDIsometric = ({ sensors, onSensorClick }) => {
  const sensorMap = useMemo(() => {
    const map = {};
    sensors.forEach((s) => { map[s.instrument_id || s.id] = s; });
    return map;
  }, [sensors]);

  const handleClick = useCallback((id) => {
    onSensorClick?.(id);
  }, [onSensorClick]);

  return (
    <div className="iso-scene" data-testid="pfd-isometric">
      {/* Grid background */}
      <div className="iso-grid" />

      {/* SVG Pipes Layer */}
      <svg className="iso-pipes" viewBox="0 0 1050 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="pipeGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#pipeGlow)">
          {PIPES.map((pipe, i) => (
            <PipeConnection key={i} pipe={pipe} index={i} />
          ))}
        </g>
      </svg>

      {/* Tanks Layer */}
      <div className="iso-tanks-layer">
        {TANK_LAYOUT.map((tank) => (
          <IsometricTank
            key={tank.id}
            tank={tank}
            sensor={sensorMap[tank.id]}
            onClick={handleClick}
          />
        ))}
      </div>

      {/* Instruments Layer */}
      <div className="iso-instruments-layer">
        {INSTRUMENT_LAYOUT.map((inst) => (
          <InstrumentMarker
            key={inst.id}
            inst={inst}
            sensor={sensorMap[inst.id]}
            onClick={handleClick}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="iso-legend">
        {[
          { label: "Intake", color: GROUP_COLORS.intake },
          { label: "Treatment", color: GROUP_COLORS.treatment },
          { label: "Distribution", color: GROUP_COLORS.distribution },
          { label: "Recovery", color: GROUP_COLORS.recovery },
          { label: "Quality", color: GROUP_COLORS.quality },
        ].map((item) => (
          <div key={item.label} className="iso-legend-item">
            <div className="iso-legend-dot" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
        <div className="iso-legend-sep" />
        {[
          { label: "Online", color: STATUS_COLORS.online },
          { label: "Warning", color: STATUS_COLORS.warning },
          { label: "Offline", color: STATUS_COLORS.offline },
        ].map((item) => (
          <div key={item.label} className="iso-legend-item">
            <div className="iso-legend-dot" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="iso-hint">Click any tank or sensor for detailed analytics</div>
    </div>
  );
};

export default PFDIsometric;
