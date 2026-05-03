import React from "react";
import SensorGridItem from "./SensorGridItem";

const SensorGrid = ({ sensors, onSensorClick }) => {
  return (
    <div
      className="grid-border p-4 md:p-6"
      style={{ backgroundColor: "#0B1D3A" }}
      data-testid="sensor-grid"
    >
      <h3
        className="text-xl md:text-2xl font-semibold tracking-tight mb-4"
        style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
      >
        Instrumentation
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {sensors.map((sensor) => (
          <SensorGridItem
            key={sensor.id}
            sensor={sensor}
            onSensorClick={onSensorClick}
          />
        ))}
      </div>
    </div>
  );
};

export default SensorGrid;
