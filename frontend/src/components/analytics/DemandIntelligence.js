import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Area, AreaChart, PieChart, Pie, Cell,
} from "recharts";
import { TrendUp, ChartBar, Users, Thermometer } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEGMENT_COLORS = ["#1171b8", "#34C759", "#FF9500", "#AF52DE", "#1A8AD4"];

const SectionHeader = ({ icon, title, color }) => (
  <div className="flex items-center gap-2 mb-3">
    {icon}
    <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>{title}</h4>
  </div>
);

const DemandIntelligence = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/analytics/demand`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Demand fetch error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><p className="text-sm" style={{ color: "#163F56" }}>Loading demand analytics...</p></div>;
  }

  const { forecast, heatmap, segments, seasonal_trend, summary } = data;

  // Build heatmap grid (7 days x 24 hours)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxHeatVal = Math.max(...heatmap.map(h => h.value));

  return (
    <div className="space-y-5" data-testid="demand-analytics">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Current Demand", value: `${summary.current_demand} L/min`, color: "#1171b8" },
          { label: "Predicted Peak", value: `${summary.predicted_peak} L/min`, color: "#FF9500" },
          { label: "24h Average", value: `${summary.avg_daily} L/min`, color: "#34C759" },
        ].map((card) => (
          <div key={card.label} className="p-3 rounded-sm border" style={{ backgroundColor: "#FFFFFF", borderColor: `${card.color}33` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#163F56" }}>{card.label}</p>
            <p className="text-lg font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Demand Forecast */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
        <SectionHeader icon={<TrendUp size={16} color="#1171b8" weight="duotone" />} title="24H Demand Forecast (Actual vs Predicted)" color="#163F56" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#163F56" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#163F56" }} />
            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(17,113,184,0.2)", fontSize: 11, color: "#062C60" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="upper_bound" stroke="none" fill="#1171b811" />
            <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#1171b811" />
            <Line type="monotone" dataKey="predicted" stroke="#1171b8" strokeWidth={2} dot={false} name="Predicted" />
            <Line type="monotone" dataKey="actual" stroke="#34C759" strokeWidth={2} dot={false} name="Actual" strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peak Demand Heatmap */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <SectionHeader icon={<ChartBar size={16} color="#FF9500" weight="duotone" />} title="Peak Demand Heatmap" color="#163F56" />
          <div className="overflow-x-auto">
            <div className="flex items-center gap-0.5 mb-1">
              <div style={{ width: 28 }} />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-center" style={{ width: 16, fontSize: 7, color: "#7A9AB5" }}>
                  {h % 4 === 0 ? `${h}` : ""}
                </div>
              ))}
            </div>
            {days.map((day) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span style={{ width: 28, fontSize: 8, color: "#163F56" }}>{day}</span>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = heatmap.find(c => c.day === day && c.hour === h);
                  const intensity = cell ? cell.value / maxHeatVal : 0;
                  return (
                    <div
                      key={h}
                      title={`${day} ${h}:00 — ${cell?.value} L/min`}
                      style={{
                        width: 16, height: 14, borderRadius: 1,
                        backgroundColor: `rgba(0, 122, 255, ${intensity * 0.9 + 0.05})`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 mt-2">
              <span style={{ fontSize: 8, color: "#7A9AB5" }}>Low</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                  <div key={v} style={{ width: 12, height: 8, borderRadius: 1, backgroundColor: `rgba(0,122,255,${v})` }} />
                ))}
              </div>
              <span style={{ fontSize: 8, color: "#7A9AB5" }}>High</span>
            </div>
          </div>
        </div>

        {/* Consumer Segmentation */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <SectionHeader icon={<Users size={16} color="#AF52DE" weight="duotone" />} title="Consumer Segmentation" color="#163F56" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={segments} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="share_pct">
                  {segments.map((_, i) => <Cell key={i} fill={SEGMENT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(17,113,184,0.2)", fontSize: 11, color: "#062C60" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {segments.map((seg, i) => (
                <div key={seg.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[i] }} />
                    <span className="text-[10px]" style={{ color: "#163F56" }}>{seg.name}</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: SEGMENT_COLORS[i] }}>{seg.share_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Trend */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
        <SectionHeader icon={<Thermometer size={16} color="#FF9500" weight="duotone" />} title="Seasonal Usage & Temperature Trend" color="#163F56" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={seasonal_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#163F56" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#163F56" }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#FF9500" }} />
            <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(17,113,184,0.2)", fontSize: 11, color: "#062C60" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="avg_demand" name="Avg Demand (L/min)" fill="#1171b8" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="peak_demand" name="Peak Demand" fill="#1171b844" radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="temperature" name="Temp (C)" stroke="#FF9500" strokeWidth={2} dot={{ r: 3, fill: "#FF9500" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DemandIntelligence;
