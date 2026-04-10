import React, { useState, useEffect } from "react";
import { Warning, CheckCircle, XCircle } from "@phosphor-icons/react";

const PFDVisualization = ({ sensors }) => {
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

  return (
    <div
      className="grid-border p-4 md:p-6 relative"
      style={{ backgroundColor: "#121212", minHeight: "500px" }}
      data-testid="pfd-visualization"
    >
      <h3
        className="text-xl md:text-2xl font-semibold tracking-tight mb-4"
        style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
      >
        Process Flow Diagram
      </h3>
      
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
          
          return (
            <div
              key={pos.id}
              className="absolute cursor-pointer transition-transform hover:scale-125"
              style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredSensor(sensor)}
              onMouseLeave={() => setHoveredSensor(null)}
              data-testid={`pfd-sensor-${pos.id}`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: statusColors[status],
                  boxShadow: `0 0 10px ${statusColors[status]}`,
                  animation: status === "offline" ? "pulse 2s ease-in-out infinite" : "none",
                }}
              />
            </div>
          );
        })}
        
        {hoveredSensor && (
          <div
            className="absolute z-10 p-3 rounded border"
            style={{
              backgroundColor: "#1A1A1A",
              borderColor: "rgba(255, 255, 255, 0.2)",
              left: "50%",
              top: "10px",
              transform: "translateX(-50%)",
              minWidth: "200px",
            }}
          >
            <p className="text-sm font-semibold text-white mb-1">
              {hoveredSensor.instrument_name}
            </p>
            <p className="text-xs text-[#A3A3A3] mb-1">{hoveredSensor.instrument_id}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">
                {hoveredSensor.value} {hoveredSensor.unit}
              </span>
              <span
                className="text-xs uppercase font-bold"
                style={{ color: statusColors[hoveredSensor.status] }}
              >
                {hoveredSensor.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PFDVisualization;