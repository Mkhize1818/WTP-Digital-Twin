import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowLeft, ChartLine, TrendUp, TrendDown, Lightning, Target,
  ClockCountdown, FileCsv, FilePdf, Clock, CalendarBlank,
} from "@phosphor-icons/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TimeSeriesChart, TrendEnvelope, RecentEvents } from "./analytics/ChartPanels";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

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

function exportCSV(data, rangeLabel) {
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
  a.download = `${instrument.id}_analytics_${rangeLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(data, rangeLabel) {
  const { instrument, stats, thresholds, recent_alerts } = data;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(0, 122, 255);
  doc.text("Digital Twin - Sensor Analytics Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}  |  Range: ${rangeLabel}`, 14, 28);
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
  doc.save(`${instrument.id}_report_${rangeLabel}.pdf`);
}

/* ── Main Component ─────────────────────────────────────── */

const SensorAnalytics = ({ instrumentId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [customDateRange, setCustomDateRange] = useState(null); // { from: Date, to: Date }
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      let url = `${API}/sensors/${instrumentId}/analytics`;
      if (customDateRange?.from && customDateRange?.to) {
        const startISO = customDateRange.from.toISOString();
        const endISO = customDateRange.to.toISOString();
        url += `?start_date=${encodeURIComponent(startISO)}&end_date=${encodeURIComponent(endISO)}`;
      } else {
        url += `?time_range=${range}`;
      }
      const res = await axios.get(url);
      setData(res.data);
      setLoading(false);
    } catch (_) {
      setLoading(false);
    }
  }, [instrumentId, range, customDateRange]);

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

  const handlePresetRange = useCallback((val) => {
    setRange(val);
    setCustomDateRange(null);
  }, []);

  const handleDateSelect = useCallback((dateRange) => {
    setCustomDateRange(dateRange);
    if (dateRange?.from && dateRange?.to) {
      setRange("custom");
      setCalendarOpen(false);
    }
  }, []);

  const clearCustomRange = useCallback(() => {
    setCustomDateRange(null);
    setRange("all");
  }, []);

  const rangeLabel = customDateRange?.from && customDateRange?.to
    ? `${format(customDateRange.from, "dd MMM")} - ${format(customDateRange.to, "dd MMM")}`
    : range.toUpperCase();

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

        {/* Controls Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Preset Range Buttons */}
          <div className="flex items-center rounded-sm border overflow-hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)", backgroundColor: "#1A1A1A" }} data-testid="range-selector">
            <div className="flex items-center gap-1 px-2" style={{ color: "#525252" }}>
              <Clock size={14} />
            </div>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handlePresetRange(r.value)}
                className="px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: range === r.value && !customDateRange ? "#007AFF" : "transparent",
                  color: range === r.value && !customDateRange ? "#FFFFFF" : "#A3A3A3",
                }}
                data-testid={`range-${r.value}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Calendar Date Range Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors"
                style={{
                  borderColor: customDateRange ? "#007AFF" : "rgba(255, 255, 255, 0.1)",
                  color: customDateRange ? "#FFFFFF" : "#A3A3A3",
                  backgroundColor: customDateRange ? "#007AFF" : "#1A1A1A",
                }}
                data-testid="calendar-picker-button"
              >
                <CalendarBlank size={14} weight="duotone" />
                {customDateRange?.from && customDateRange?.to
                  ? `${format(customDateRange.from, "dd MMM")} - ${format(customDateRange.to, "dd MMM")}`
                  : "Custom Range"
                }
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="end"
              style={{ backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A3A3A3" }}>
                    Select Date Range
                  </span>
                  {customDateRange && (
                    <button
                      onClick={clearCustomRange}
                      className="text-xs px-2 py-0.5 rounded-sm hover:opacity-80"
                      style={{ color: "#FF3B30", backgroundColor: "rgba(255,59,48,0.1)" }}
                      data-testid="clear-date-range"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                  className="rounded-sm"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium text-white",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white border border-[rgba(255,255,255,0.1)] rounded-sm",
                    head_cell: "text-[#A3A3A3] rounded-md w-8 font-normal text-[0.8rem]",
                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[#007AFF33] [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md [&:has(>.day-range-end)]:rounded-r-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                    day: "h-8 w-8 p-0 font-normal text-white hover:bg-[#007AFF33] rounded-sm transition-colors",
                    day_selected: "bg-[#007AFF] text-white hover:bg-[#007AFF] focus:bg-[#007AFF]",
                    day_today: "bg-[#1A1A1A] text-[#007AFF] border border-[#007AFF]",
                    day_outside: "text-[#525252] opacity-50",
                    day_disabled: "text-[#525252] opacity-30",
                    day_range_start: "day-range-start",
                    day_range_end: "day-range-end",
                    day_range_middle: "aria-selected:bg-[#007AFF22] aria-selected:text-white",
                    day_hidden: "invisible",
                  }}
                />
                {customDateRange?.from && !customDateRange?.to && (
                  <p className="text-xs mt-2 text-center" style={{ color: "#A3A3A3" }}>
                    Select end date
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Export Buttons */}
          <button
            onClick={() => exportCSV(data, rangeLabel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium hover:border-[#34C759] transition-colors"
            style={{ borderColor: "rgba(255, 255, 255, 0.1)", color: "#34C759", backgroundColor: "#1A1A1A" }}
            data-testid="export-csv-button"
          >
            <FileCsv size={16} weight="duotone" /> CSV
          </button>
          <button
            onClick={() => exportPDF(data, rangeLabel)}
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
      <TimeSeriesChart chartData={chartData} instrument={instrument} thresholds={thresholds} typeLabel={typeLabel} stats={stats} range={rangeLabel} />

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
