import React from "react";
import { format } from "date-fns";
import { WarningCircle, XCircle, Info, CheckCircle } from "@phosphor-icons/react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AlertsFeed = ({ alerts, onRefresh }) => {
  const handleAcknowledge = async (alertId) => {
    try {
      await axios.post(`${API}/alerts/${alertId}/acknowledge`);
      toast.success("Alert acknowledged");
      onRefresh();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast.error("Failed to acknowledge alert");
    }
  };

  const severityConfig = {
    critical: { icon: XCircle, color: "#FF3B30", bg: "rgba(255, 59, 48, 0.1)" },
    warning: { icon: WarningCircle, color: "#FF9500", bg: "rgba(255, 149, 0, 0.1)" },
    info: { icon: Info, color: "#32ADE6", bg: "rgba(50, 173, 230, 0.1)" },
  };

  return (
    <div
      className="grid-border p-4 md:p-6"
      style={{ backgroundColor: "#121212" }}
      data-testid="alerts-feed"
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-xl md:text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
        >
          Active Alerts
        </h3>
        <span
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: "#A3A3A3" }}
        >
          {alerts.length} Active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <CheckCircle size={48} color="#34C759" weight="duotone" />
            <p className="text-sm mt-2" style={{ color: "#A3A3A3" }}>
              No active alerts
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className="p-3 border rounded-sm flex items-start gap-3"
                style={{
                  backgroundColor: config.bg,
                  borderColor: config.color,
                }}
                data-testid={`alert-item-${alert.id}`}
              >
                <Icon size={24} color={config.color} weight="duotone" />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: config.color }}
                      >
                        {alert.type}
                      </span>
                      {alert.instrument_name && (
                        <span className="text-xs ml-2" style={{ color: "#A3A3A3" }}>
                          {alert.instrument_name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: "#A3A3A3" }}>
                      {format(new Date(alert.timestamp), "HH:mm:ss")}
                    </span>
                  </div>
                  <p className="text-sm text-white mb-2">{alert.message}</p>
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="text-xs px-3 py-1 rounded-sm font-medium hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: "#007AFF",
                      color: "#FFFFFF",
                    }}
                    data-testid={`acknowledge-alert-${alert.id}`}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsFeed;