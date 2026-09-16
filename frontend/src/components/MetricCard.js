import React from "react";
import { Drop, Gauge, Warning, Broadcast } from "@phosphor-icons/react";

const iconMap = {
  drop: Drop,
  gauge: Gauge,
  warning: Warning,
  broadcast: Broadcast,
};

const MetricCard = ({ title, value, unit, icon, severity, testId }) => {
  const Icon = iconMap[icon] || Drop;
  
  const severityColors = {
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    info: "#1A8AD4",
  };

  const iconColor = severity ? severityColors[severity] : "#1171b8";

  return (
    <div
      className="grid-border p-4 md:p-6 transition-colors duration-200"
      style={{ backgroundColor: "rgba(255,255,255,0.88)" }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
            style={{ color: "#163F56" }}
          >
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className="text-3xl md:text-4xl font-black tracking-tighter"
              style={{ fontFamily: "Chivo, sans-serif", color: "#062C60" }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm" style={{ color: "#163F56" }}>
                {unit}
              </span>
            )}
          </div>
        </div>
        <Icon size={32} color={iconColor} weight="duotone" />
      </div>
    </div>
  );
};

export default MetricCard;