import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowLeft, ChartLine, TrendUp, TrendDown, Lightning, Target,
  ClockCountdown, FileCsv, FilePdf, Clock, CalendarBlank,
} from "@phosphor-icons/react";
import { TimeSeriesChart, TrendEnvelope, RecentEvents } from "./analytics/ChartPanels";
import { exportCSV, exportPDF } from "../utils/exportSensorReport";
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
  <div className="grid-border p-3" style={{ backgroundColor: "#163F56" }} data-testid={testId}>
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "#C9E0EF" }}>{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}>{value}</span>
      <span className="text-xs" style={{ color: "#5A8BA8" }}>{unit}</span>
    </div>
  </div>
);

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
      <div className="grid-border p-6 flex items-center justify-center" style={{ backgroundColor: "#0B1D3A", minHeight: "600px" }}>
        <p className="text-[#C9E0EF]">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid-border p-6" style={{ backgroundColor: "#0B1D3A" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4 hover:text-white transition-colors" style={{ color: "#C9E0EF" }} data-testid="analytics-back-button">
          <ArrowLeft size={18} /> Back to PFD
        </button>
        <p className="text-[#C9E0EF]">No data available.</p>
      </div>
    );
  }

  const { instrument, stats, thresholds, recent_alerts, recent_anomalies } = data;
  const typeLabel = TYPE_LABELS[instrument.type] || instrument.type;

  return (
    <div className="grid-border p-4 md:p-6" style={{ backgroundColor: "#0B1D3A" }} data-testid="sensor-analytics-panel">

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-sm border hover:border-[#1171b8] transition-colors"
            style={{ backgroundColor: "#163F56", borderColor: "rgba(201, 224, 239, 0.15)", color: "#C9E0EF" }}
            data-testid="analytics-back-button"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to PFD</span>
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}>
              {instrument.name}
            </h2>
            <p className="text-sm" style={{ color: "#C9E0EF" }}>
              {instrument.id} &middot; {typeLabel}
            </p>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Preset Range Buttons */}
          <div className="flex items-center rounded-sm border overflow-hidden" style={{ borderColor: "rgba(201, 224, 239, 0.15)", backgroundColor: "#163F56" }} data-testid="range-selector">
            <div className="flex items-center gap-1 px-2" style={{ color: "#5A8BA8" }}>
              <Clock size={14} />
            </div>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handlePresetRange(r.value)}
                className="px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: range === r.value && !customDateRange ? "#1171b8" : "transparent",
                  color: range === r.value && !customDateRange ? "#FFFFFF" : "#C9E0EF",
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
                  borderColor: customDateRange ? "#1171b8" : "rgba(201, 224, 239, 0.15)",
                  color: customDateRange ? "#FFFFFF" : "#C9E0EF",
                  backgroundColor: customDateRange ? "#1171b8" : "#163F56",
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
              style={{ backgroundColor: "#163F56", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#C9E0EF" }}>
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
                    head_cell: "text-[#C9E0EF] rounded-md w-8 font-normal text-[0.8rem]",
                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[#1171b833] [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md [&:has(>.day-range-end)]:rounded-r-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                    day: "h-8 w-8 p-0 font-normal text-white hover:bg-[#1171b833] rounded-sm transition-colors",
                    day_selected: "bg-[#1171b8] text-white hover:bg-[#1171b8] focus:bg-[#1171b8]",
                    day_today: "bg-[#163F56] text-[#1171b8] border border-[#1171b8]",
                    day_outside: "text-[#5A8BA8] opacity-50",
                    day_disabled: "text-[#5A8BA8] opacity-30",
                    day_range_start: "day-range-start",
                    day_range_end: "day-range-end",
                    day_range_middle: "aria-selected:bg-[#1171b822] aria-selected:text-white",
                    day_hidden: "invisible",
                  }}
                />
                {customDateRange?.from && !customDateRange?.to && (
                  <p className="text-xs mt-2 text-center" style={{ color: "#C9E0EF" }}>
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
            style={{ borderColor: "rgba(201, 224, 239, 0.15)", color: "#34C759", backgroundColor: "#163F56" }}
            data-testid="export-csv-button"
          >
            <FileCsv size={16} weight="duotone" /> CSV
          </button>
          <button
            onClick={() => exportPDF(data, rangeLabel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium hover:border-[#FF3B30] transition-colors"
            style={{ borderColor: "rgba(201, 224, 239, 0.15)", color: "#FF3B30", backgroundColor: "#163F56" }}
            data-testid="export-pdf-button"
          >
            <FilePdf size={16} weight="duotone" /> PDF
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#34C759" }} />
            <span className="text-xs" style={{ color: "#C9E0EF" }}>Live</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Current" value={stats.current} unit={instrument.unit} icon={<Target size={18} color="#1171b8" weight="duotone" />} testId="stat-current" />
        <StatCard label="Mean" value={stats.mean} unit={instrument.unit} icon={<ChartLine size={18} color="#1A8AD4" weight="duotone" />} testId="stat-mean" />
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
        <div className="grid-border p-4 mt-4" style={{ backgroundColor: "#062C60" }}>
          <div className="flex items-center gap-3">
            <ClockCountdown size={20} color="#1A8AD4" weight="duotone" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>{thresholds.label}</p>
              <p className="text-xs" style={{ color: "#C9E0EF" }}>
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
