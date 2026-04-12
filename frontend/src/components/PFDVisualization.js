import React, { useState } from "react";
import { Crosshair } from "@phosphor-icons/react";

const PFDVisualization = ({ sensors, onSensorClick }) => {
  const [hoveredSensor, setHoveredSensor] = useState(null);

  const getSensorStatus = (instrumentId) => {
    const sensor = sensors.find((s) => s.instrument_id === instrumentId);
    return sensor?.status || "offline";
  };

  const statusColors = {
    online: "#34C759",
    warning: "#FF9500",
    offline: "#FF3B30",
  };

  const instrumentPositions = [
    { id: "FIT_10", x: "15%", y: "35%" },
    { id: "FIT_8", x: "70%", y: "75%" },
    { id: "FIT_6", x: "50%", y: "85%" },
    { id: "PIT_M1", x: "35%", y: "15%" },
    { id: "PIT_M2", x: "25%", y: "30%" },
    { id: "PIT_M3", x: "45%", y: "45%" },
    { id: "pH_001", x: "55%", y: "55%" },
    { id: "CL_001", x: "62%", y: "50%" },
    { id: "EC_001", x: "68%", y: "55%" },
    { id: "LIT_001", x: "20%", y: "20%" },
  ];

  const handleClick = (sensor) => {
    if (onSensorClick && sensor) {
      onSensorClick(sensor.instrument_id);
    }
  };

  return (
    <div
      className="grid-border p-4 md:p-6 relative"
      style={{ backgroundColor: "#121212", minHeight: "500px" }}
      data-testid="pfd-visualization"
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-xl md:text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
        >
          Process Flow Diagram
        </h3>
        <div className="flex items-center gap-2">
          <Crosshair size={16} color="#A3A3A3" />
          <span className="text-xs" style={{ color: "#A3A3A3" }}>
            Click any sensor for analytics
          </span>
        </div>
      </div>

      <div className="relative w-full" style={{ minHeight: "450px" }}>
        <img
          src="https://customer-assets.emergentagent.com/job_08778319-680e-4dcc-9637-79a56dea1c9a/artifacts/z7wc49hm_CCBA%20Digital%20Twin.png"
          alt="Process Flow Diagram"
          className="w-full h-auto opacity-90"
          style={{ filter: "brightness(0.9)" }}
        />

        {instrumentPositions.map((pos) => {
          const status = getSensorStatus(pos.id);
          const sensor = sensors.find((s) => s.instrument_id === pos.id);
          const isHovered = hoveredSensor?.instrument_id === pos.id;

          return (
            <div
              key={pos.id}
              className="absolute cursor-pointer group"
              style={{
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => setHoveredSensor(sensor)}
              onMouseLeave={() => setHoveredSensor(null)}
              onClick={() => handleClick(sensor)}
              data-testid={`pfd-sensor-${pos.id}`}
            >
              {/* Outer ring on hover */}
              <div
                className="absolute rounded-full transition-all duration-200"
                style={{
                  width: isHovered ? "24px" : "12px",
                  height: isHovered ? "24px" : "12px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: isHovered
                    ? `${statusColors[status]}33`
                    : "transparent",
                  border: isHovered
                    ? `1px solid ${statusColors[status]}88`
                    : "none",
                }}
              />
              {/* Core dot */}
              <div
                className="w-3 h-3 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: statusColors[status],
                  boxShadow: `0 0 10px ${statusColors[status]}`,
                  transform: isHovered ? "scale(1.3)" : "scale(1)",
                  animation:
                    status === "offline"
                      ? "pulse 2s ease-in-out infinite"
                      : "none",
                }}
              />
            </div>
          );
        })}

        {/* Tooltip */}
        {hoveredSensor && (
          <div
            className="absolute z-10 p-3 rounded-sm border pointer-events-none"
            style={{
              backgroundColor: "#1A1A1A",
              borderColor: "#007AFF",
              left: "50%",
              top: "10px",
              transform: "translateX(-50%)",
              minWidth: "220px",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-white">
                {hoveredSensor.instrument_name}
              </p>
              <span
                className="text-xs uppercase font-bold"
                style={{ color: statusColors[hoveredSensor.status] }}
              >
                {hoveredSensor.status}
              </span>
            </div>
            <p
              className="text-xs mb-2"
              style={{ color: "#A3A3A3", fontFamily: "JetBrains Mono, monospace" }}
            >
              {hoveredSensor.instrument_id}
            </p>
            <div className="flex items-baseline gap-1 mb-2">
              <span
                className="text-xl font-black tracking-tighter"
                style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
              >
                {hoveredSensor.value}
              </span>
              <span className="text-xs" style={{ color: "#A3A3A3" }}>
                {hoveredSensor.unit}
              </span>
            </div>
            <div
              className="text-xs flex items-center gap-1 pt-2 border-t"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "#007AFF" }}
            >
              <Crosshair size={12} />
              Click to view analytics
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PFDVisualization;
