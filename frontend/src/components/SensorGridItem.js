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
      className="p-3 border rounded-sm cursor-pointer hover:border-[#1171b8] transition-colors"
      style={{
        backgroundColor: "#163F56",
        borderColor: "rgba(201, 224, 239, 0.15)",
      }}
      onClick={() => onSensorClick?.(sensor.instrument_id)}
      data-testid={`sensor-card-${sensor.instrument_id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon size={20} color="#1171b8" weight="duotone" />
        <div className="flex items-center gap-2">
          <ChartLine size={14} color="#5A8BA8" />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[sensor.status] }}
          />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#C9E0EF" }}>
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
        <span className="text-xs" style={{ color: "#C9E0EF" }}>
          {sensor.unit}
        </span>
      </div>
    </div>
  );
};

export default SensorGridItem;
