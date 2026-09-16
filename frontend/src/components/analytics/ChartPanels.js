import React from "react";
import { format } from "date-fns";
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
  ComposedChart, Legend,
} from "recharts";
import { WarningCircle, Lightning } from "@phosphor-icons/react";

/* ── Shared chart axis/grid styles ──────────────────────── */

const AXIS_TICK = { fill: "#C9E0EF", fontSize: 11, fontFamily: "JetBrains Mono" };
const AXIS_TICK_SM = { fill: "#C9E0EF", fontSize: 10, fontFamily: "JetBrains Mono" };
const AXIS_LINE = { stroke: "rgba(17,113,184,0.12)" };
const GRID_STROKE = "rgba(17,113,184,0.08)";

/* ── Custom tooltip (shared) ─────────────────────────────── */

export const ChartTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 border rounded-sm" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
      <p className="text-xs mb-2" style={{ color: "#163F56", fontFamily: "JetBrains Mono, monospace" }}>
        {payload[0]?.payload?.fullTime}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          <span className="font-semibold">{entry.name}: </span>
          {entry.value} {unit}
        </p>
      ))}
    </div>
  );
};

/* ── Time Series Chart ───────────────────────────────────── */

export const TimeSeriesChart = ({ chartData, instrument, thresholds, typeLabel, stats, range }) => {
  const tooltipContent = <ChartTooltip unit={instrument.unit} />;
  const legendStyle = { fontSize: 12, color: "#163F56", fontFamily: "IBM Plex Sans" };

  return (
    <div className="grid-border p-4 mb-6" style={{ backgroundColor: "transparent" }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "Chivo, sans-serif", color: "#062C60" }}>
          Time Series &mdash; {typeLabel}
        </h4>
        <span className="text-xs" style={{ color: "#163F56" }}>
          {stats.data_points} data points &middot; Range: {range.toUpperCase()}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} interval="preserveStartEnd" />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} domain={["auto", "auto"]} />
          <Tooltip content={tooltipContent} />
          <Legend wrapperStyle={legendStyle} />
          {thresholds.high != null && (
            <ReferenceLine y={thresholds.high} stroke="#FF3B30" strokeDasharray="6 3"
              label={{ value: `High: ${thresholds.high}`, fill: "#FF3B30", fontSize: 10, position: "right" }} />
          )}
          {thresholds.low != null && (
            <ReferenceLine y={thresholds.low} stroke="#FF9500" strokeDasharray="6 3"
              label={{ value: `Low: ${thresholds.low}`, fill: "#FF9500", fontSize: 10, position: "right" }} />
          )}
          <ReferenceLine y={instrument.baseline} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"
            label={{ value: `Baseline: ${instrument.baseline}`, fill: "#163F56", fontSize: 10, position: "left" }} />
          <Line type="monotone" dataKey="value" stroke="#1171b8" strokeWidth={2} dot={false} name="Actual" animationDuration={500} />
          <Line type="monotone" dataKey="ra5" stroke="#34C759" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Rolling Avg (5)" animationDuration={500} />
          <Line type="monotone" dataKey="ra10" stroke="#FF9500" strokeWidth={1.5} dot={false} strokeDasharray="8 3" name="Rolling Avg (10)" animationDuration={500} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ── Trend Envelope ──────────────────────────────────────── */

export const TrendEnvelope = ({ chartData, unit }) => {
  const tooltipContent = <ChartTooltip unit={unit} />;

  return (
    <div className="grid-border p-4" style={{ backgroundColor: "transparent" }}>
      <h4 className="text-lg font-semibold tracking-tight mb-4" style={{ fontFamily: "Chivo, sans-serif", color: "#062C60" }}>
        Trend Envelope
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="time" tick={AXIS_TICK_SM} tickLine={false} axisLine={AXIS_LINE} interval="preserveStartEnd" />
          <YAxis tick={AXIS_TICK_SM} tickLine={false} axisLine={AXIS_LINE} />
          <Tooltip content={tooltipContent} />
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1171b8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1171b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="#1171b8" fill="url(#areaGrad)" strokeWidth={1.5} name="Value" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ── Recent Events Panel ─────────────────────────────────── */

export const RecentEvents = ({ alerts, anomalies }) => (
  <div className="grid-border p-4" style={{ backgroundColor: "transparent" }}>
    <h4 className="text-lg font-semibold tracking-tight mb-4" style={{ fontFamily: "Chivo, sans-serif", color: "#062C60" }}>
      Recent Events
    </h4>
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {alerts.length === 0 && anomalies.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "#163F56" }}>No recent events for this instrument.</p>
      ) : (
        <>
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-2 p-2 rounded-sm" style={{ backgroundColor: "rgba(255, 59, 48, 0.08)" }} data-testid={`analytics-alert-${alert.id}`}>
              <WarningCircle size={16} color={alert.severity === "critical" ? "#FF3B30" : "#FF9500"} weight="duotone" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{alert.message}</p>
                <p className="text-xs" style={{ color: "#7A9AB5" }}>{format(new Date(alert.timestamp), "HH:mm:ss dd/MM")}</p>
              </div>
            </div>
          ))}
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="flex items-start gap-2 p-2 rounded-sm" style={{ backgroundColor: "rgba(255, 149, 0, 0.08)" }} data-testid={`analytics-anomaly-${anomaly.id}`}>
              <Lightning size={16} color="#FF9500" weight="duotone" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{anomaly.anomaly_type}: {anomaly.description}</p>
                <p className="text-xs" style={{ color: "#7A9AB5" }}>
                  Confidence: {(anomaly.confidence * 100).toFixed(0)}% &middot; {format(new Date(anomaly.timestamp), "HH:mm:ss dd/MM")}
                </p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  </div>
);
