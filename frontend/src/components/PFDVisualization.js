import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Crosshair, Drop, Scales, ChartLine, Heartbeat, Flask, Buildings, MapTrifold } from "@phosphor-icons/react";
import axios from "axios";
import WaterBalance from "./WaterBalance";
import NRWAnalytics from "./analytics/NRWAnalytics";
import DemandIntelligence from "./analytics/DemandIntelligence";
import AssetHealth from "./analytics/AssetHealth";
import WaterQualityIntelligence from "./analytics/WaterQualityIntelligence";
import GeoQuality from "./analytics/GeoQuality";
import PFDIsometric from "./PFDIsometric";
import PlantOverview from "./PlantOverview";
import DateRangeFilter from "./DateRangeFilter";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: "pfd", label: "Process Flow", icon: <Crosshair size={12} weight="bold" /> },
  { id: "plant", label: "Plant Overview", icon: <Buildings size={12} weight="bold" /> },
  { id: "balance", label: "Water Balance", icon: <Scales size={12} weight="bold" /> },
  { id: "nrw", label: "NRW Analytics", icon: <Drop size={12} weight="bold" /> },
  { id: "demand", label: "Demand", icon: <ChartLine size={12} weight="bold" /> },
  { id: "assets", label: "Asset Health", icon: <Heartbeat size={12} weight="bold" /> },
  { id: "quality", label: "Water Quality", icon: <Flask size={12} weight="bold" /> },
  { id: "geo", label: "Geo Quality", icon: <MapTrifold size={12} weight="bold" /> },
];

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 3600000);
  return {
    preset: "24H",
    startDate: start.toISOString().slice(0, 16),
    endDate: end.toISOString().slice(0, 16),
  };
};

const PFDVisualization = ({ sensors, onSensorClick }) => {
  const [leakZones, setLeakZones] = useState([]);
  const [activeView, setActiveView] = useState("pfd");
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

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

  const showDateFilter = activeView !== "pfd" && activeView !== "plant";

  return (
    <div
      className="grid-border p-4 md:p-6 relative"
      style={{ backgroundColor: "rgba(255,255,255,0.88)", minHeight: "500px" }}
      data-testid="pfd-visualization"
    >
      {/* Header Row 1: Tabs + Leaks */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center rounded-sm border overflow-hidden flex-wrap"
            style={{ borderColor: "rgba(17, 113, 184, 0.15)", backgroundColor: "#FFFFFF" }}
            data-testid="pfd-view-toggle"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor: activeView === tab.id ? "#1171b8" : "transparent",
                  color: activeView === tab.id ? "#FFFFFF" : "#163F56",
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
          {(activeView === "pfd" || activeView === "plant") && (
            <div className="flex items-center gap-2">
              <Crosshair size={16} color="#C9E0EF" />
              <span className="text-xs" style={{ color: "#163F56" }}>
                Click any tag for analytics
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Header Row 2: Date Filter (shown for analytics tabs) */}
      {showDateFilter && (
        <div className="mb-4">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      )}

      {/* Conditional View */}
      {activeView === "plant" ? (
        <PlantOverview sensors={sensors} onSensorClick={handleClick} />
      ) : activeView === "balance" ? (
        <WaterBalance dateRange={dateRange} />
      ) : activeView === "nrw" ? (
        <NRWAnalytics dateRange={dateRange} />
      ) : activeView === "demand" ? (
        <DemandIntelligence dateRange={dateRange} />
      ) : activeView === "assets" ? (
        <AssetHealth dateRange={dateRange} />
      ) : activeView === "quality" ? (
        <WaterQualityIntelligence dateRange={dateRange} />
      ) : activeView === "geo" ? (
        <GeoQuality dateRange={dateRange} />
      ) : (
        <PFDIsometric sensors={sensors} onSensorClick={handleClick} />
      )}
    </div>
  );
};

export default PFDVisualization;
