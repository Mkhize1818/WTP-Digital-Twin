import React from "react";
import { Drop, Gauge, Flask } from "@phosphor-icons/react";

const SensorGrid = ({ sensors }) => {
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

  const statusColors = {
    online: "#34C759",
    warning: "#FF9500",
    offline: "#FF3B30",
  };

  return (
    <div
      className="grid-border p-4 md:p-6"
      style={{ backgroundColor: "#121212" }}
      data-testid="sensor-grid"
    >
      <h3
        className="text-xl md:text-2xl font-semibold tracking-tight mb-4"
        style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
      >
        Instrumentation
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {sensors.map((sensor) => {
          const Icon = getIcon(sensor.type);
          return (
            <div
              key={sensor.id}
              className="p-3 border rounded-sm"
              style={{
                backgroundColor: "#1A1A1A",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
              data-testid={`sensor-card-${sensor.instrument_id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon size={20} color="#007AFF" weight="duotone" />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColors[sensor.status] }}
                />
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
        })}
      </div>
    </div>
  );
};

export default SensorGrid;