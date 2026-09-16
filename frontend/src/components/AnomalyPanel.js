import React from "react";
import { format } from "date-fns";
import { Lightning } from "@phosphor-icons/react";

const AnomalyPanel = ({ anomalies }) => {
  return (
    <div
      className="grid-border p-4 md:p-6"
      style={{ backgroundColor: "rgba(255,255,255,0.88)" }}
      data-testid="anomaly-panel"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightning size={24} color="#FF9500" weight="duotone" />
        <h3
          className="text-xl md:text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "Chivo, sans-serif", color: "#062C60" }}
        >
          Anomaly Detection
        </h3>
      </div>

      {anomalies.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: "#163F56" }}>
            No anomalies detected
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {anomalies.slice(0, 5).map((anomaly) => (
            <div
              key={anomaly.id}
              className="p-3 border-l-2 rounded-sm"
              style={{
                backgroundColor: "rgba(255, 149, 0, 0.05)",
                borderColor: "#FF9500",
              }}
              data-testid={`anomaly-item-${anomaly.id}`}
            >
              <div className="flex items-start justify-between mb-1">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#FF9500" }}
                >
                  {anomaly.anomaly_type}
                </span>
                <span className="text-xs" style={{ color: "#163F56" }}>
                  {format(new Date(anomaly.timestamp), "HH:mm")}
                </span>
              </div>
              <p className="text-sm text-white mb-1">{anomaly.instrument_name}</p>
              <p className="text-xs" style={{ color: "#163F56" }}>
                {anomaly.description}
              </p>
              <div className="mt-2">
                <span className="text-xs" style={{ color: "#163F56" }}>
                  Confidence:
                </span>
                <span className="text-xs ml-1 font-bold" style={{ color: "#FF9500" }}>
                  {(anomaly.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnomalyPanel;