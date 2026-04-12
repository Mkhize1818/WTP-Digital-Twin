import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import PFDVisualization from "../components/PFDVisualization";
import AlertsFeed from "../components/AlertsFeed";
import AIAgentPanel from "../components/AIAgentPanel";
import AnomalyPanel from "../components/AnomalyPanel";
import SensorGrid from "../components/SensorGrid";
import SensorAnalytics from "../components/SensorAnalytics";
import ComplianceExport from "../components/ComplianceExport";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, sensorsRes, alertsRes, anomaliesRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/sensors/latest`),
        axios.get(`${API}/alerts?acknowledged=false`),
        axios.get(`${API}/anomalies`),
      ]);

      setStats(statsRes.data);
      setSensors(sensorsRes.data);
      setAlerts(alertsRes.data);
      setAnomalies(anomaliesRes.data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to fetch system data");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSensorClick = useCallback((instrumentId) => {
    setSelectedSensor(instrumentId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackToPFD = useCallback(() => {
    setSelectedSensor(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-[#A3A3A3]">Loading Digital Twin...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <Header />

      <main className="p-6 md:p-8">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          <MetricCard
            title="Total Flow"
            value={stats?.total_flow || 0}
            unit="L/min"
            icon="drop"
            testId="metric-card-flow"
          />
          <MetricCard
            title="Avg Pressure"
            value={stats?.avg_pressure || 0}
            unit="bar"
            icon="gauge"
            testId="metric-card-pressure"
          />
          <MetricCard
            title="Active Alerts"
            value={stats?.active_alerts || 0}
            unit=""
            icon="warning"
            severity={stats?.active_alerts > 0 ? "error" : "success"}
            testId="metric-card-alerts"
          />
          <MetricCard
            title="Sensors Online"
            value={`${stats?.online_sensors}/${stats?.total_sensors}`}
            unit=""
            icon="broadcast"
            testId="metric-card-sensors"
          />
        </div>

        {/* Conditional: Analytics View or Main Dashboard */}
        {selectedSensor ? (
          <SensorAnalytics
            instrumentId={selectedSensor}
            onBack={handleBackToPFD}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="lg:col-span-3 lg:row-span-2">
              <PFDVisualization
                sensors={sensors}
                onSensorClick={handleSensorClick}
              />
            </div>
            <div className="lg:col-span-1 lg:row-span-2">
              <AIAgentPanel />
            </div>
            <div className="lg:col-span-2">
              <SensorGrid sensors={sensors} onSensorClick={handleSensorClick} />
            </div>
            <div className="lg:col-span-2">
              <AnomalyPanel anomalies={anomalies} />
            </div>
            <div className="lg:col-span-4">
              <AlertsFeed alerts={alerts} onRefresh={fetchData} />
            </div>
            <div className="lg:col-span-4">
              <ComplianceExport />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
