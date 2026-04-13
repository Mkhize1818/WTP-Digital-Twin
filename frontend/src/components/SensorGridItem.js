import React from "react";
import { Drop, Gauge, Flask, ChartLine } from "@phosphor-icons/react";

const STATUS_COLORS = {
  online: "#34C759",
  warning: "#FF9500",
  offline: "#FF3B30",
};

const getIcon = (type) => {
  switch (type) {
    case "flow":
      return Drop;
    case "pressure":
      return Gauge;
    default:
      return Flask;
  }
};

const SensorGridItem = ({ sensor, onSensorClick }) => {
  const Icon = getIcon(sensor.type);
  return (
    <div
      className="p-3 border rounded-sm cursor-pointer hover:border-[#007AFF] transition-colors"
      style={{
        backgroundColor: "#1A1A1A",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      onClick={() => onSensorClick?.(sensor.instrument_id)}
      data-testid={`sensor-card-${sensor.instrument_id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon size={20} color="#007AFF" weight="duotone" />
        <div className="flex items-center gap-2">
          <ChartLine size={14} color="#525252" />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[sensor.status] }}
          />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#A3A3A3" }}>
        {sensor.instrument_id}
      </p>
      <p className="text-sm text-white mb-2">{sensor.instrument_name}</p>
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-black tracking-tighter"
          style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
        >
          {sensor.value}
        </span>
        <span className="text-xs" style={{ color: "#A3A3A3" }}>
          {sensor.unit}
        </span>
      </div>
    </div>
  );
};

export default SensorGridItem;
