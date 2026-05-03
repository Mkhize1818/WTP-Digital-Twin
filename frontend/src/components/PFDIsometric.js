import React, { useMemo, useCallback } from "react";
import "./PFDIsometric.css";

/*
 * Layout mirrors the original 2D PFD flow:
 *   Municipal In → Main Reservoir (top-left)
 *   → Treatment (RR2, STW center) → RACF filters
 *   → Treated Water (right) → RT4 (top-right) → CIP/Prod Out
 *   Backwash Recovery (left) ↔ recycle
 *   Holding Tank → NACF → Storage → Nano Recovery loops (bottom)
 *   → WWTP outlet (bottom-right)
 */

const TANK_LAYOUT = [
  { id: "LIT_MR",  label: "Main Reservoir",      x: 0.5,  y: 0.45, w: 1.3, h: 130, group: "intake" },
  { id: "LIT_RT4", label: "Reservoir T4",         x: 5.6,  y: 0.45, w: 1.1, h: 115, group: "distribution" },
  { id: "LIT_RR2", label: "RO Recovery",          x: 2.2,  y: 1.25, w: 1.0, h: 110, group: "treatment" },
  { id: "LIT_STW", label: "Semi-Treated Water",   x: 3.8,  y: 1.0,  w: 1.2, h: 125, group: "treatment" },
  { id: "LIT_TWT", label: "Treated Water",        x: 7.0,  y: 1.05, w: 1.3, h: 135, group: "distribution" },
  { id: "LIT_BRT", label: "Backwash Recovery",    x: 0.4,  y: 2.2,  w: 1.0, h: 100, group: "recovery" },
  { id: "LIT_HT",  label: "Holding Tank",         x: 2.2,  y: 2.4,  w: 1.0, h: 100, group: "treatment" },
  { id: "LIT_ST",  label: "Storage Tank",         x: 4.3,  y: 3.2,  w: 1.0, h: 100, group: "production" },
  { id: "LIT_NR1", label: "Nano Recovery 1",      x: 3.2,  y: 3.75, w: 0.9, h: 90,  group: "recovery" },
  { id: "LIT_NR2", label: "Nano Recovery 2",      x: 5.8,  y: 3.4,  w: 0.9, h: 90,  group: "recovery" },
];

const INSTRUMENT_LAYOUT = [
  /* Flow meters */
  { id: "FIT_10",    label: "FIT 10",  x: 1.5,  y: 1.7,   group: "intake" },
  { id: "FIT_FL",    label: "FIT FL",  x: 3.4,  y: 0.5,   group: "distribution" },
  { id: "FIT_CIP",   label: "FIT CIP", x: 8.8,  y: 1.15,  group: "production" },
  { id: "FIT_6",     label: "FIT 6",   x: 2.3,  y: 3.6,   group: "recovery" },
  { id: "FIT_8",     label: "FIT 8",   x: 4.8,  y: 3.5,   group: "recovery" },
  /* Pressure — RACF area (between STW and TWT) */
  { id: "PIT_RACF1", label: "PIT 1",   x: 5.0,  y: 1.35,  group: "treatment" },
  { id: "PIT_RACF2", label: "PIT 2",   x: 5.6,  y: 1.55,  group: "treatment" },
  { id: "PIT_RACF3", label: "PIT 3",   x: 6.2,  y: 1.35,  group: "treatment" },
  /* Pressure — NACF area (below HT) */
  { id: "PIT_NACF1", label: "PIT N1",  x: 1.5,  y: 2.9,   group: "treatment" },
  { id: "PIT_NACF2", label: "PIT N2",  x: 2.5,  y: 3.0,   group: "treatment" },
  /* Water quality */
  { id: "pH_RO",     label: "pH/ORP",  x: 5.6,  y: 2.25,  group: "quality" },
  { id: "pH_NACF",   label: "pH/Cl",   x: 3.3,  y: 2.75,  group: "quality" },
  { id: "CL_001",    label: "Cl",      x: 6.5,  y: 2.2,   group: "quality" },
  { id: "EC_RO",     label: "EC",      x: 7.2,  y: 2.2,   group: "quality" },
  { id: "EC_NANO",   label: "EC",      x: 5.5,  y: 3.0,   group: "quality" },
  /* Differential pressure */
  { id: "DPT_BF",    label: "DPT",     x: 3.0,  y: 0.9,   group: "treatment" },
  { id: "DPT_PF",    label: "DPT",     x: 4.4,  y: 2.7,   group: "treatment" },
];

/* Pipe connections — follow the actual water reticulation process flow */
const PIPES = [
  /* ── Main intake line ───────────────────────────── */
  { from: [-0.5, 0.85],  to: [0.5, 0.85],   label: "Municipal In", flow: true, color: "#1171b8" },
  /* MR → through filters toward treatment */
  { from: [1.8, 0.85],   to: [3.8, 1.05],   label: "",  flow: true, color: "#1171b8" },
  /* Fork down to RO Recovery */
  { from: [2.5, 0.95],   to: [2.5, 1.25],   label: "",  flow: true, color: "#1A8AD4" },
  /* RR2 → STW */
  { from: [3.2, 1.55],   to: [3.8, 1.35],   label: "",  flow: true, color: "#1A8AD4" },
  /* STW → through RACF filters → TWT */
  { from: [5.0, 1.3],    to: [7.0, 1.45],   label: "",  flow: true, color: "#1A8AD4" },
  /* ── Distribution ───────────────────────────────── */
  /* TWT → up to RT4 */
  { from: [7.5, 1.05],   to: [6.7, 0.65],   label: "",  flow: true, color: "#34C759" },
  /* TWT → CIP Out (far right) */
  { from: [8.3, 1.45],   to: [9.5, 1.15],   label: "CIP Out",  flow: true, color: "#34C759" },
  /* RT4 → Production Out (far right) */
  { from: [6.7, 0.65],   to: [9.5, 0.65],   label: "Prod Out", flow: true, color: "#34C759" },
  /* ── Recovery loops ─────────────────────────────── */
  /* MR → BRT (backwash drops down) */
  { from: [0.8, 1.45],   to: [0.7, 2.2],    label: "",  flow: true, color: "#AF52DE" },
  /* BRT → recycle back up to treatment */
  { from: [1.4, 2.35],   to: [2.2, 1.75],   label: "",  flow: true, color: "#AF52DE" },
  /* HT → down to Storage */
  { from: [3.2, 2.85],   to: [4.3, 3.2],    label: "",  flow: true, color: "#1A8AD4" },
  /* NR1 → recovery back up */
  { from: [3.5, 3.75],   to: [2.7, 2.85],   label: "",  flow: true, color: "#AF52DE" },
  /* NR2 → recovery back up */
  { from: [6.0, 3.4],    to: [6.5, 2.35],   label: "",  flow: true, color: "#AF52DE" },
  /* ── Waste outlet ───────────────────────────────── */
  { from: [8.0, 1.95],   to: [9.5, 3.55],   label: "WWTP",  flow: true, color: "#FF9500" },
];

const GROUP_COLORS = {
  intake: "#1171b8",
  treatment: "#1A8AD4",
  distribution: "#34C759",
  production: "#34C759",
  recovery: "#AF52DE",
  quality: "#FF9500",
};

const STATUS_GLOW = {
  online:  "0 0 12px rgba(52, 199, 89, 0.4)",
  warning: "0 0 12px rgba(255, 149, 0, 0.5)",
  offline: "0 0 12px rgba(255, 59, 48, 0.5)",
};

const STATUS_COLORS = {
  online:  "#34C759",
  warning: "#FF9500",
  offline: "#FF3B30",
};

/* ── Zone labels (subtle background text) ─────────── */
const ZONE_LABELS = [
  { label: "INTAKE",       x: 0.3,  y: 0.15,  color: "#1171b8" },
  { label: "TREATMENT",    x: 3.0,  y: 0.15,  color: "#1A8AD4" },
  { label: "DISTRIBUTION", x: 6.5,  y: 0.15,  color: "#34C759" },
  { label: "RECOVERY",     x: 1.5,  y: 4.1,   color: "#AF52DE" },
];

/* ── Sub-components ───────────────────────────────── */

const IsometricTank = ({ tank, sensor, onClick }) => {
  const level = sensor ? Math.min(100, Math.max(0, sensor.value)) : 50;
  const status = sensor?.status || "offline";
  const groupColor = GROUP_COLORS[tank.group] || "#1171b8";
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
      <div className="iso-tank-cap" style={{ borderColor: `${groupColor}66` }} />

      <div
        className="iso-tank-body"
        style={{
          height: `${tank.h}px`,
          borderColor: `${groupColor}44`,
          boxShadow: STATUS_GLOW[status],
        }}
      >
        <div
          className="iso-tank-water"
          style={{
            height: `${waterHeight}px`,
            background: `linear-gradient(to top, ${groupColor}88, ${groupColor}22)`,
          }}
        >
          <div className="iso-water-shimmer" />
        </div>

        <div className="iso-tank-level">
          <span className="iso-level-value">{sensor?.value ?? "—"}</span>
          <span className="iso-level-unit">{sensor?.unit || "%"}</span>
        </div>
      </div>

      <div className="iso-tank-base" style={{ borderColor: `${groupColor}44` }} />

      <div className="iso-tank-label">
        <div className="iso-status-dot" style={{ backgroundColor: STATUS_COLORS[status] }} />
        <span>{tank.label}</span>
      </div>

      <div className="iso-tank-id" style={{ color: groupColor }}>{tank.id}</div>
    </div>
  );
};

const InstrumentMarker = ({ inst, sensor, onClick }) => {
  const status = sensor?.status || "offline";
  const groupColor = GROUP_COLORS[inst.group] || "#1171b8";
  const typeColor = {
    flow: "#1171b8",
    level: "#1A8AD4",
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
          <span className="iso-inst-value">
            {sensor.value}{sensor.unit ? ` ${sensor.unit}` : ""}
          </span>
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
      <line
        x1={x1} y1={y1 + 2} x2={x2} y2={y2 + 2}
        stroke="rgba(0,0,0,0.3)" strokeWidth="6" strokeLinecap="round"
      />
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={pipe.color + "44"} strokeWidth="4" strokeLinecap="round"
      />
      {pipe.flow && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={pipe.color} strokeWidth="2" strokeLinecap="round"
          strokeDasharray="8 16"
          className="iso-pipe-flow"
          style={{ animationDelay: `${index * 0.3}s` }}
        />
      )}
      {pipe.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 8}
          fill={pipe.color}
          fontSize="9"
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

/* ── Main Component ───────────────────────────────── */

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
      <div className="iso-grid" />

      {/* Zone labels */}
      <div className="iso-zones-layer">
        {ZONE_LABELS.map((z) => (
          <div
            key={z.label}
            className="iso-zone-label"
            style={{
              left: `${z.x * 100}px`,
              top: `${z.y * 110 + 12}px`,
              color: `${z.color}30`,
            }}
          >
            {z.label}
          </div>
        ))}
      </div>

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

      <div className="iso-hint">Click any tank or sensor for detailed analytics</div>
    </div>
  );
};

export default PFDIsometric;
