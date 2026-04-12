import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowLeft, ChartLine, TrendUp, TrendDown, Lightning, Target,
  ClockCountdown, FileCsv, FilePdf, Clock,
} from "@phosphor-icons/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TimeSeriesChart, TrendEnvelope, RecentEvents } from "./analytics/ChartPanels";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RANGES = [
  { label: "1H", value: "1h" },
  { label: "6H", value: "6h" },
  { label: "24H", value: "24h" },
  { label: "7D", value: "7d" },
  { label: "ALL", value: "all" },
];

const TYPE_LABELS = {
  flow: "Flow Rate",
  pressure: "Pressure",
  ph: "pH Level",
  chlorine: "Free Chlorine",
  conductivity: "Conductivity",
  level: "Tank Level",
};

/* ── Stat Card ──────────────────────────────────────────── */

const StatCard = ({ label, value, unit, icon, testId }) => (
  <div className="grid-border p-3" style={{ backgroundColor: "#1A1A1A" }} data-testid={testId}>
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "#A3A3A3" }}>{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}>{value}</span>
      <span className="text-xs" style={{ color: "#525252" }}>{unit}</span>
    </div>
  </div>
);

/* ── Export Helpers ──────────────────────────────────────── */

function exportCSV(data, range) {
  const { instrument, time_series, stats } = data;
  let csv = `Instrument,${instrument.name} (${instrument.id})\nType,${instrument.type}\nUnit,${instrument.unit}\n`;
  csv += `Mean,${stats.mean}\nMin,${stats.min}\nMax,${stats.max}\nStd Dev,${stats.std_dev}\nData Points,${stats.data_points}\n\n`;
  csv += "Timestamp,Value,Rolling Avg 5,Rolling Avg 10\n";
  time_series.timestamps.forEach((ts, i) => {
    csv += `${ts},${time_series.values[i]},${time_series.rolling_avg_5[i]},${time_series.rolling_avg_10[i]}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${instrument.id}_analytics_${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(data, range) {
  const { instrument, stats, thresholds, recent_alerts } = data;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(0, 122, 255);
  doc.text("Digital Twin - Sensor Analytics Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}  |  Range: ${range}`, 14, 28);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`${instrument.name} (${instrument.id})`, 14, 40);
  doc.setFontSize(10);
  doc.text(`Type: ${instrument.type}  |  Unit: ${instrument.unit}`, 14, 47);

  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Value"]],
    body: [
      ["Current", `${stats.current} ${instrument.unit}`],
      ["Mean", `${stats.mean} ${instrument.unit}`],
      ["Min", `${stats.min} ${instrument.unit}`],
      ["Max", `${stats.max} ${instrument.unit}`],
      ["Std Dev", `${stats.std_dev} ${instrument.unit}`],
      ["Data Points", `${stats.data_points}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [0, 122, 255] },
  });

  if (thresholds.label) {
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Compliance Thresholds", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Parameter", "Value"]],
      body: [
        ["Range", thresholds.label],
        ["Low Limit", `${thresholds.low} ${instrument.unit}`],
        ["High Limit", `${thresholds.high} ${instrument.unit}`],
        ["Baseline", `${instrument.baseline} ${instrument.unit}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [0, 122, 255] },
    });
  }

  if (recent_alerts.length > 0) {
    const y2 = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Recent Alerts", 14, y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [["Severity", "Type", "Message", "Time"]],
      body: recent_alerts.map((a) => [a.severity, a.type, a.message, format(new Date(a.timestamp), "dd/MM HH:mm")]),
      theme: "grid",
      headStyles: { fillColor: [255, 59, 48] },
    });
  }

  doc.save(`${instrument.id}_report_${range}.pdf`);
}

/* ── Main Component ─────────────────────────────────────── */

const SensorAnalytics = ({ instrumentId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sensors/${instrumentId}/analytics?time_range=${range}`);
      setData(res.data);
      setLoading(false);
    } catch (_) {
      setLoading(false);
    }
  }, [instrumentId, range]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.time_series.timestamps.map((ts, idx) => ({
      time: format(new Date(ts), "HH:mm:ss"),
      fullTime: format(new Date(ts), "HH:mm:ss dd/MM"),
      value: data.time_series.values[idx],
      ra5: data.time_series.rolling_avg_5[idx],
      ra10: data.time_series.rolling_avg_10[idx],
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="grid-border p-6 flex items-center justify-center" style={{ backgroundColor: "#121212", minHeight: "600px" }}>
        <p className="text-[#A3A3A3]">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid-border p-6" style={{ backgroundColor: "#121212" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4 hover:text-white transition-colors" style={{ color: "#A3A3A3" }} data-testid="analytics-back-button">
          <ArrowLeft size={18} /> Back to PFD
        </button>
        <p className="text-[#A3A3A3]">No data available.</p>
      </div>
    );
  }

  const { instrument, stats, thresholds, recent_alerts, recent_anomalies } = data;
  const typeLabel = TYPE_LABELS[instrument.type] || instrument.type;

  return (
    <div className="grid-border p-4 md:p-6" style={{ backgroundColor: "#121212" }} data-testid="sensor-analytics-panel">

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-sm border hover:border-[#007AFF] transition-colors"
            style={{ backgroundColor: "#1A1A1A", borderColor: "rgba(255, 255, 255, 0.1)", color: "#A3A3A3" }}
            data-testid="analytics-back-button"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to PFD</span>
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}>
              {instrument.name}
            </h2>
            <p className="text-sm" style={{ color: "#A3A3A3" }}>
              {instrument.id} &middot; {typeLabel}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-sm border overflow-hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)", backgroundColor: "#1A1A1A" }} data-testid="range-selector">
            <div className="flex items-center gap-1 px-2" style={{ color: "#525252" }}>
              <Clock size={14} />
            </div>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className="px-3 py-1.5 text-xs font-bold transition-colors"
                style={{ backgroundColor: range === r.value ? "#007AFF" : "transparent", color: range === r.value ? "#FFFFFF" : "#A3A3A3" }}
                data-testid={`range-${r.value}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => exportCSV(data, range)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium hover:border-[#34C759] transition-colors"
            style={{ borderColor: "rgba(255, 255, 255, 0.1)", color: "#34C759", backgroundColor: "#1A1A1A" }}
            data-testid="export-csv-button"
          >
            <FileCsv size={16} weight="duotone" /> CSV
          </button>
          <button
            onClick={() => exportPDF(data, range)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium hover:border-[#FF3B30] transition-colors"
            style={{ borderColor: "rgba(255, 255, 255, 0.1)", color: "#FF3B30", backgroundColor: "#1A1A1A" }}
            data-testid="export-pdf-button"
          >
            <FilePdf size={16} weight="duotone" /> PDF
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#34C759" }} />
            <span className="text-xs" style={{ color: "#A3A3A3" }}>Live</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Current" value={stats.current} unit={instrument.unit} icon={<Target size={18} color="#007AFF" weight="duotone" />} testId="stat-current" />
        <StatCard label="Mean" value={stats.mean} unit={instrument.unit} icon={<ChartLine size={18} color="#32ADE6" weight="duotone" />} testId="stat-mean" />
        <StatCard label="Min" value={stats.min} unit={instrument.unit} icon={<TrendDown size={18} color="#34C759" weight="duotone" />} testId="stat-min" />
        <StatCard label="Max" value={stats.max} unit={instrument.unit} icon={<TrendUp size={18} color="#FF9500" weight="duotone" />} testId="stat-max" />
        <StatCard label="Std Dev" value={stats.std_dev} unit={instrument.unit} icon={<Lightning size={18} color="#FF3B30" weight="duotone" />} testId="stat-stddev" />
      </div>

      {/* Main Chart */}
      <TimeSeriesChart chartData={chartData} instrument={instrument} thresholds={thresholds} typeLabel={typeLabel} stats={stats} range={range} />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendEnvelope chartData={chartData} unit={instrument.unit} />
        <RecentEvents alerts={recent_alerts} anomalies={recent_anomalies} />
      </div>

      {/* Compliance Band */}
      {thresholds.label && (
        <div className="grid-border p-4 mt-4" style={{ backgroundColor: "#0A0A0A" }}>
          <div className="flex items-center gap-3">
            <ClockCountdown size={20} color="#32ADE6" weight="duotone" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>{thresholds.label}</p>
              <p className="text-xs" style={{ color: "#A3A3A3" }}>
                Low: {thresholds.low} {instrument.unit} &middot; High: {thresholds.high} {instrument.unit} &middot; Baseline: {instrument.baseline} {instrument.unit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorAnalytics;
