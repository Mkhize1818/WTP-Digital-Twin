import React from "react";
import { CalendarBlank } from "@phosphor-icons/react";

const PRESETS = [
  { label: "1H", hours: 1 },
  { label: "6H", hours: 6 },
  { label: "24H", hours: 24 },
  { label: "7D", hours: 168 },
  { label: "30D", hours: 720 },
];

const DateRangeFilter = ({ dateRange, onDateRangeChange }) => {
  const { preset, startDate, endDate } = dateRange;

  const handlePreset = (p) => {
    const end = new Date();
    const start = new Date(end.getTime() - p.hours * 3600000);
    onDateRangeChange({
      preset: p.label,
      startDate: start.toISOString().slice(0, 16),
      endDate: end.toISOString().slice(0, 16),
    });
  };

  const handleCustomDate = (field, value) => {
    onDateRangeChange({
      preset: "custom",
      startDate: field === "start" ? value : startDate,
      endDate: field === "end" ? value : endDate,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="date-range-filter">
      <CalendarBlank size={14} color="#C9E0EF" weight="bold" />
      <div
        className="flex items-center rounded-sm border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#163F56" }}
      >
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className="px-2 py-1 text-[10px] font-bold transition-colors"
            style={{
              backgroundColor: preset === p.label ? "#1171b8" : "transparent",
              color: preset === p.label ? "#FFF" : "#C9E0EF",
            }}
            data-testid={`date-preset-${p.label}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        type="datetime-local"
        value={startDate || ""}
        onChange={(e) => handleCustomDate("start", e.target.value)}
        className="text-[10px] px-2 py-1 rounded-sm border outline-none"
        style={{
          backgroundColor: "#163F56",
          borderColor: preset === "custom" ? "#1171b8" : "rgba(255,255,255,0.1)",
          color: "#C9E0EF",
          maxWidth: "145px",
        }}
        data-testid="date-start-input"
      />
      <span className="text-[10px]" style={{ color: "#5A8BA8" }}>to</span>
      <input
        type="datetime-local"
        value={endDate || ""}
        onChange={(e) => handleCustomDate("end", e.target.value)}
        className="text-[10px] px-2 py-1 rounded-sm border outline-none"
        style={{
          backgroundColor: "#163F56",
          borderColor: preset === "custom" ? "#1171b8" : "rgba(255,255,255,0.1)",
          color: "#C9E0EF",
          maxWidth: "145px",
        }}
        data-testid="date-end-input"
      />
    </div>
  );
};

export default DateRangeFilter;
