import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import { Warning, Drop, Gauge, ChartLine } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_COLORS = { critical: "#FF3B30", warning: "#FF9500", normal: "#34C759", info: "#1A8AD4" };

const SectionHeader = ({ icon, title, color }) => (
  <div className="flex items-center gap-2 mb-3">
    {icon}
    <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>{title}</h4>
  </div>
);

const NRWAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/analytics/nrw`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("NRW fetch error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><p className="text-sm" style={{ color: "#C9E0EF" }}>Loading NRW analytics...</p></div>;
  }

  const { hourly_balance, dma_analysis, mnf_profile, mnf_baseline, loss_separation, pipe_risk, anomaly_flags } = data;

  return (
    <div className="space-y-5" data-testid="nrw-analytics">
      {/* Anomaly Flags */}
      {anomaly_flags.length > 0 && (
        <div className="space-y-2">
          {anomaly_flags.map((flag, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-sm border" style={{ borderColor: SEVERITY_COLORS[flag.severity] + "55", backgroundColor: SEVERITY_COLORS[flag.severity] + "0D" }}>
              <Warning size={14} color={SEVERITY_COLORS[flag.severity]} weight="fill" />
              <span className="text-xs font-bold" style={{ color: SEVERITY_COLORS[flag.severity] }}>{flag.zone}</span>
              <span className="text-xs" style={{ color: "#C9E0EF" }}>{flag.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input vs Consumption vs Losses */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
        <SectionHeader icon={<ChartLine size={16} color="#1171b8" weight="duotone" />} title="24H Water Balance: Input vs Consumption vs Losses" color="#C9E0EF" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hourly_balance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#5A8BA8" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#5A8BA8" }} />
            <Tooltip contentStyle={{ backgroundColor: "#163F56", border: "1px solid #333", fontSize: 11, color: "#FFF" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="input" name="Input" stroke="#1171b8" fill="#1171b822" strokeWidth={2} />
            <Area type="monotone" dataKey="consumption" name="Consumption" stroke="#34C759" fill="#34C75922" strokeWidth={2} />
            <Area type="monotone" dataKey="losses" name="Losses" stroke="#FF3B30" fill="#FF3B3022" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DMA Analysis */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Drop size={16} color="#1A8AD4" weight="duotone" />} title="District Metered Area (DMA) Analysis" color="#C9E0EF" />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dma_analysis.map((dma) => (
              <div key={dma.id} className="flex items-center justify-between p-2 rounded-sm" style={{ backgroundColor: "#0B1D3A" }}>
                <div>
                  <p className="text-xs font-bold text-white">{dma.name}</p>
                  <p className="text-[10px]" style={{ color: "#5A8BA8" }}>{dma.pipe_km} km | {dma.material} | {dma.age_years}yr</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: SEVERITY_COLORS[dma.severity] }}>{dma.loss_pct}%</p>
                    <p className="text-[10px]" style={{ color: "#5A8BA8" }}>{dma.loss_volume} L/min</p>
                  </div>
                  <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: "#252525" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, dma.loss_pct * 4)}%`, backgroundColor: SEVERITY_COLORS[dma.severity] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MNF Profile */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Gauge size={16} color="#AF52DE" weight="duotone" />} title={`Minimum Night Flow (Baseline: ${mnf_baseline} L/min)`} color="#C9E0EF" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mnf_profile}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#5A8BA8" }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: "#5A8BA8" }} />
              <Tooltip contentStyle={{ backgroundColor: "#163F56", border: "1px solid #333", fontSize: 11, color: "#FFF" }} />
              <Area type="monotone" dataKey="flow" stroke="#AF52DE" fill="#AF52DE22" strokeWidth={2} />
              <Line type="monotone" dataKey={() => mnf_baseline} stroke="#FF3B30" strokeDasharray="5 5" strokeWidth={1} dot={false} name="MNF Baseline" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loss Separation */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Warning size={16} color="#FF9500" weight="duotone" />} title="Apparent vs Real Loss Separation" color="#C9E0EF" />
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={[
                  { name: "Meter Inaccuracy", value: loss_separation.apparent.meter_inaccuracy },
                  { name: "Unauthorized", value: loss_separation.apparent.unauthorized },
                  { name: "Pipe Leaks", value: loss_separation.real.pipe_leaks },
                  { name: "Overflow", value: loss_separation.real.overflow },
                ]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  <Cell fill="#FF9500" />
                  <Cell fill="#FFD60A" />
                  <Cell fill="#FF3B30" />
                  <Cell fill="#FF6961" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#163F56", border: "1px solid #333", fontSize: 11, color: "#FFF" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between p-2 rounded-sm" style={{ backgroundColor: "#0B1D3A" }}>
                <span className="text-[10px] font-bold" style={{ color: "#FF9500" }}>Apparent Loss</span>
                <span className="text-xs font-bold text-white">{loss_separation.apparent.total} L/min</span>
              </div>
              <div className="pl-3 space-y-1">
                <div className="flex justify-between text-[10px]"><span style={{ color: "#C9E0EF" }}>Meter inaccuracy</span><span style={{ color: "#FF9500" }}>{loss_separation.apparent.meter_inaccuracy}</span></div>
                <div className="flex justify-between text-[10px]"><span style={{ color: "#C9E0EF" }}>Unauthorized</span><span style={{ color: "#FFD60A" }}>{loss_separation.apparent.unauthorized}</span></div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm" style={{ backgroundColor: "#0B1D3A" }}>
                <span className="text-[10px] font-bold" style={{ color: "#FF3B30" }}>Real Loss</span>
                <span className="text-xs font-bold text-white">{loss_separation.real.total} L/min</span>
              </div>
              <div className="pl-3 space-y-1">
                <div className="flex justify-between text-[10px]"><span style={{ color: "#C9E0EF" }}>Pipe leaks</span><span style={{ color: "#FF3B30" }}>{loss_separation.real.pipe_leaks}</span></div>
                <div className="flex justify-between text-[10px]"><span style={{ color: "#C9E0EF" }}>Overflow</span><span style={{ color: "#FF6961" }}>{loss_separation.real.overflow}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipe Leak Probability */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Drop size={16} color="#FF3B30" weight="duotone" />} title="Leak Probability per Pipe Segment" color="#C9E0EF" />
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {pipe_risk.sort((a, b) => b.leak_probability - a.leak_probability).map((pipe) => (
              <div key={pipe.id} className="flex items-center gap-3 p-2 rounded-sm" style={{ backgroundColor: "#0B1D3A" }}>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-white">{pipe.name}</p>
                  <p className="text-[9px]" style={{ color: "#5A8BA8" }}>{pipe.material} | {pipe.diameter_mm}mm | {pipe.age_years}yr</p>
                </div>
                <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: "#252525" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pipe.leak_probability * 100}%`, backgroundColor: pipe.risk_level === "high" ? "#FF3B30" : (pipe.risk_level === "medium" ? "#FF9500" : "#34C759") }} />
                </div>
                <span className="text-[10px] font-bold w-10 text-right" style={{ color: pipe.risk_level === "high" ? "#FF3B30" : (pipe.risk_level === "medium" ? "#FF9500" : "#34C759") }}>
                  {(pipe.leak_probability * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NRWAnalytics;
