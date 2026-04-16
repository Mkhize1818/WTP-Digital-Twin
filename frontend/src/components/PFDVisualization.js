import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Crosshair, Drop, Scales, ChartLine, Heartbeat, Flask } from "@phosphor-icons/react";
import axios from "axios";
import WaterBalance from "./WaterBalance";
import NRWAnalytics from "./analytics/NRWAnalytics";
import DemandIntelligence from "./analytics/DemandIntelligence";
import AssetHealth from "./analytics/AssetHealth";
import WaterQualityIntelligence from "./analytics/WaterQualityIntelligence";
import PFDIsometric from "./PFDIsometric";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PFDVisualization = ({ sensors, onSensorClick }) => {
  const [leakZones, setLeakZones] = useState([]);
  const [activeView, setActiveView] = useState("pfd");

  const fetchLeaks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leaks/zones`);
      setLeakZones(res.data);
    } catch (err) { console.error("Failed to fetch leak zones:", err); }
  }, []);

  useEffect(() => {
    fetchLeaks();
    const interval = setInterval(fetchLeaks, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaks]);

  const activeLeaks = useMemo(() => leakZones.filter((z) => z.has_leak), [leakZones]);

  const handleClick = useCallback(
    (id) => { if (onSensorClick && id) onSensorClick(id); },
    [onSensorClick],
  );

  return (
    <div
      className="grid-border p-4 md:p-6 relative"
      style={{ backgroundColor: "#121212", minHeight: "500px" }}
      data-testid="pfd-visualization"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center rounded-sm border overflow-hidden flex-wrap"
            style={{ borderColor: "rgba(255, 255, 255, 0.1)", backgroundColor: "#1A1A1A" }}
            data-testid="pfd-view-toggle"
          >
            {[
              { id: "pfd", label: "Process Flow", icon: <Crosshair size={12} weight="bold" /> },
              { id: "balance", label: "Water Balance", icon: <Scales size={12} weight="bold" /> },
              { id: "nrw", label: "NRW Analytics", icon: <Drop size={12} weight="bold" /> },
              { id: "demand", label: "Demand", icon: <ChartLine size={12} weight="bold" /> },
              { id: "assets", label: "Asset Health", icon: <Heartbeat size={12} weight="bold" /> },
              { id: "quality", label: "Water Quality", icon: <Flask size={12} weight="bold" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor: activeView === tab.id ? "#007AFF" : "transparent",
                  color: activeView === tab.id ? "#FFFFFF" : "#A3A3A3",
                }}
                data-testid={`${tab.id}-tab-button`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeLeaks.length > 0 && (
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-sm animate-pulse-border"
              style={{ border: "1px solid #FF3B30" }}
              data-testid="leak-indicator-badge"
            >
              <Drop size={14} color="#FF3B30" weight="fill" />
              <span className="text-xs font-bold" style={{ color: "#FF3B30" }}>
                {activeLeaks.length} LEAK{activeLeaks.length > 1 ? "S" : ""} DETECTED
              </span>
            </div>
          )}
          {activeView === "pfd" && (
            <div className="flex items-center gap-2">
              <Crosshair size={16} color="#A3A3A3" />
              <span className="text-xs" style={{ color: "#A3A3A3" }}>
                Click any tag for analytics
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conditional View: PFD or Analytics Tabs */}
      {activeView === "balance" ? (
        <WaterBalance />
      ) : activeView === "nrw" ? (
        <NRWAnalytics />
      ) : activeView === "demand" ? (
        <DemandIntelligence />
      ) : activeView === "assets" ? (
        <AssetHealth />
      ) : activeView === "quality" ? (
        <WaterQualityIntelligence />
      ) : (
        <PFDIsometric sensors={sensors} onSensorClick={handleClick} />
      )}
    </div>
  );
};

export default PFDVisualization;
