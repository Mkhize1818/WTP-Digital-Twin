import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useDashboardData() {
  const [stats, setStats] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return { stats, sensors, alerts, anomalies, loading, fetchData };
}
