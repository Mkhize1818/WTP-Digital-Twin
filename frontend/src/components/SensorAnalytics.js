import React, { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  ChartLine,
  TrendUp,
  TrendDown,
  WarningCircle,
  Lightning,
  Target,
  ClockCountdown,
} from "@phosphor-icons/react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SensorAnalytics = ({ instrumentId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${API}/sensors/${instrumentId}/analytics`);
        setData(res.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setLoading(false);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, [instrumentId]);

  if (loading) {
    return (
      <div
        className="grid-border p-6 flex items-center justify-center"
        style={{ backgroundColor: "#121212", minHeight: "600px" }}
      >
        <p className="text-[#A3A3A3]">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="grid-border p-6"
        style={{ backgroundColor: "#121212" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm mb-4 hover:text-white transition-colors"
          style={{ color: "#A3A3A3" }}
          data-testid="analytics-back-button"
        >
          <ArrowLeft size={18} /> Back to PFD
        </button>
        <p className="text-[#A3A3A3]">No data available for this instrument.</p>
      </div>
    );
  }

  const { instrument, time_series, stats, thresholds, recent_alerts, recent_anomalies } = data;

  // Build chart data
  const chartData = time_series.timestamps.map((ts, idx) => ({
    time: format(new Date(ts), "HH:mm:ss"),
    fullTime: format(new Date(ts), "HH:mm:ss dd/MM"),
    value: time_series.values[idx],
    ra5: time_series.rolling_avg_5[idx],
    ra10: time_series.rolling_avg_10[idx],
  }));

  const typeLabels = {
    flow: "Flow Rate",
    pressure: "Pressure",
    ph: "pH Level",
    chlorine: "Free Chlorine",
    conductivity: "Conductivity",
    level: "Tank Level",
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="p-3 border rounded-sm"
        style={{
          backgroundColor: "#1A1A1A",
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
      >
        <p
          className="text-xs mb-2"
          style={{ color: "#A3A3A3", fontFamily: "JetBrains Mono, monospace" }}
        >
          {payload[0]?.payload?.fullTime}
        </p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-sm" style={{ color: entry.color }}>
            <span className="font-semibold">{entry.name}: </span>
            {entry.value} {instrument.unit}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div
      className="grid-border p-4 md:p-6"
      style={{ backgroundColor: "#121212" }}
      data-testid="sensor-analytics-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-sm border hover:border-[#007AFF] transition-colors"
            style={{
              backgroundColor: "#1A1A1A",
              borderColor: "rgba(255, 255, 255, 0.1)",
              color: "#A3A3A3",
            }}
            data-testid="analytics-back-button"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to PFD</span>
          </button>
          <div>
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
            >
              {instrument.name}
            </h2>
            <p className="text-sm" style={{ color: "#A3A3A3" }}>
              {instrument.id} &middot; {typeLabels[instrument.type] || instrument.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "#34C759" }}
          />
          <span className="text-xs" style={{ color: "#A3A3A3" }}>
            Live
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Current"
          value={stats.current}
          unit={instrument.unit}
          icon={<Target size={18} color="#007AFF" weight="duotone" />}
          testId="stat-current"
        />
        <StatCard
          label="Mean"
          value={stats.mean}
          unit={instrument.unit}
          icon={<ChartLine size={18} color="#32ADE6" weight="duotone" />}
          testId="stat-mean"
        />
        <StatCard
          label="Min"
          value={stats.min}
          unit={instrument.unit}
          icon={<TrendDown size={18} color="#34C759" weight="duotone" />}
          testId="stat-min"
        />
        <StatCard
          label="Max"
          value={stats.max}
          unit={instrument.unit}
          icon={<TrendUp size={18} color="#FF9500" weight="duotone" />}
          testId="stat-max"
        />
        <StatCard
          label="Std Dev"
          value={stats.std_dev}
          unit={instrument.unit}
          icon={<Lightning size={18} color="#FF3B30" weight="duotone" />}
          testId="stat-stddev"
        />
      </div>

      {/* Main Time Series Chart */}
      <div
        className="grid-border p-4 mb-6"
        style={{ backgroundColor: "#0A0A0A" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
          >
            Time Series &mdash; {typeLabels[instrument.type] || instrument.type}
          </h4>
          <span className="text-xs" style={{ color: "#A3A3A3" }}>
            {stats.data_points} data points
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#A3A3A3", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#A3A3A3", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#A3A3A3", fontFamily: "IBM Plex Sans" }}
            />
            {thresholds.high && (
              <ReferenceLine
                y={thresholds.high}
                stroke="#FF3B30"
                strokeDasharray="6 3"
                label={{
                  value: `High: ${thresholds.high}`,
                  fill: "#FF3B30",
                  fontSize: 10,
                  position: "right",
                }}
              />
            )}
            {thresholds.low && (
              <ReferenceLine
                y={thresholds.low}
                stroke="#FF9500"
                strokeDasharray="6 3"
                label={{
                  value: `Low: ${thresholds.low}`,
                  fill: "#FF9500",
                  fontSize: 10,
                  position: "right",
                }}
              />
            )}
            <ReferenceLine
              y={instrument.baseline}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
              label={{
                value: `Baseline: ${instrument.baseline}`,
                fill: "#525252",
                fontSize: 10,
                position: "left",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#007AFF"
              strokeWidth={2}
              dot={false}
              name="Actual"
              animationDuration={500}
            />
            <Line
              type="monotone"
              dataKey="ra5"
              stroke="#34C759"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="Rolling Avg (5)"
              animationDuration={500}
            />
            <Line
              type="monotone"
              dataKey="ra10"
              stroke="#FF9500"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="8 3"
              name="Rolling Avg (10)"
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Value Distribution - Area Chart */}
        <div
          className="grid-border p-4"
          style={{ backgroundColor: "#0A0A0A" }}
        >
          <h4
            className="text-lg font-semibold tracking-tight mb-4"
            style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
          >
            Trend Envelope
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#A3A3A3", fontSize: 10, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#A3A3A3", fontSize: 10, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#007AFF"
                fill="url(#areaGradient)"
                strokeWidth={1.5}
                name="Value"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts & Anomalies for this instrument */}
        <div
          className="grid-border p-4"
          style={{ backgroundColor: "#0A0A0A" }}
        >
          <h4
            className="text-lg font-semibold tracking-tight mb-4"
            style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
          >
            Recent Events
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {recent_alerts.length === 0 && recent_anomalies.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "#A3A3A3" }}>
                No recent events for this instrument.
              </p>
            ) : (
              <>
                {recent_alerts.map((alert, idx) => (
                  <div
                    key={`alert-${idx}`}
                    className="flex items-start gap-2 p-2 rounded-sm"
                    style={{ backgroundColor: "rgba(255, 59, 48, 0.08)" }}
                    data-testid={`analytics-alert-${idx}`}
                  >
                    <WarningCircle
                      size={16}
                      color={alert.severity === "critical" ? "#FF3B30" : "#FF9500"}
                      weight="duotone"
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{alert.message}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>
                        {format(new Date(alert.timestamp), "HH:mm:ss dd/MM")}
                      </p>
                    </div>
                  </div>
                ))}
                {recent_anomalies.map((anomaly, idx) => (
                  <div
                    key={`anomaly-${idx}`}
                    className="flex items-start gap-2 p-2 rounded-sm"
                    style={{ backgroundColor: "rgba(255, 149, 0, 0.08)" }}
                    data-testid={`analytics-anomaly-${idx}`}
                  >
                    <Lightning
                      size={16}
                      color="#FF9500"
                      weight="duotone"
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">
                        {anomaly.anomaly_type}: {anomaly.description}
                      </p>
                      <p className="text-xs" style={{ color: "#525252" }}>
                        Confidence: {(anomaly.confidence * 100).toFixed(0)}% &middot;{" "}
                        {format(new Date(anomaly.timestamp), "HH:mm:ss dd/MM")}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Band */}
      {thresholds.label && (
        <div
          className="grid-border p-4 mt-4"
          style={{ backgroundColor: "#0A0A0A" }}
        >
          <div className="flex items-center gap-3">
            <ClockCountdown size={20} color="#32ADE6" weight="duotone" />
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "#FFFFFF" }}
              >
                {thresholds.label}
              </p>
              <p className="text-xs" style={{ color: "#A3A3A3" }}>
                Low: {thresholds.low} {instrument.unit} &middot; High: {thresholds.high}{" "}
                {instrument.unit} &middot; Baseline: {instrument.baseline} {instrument.unit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, unit, icon, testId }) => (
  <div
    className="grid-border p-3"
    style={{ backgroundColor: "#1A1A1A" }}
    data-testid={testId}
  >
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span
        className="text-xs font-bold uppercase tracking-[0.15em]"
        style={{ color: "#A3A3A3" }}
      >
        {label}
      </span>
    </div>
    <div className="flex items-baseline gap-1">
      <span
        className="text-xl font-black tracking-tighter"
        style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: "#525252" }}>
        {unit}
      </span>
    </div>
  </div>
);

export default SensorAnalytics;
