import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Wrench, Heartbeat, Timer, HardDrives } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GRADE_COLORS = { A: "#34C759", B: "#1A8AD4", C: "#FF9500", D: "#FF3B30" };
const RISK_COLORS = { low: "#34C759", medium: "#FF9500", high: "#FF3B30" };

const SectionHeader = ({ icon, title, color }) => (
  <div className="flex items-center gap-2 mb-3">
    {icon}
    <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>{title}</h4>
  </div>
);

const AssetHealth = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/analytics/asset-health`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Asset health fetch error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><p className="text-sm" style={{ color: "#163F56" }}>Loading asset health...</p></div>;
  }

  const { assets, break_history, maintenance_schedule, summary } = data;

  return (
    <div className="space-y-5" data-testid="asset-health-analytics">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Avg Condition", value: summary.avg_condition_score, unit: "/100", color: summary.avg_condition_score >= 60 ? "#34C759" : "#FF9500" },
          { label: "High Risk", value: summary.high_risk_count, unit: `/ ${summary.total_assets}`, color: summary.high_risk_count > 3 ? "#FF3B30" : "#FF9500" },
          { label: "Avg RUL", value: `${summary.avg_rul_years}`, unit: "years", color: "#1A8AD4" },
          { label: "Breaks (12mo)", value: summary.total_breaks_12m, unit: "events", color: "#AF52DE" },
        ].map((card) => (
          <div key={card.label} className="p-3 rounded-sm border" style={{ backgroundColor: "#FFFFFF", borderColor: `${card.color}33` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#163F56" }}>{card.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color: card.color }}>{card.value}</span>
              <span className="text-[10px]" style={{ color: "#7A9AB5" }}>{card.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Asset Condition Table */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
        <SectionHeader icon={<Heartbeat size={16} color="#34C759" weight="duotone" />} title="Asset Condition & Failure Probability" color="#163F56" />
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ color: "#7A9AB5" }}>
                <th className="text-left py-2 px-2">Asset</th>
                <th className="text-left py-2 px-2">Material</th>
                <th className="text-center py-2 px-2">Age</th>
                <th className="text-center py-2 px-2">Score</th>
                <th className="text-center py-2 px-2">Grade</th>
                <th className="text-center py-2 px-2">RUL</th>
                <th className="text-center py-2 px-2">Fail Prob</th>
                <th className="text-center py-2 px-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {assets.sort((a, b) => b.failure_probability - a.failure_probability).map((asset) => (
                <tr key={asset.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <td className="py-2 px-2">
                    <p className="font-bold text-white">{asset.name}</p>
                    <p style={{ color: "#7A9AB5" }}>{asset.length_m}m | {asset.diameter_mm}mm</p>
                  </td>
                  <td className="py-2 px-2" style={{ color: "#163F56" }}>{asset.material}</td>
                  <td className="text-center py-2 px-2" style={{ color: "#163F56" }}>{asset.age_years}yr</td>
                  <td className="text-center py-2 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: "#252525" }}>
                        <div className="h-full rounded-full" style={{ width: `${asset.condition_score}%`, backgroundColor: GRADE_COLORS[asset.condition_grade] }} />
                      </div>
                      <span style={{ color: GRADE_COLORS[asset.condition_grade] }}>{asset.condition_score}</span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className="px-1.5 py-0.5 rounded-sm font-bold" style={{ backgroundColor: `${GRADE_COLORS[asset.condition_grade]}15`, color: GRADE_COLORS[asset.condition_grade] }}>
                      {asset.condition_grade}
                    </span>
                  </td>
                  <td className="text-center py-2 px-2" style={{ color: "#1A8AD4" }}>{asset.rul_years}yr</td>
                  <td className="text-center py-2 px-2">
                    <span style={{ color: RISK_COLORS[asset.risk_level] }}>{(asset.failure_probability * 100).toFixed(0)}%</span>
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase" style={{ backgroundColor: `${RISK_COLORS[asset.risk_level]}15`, color: RISK_COLORS[asset.risk_level] }}>
                      {asset.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Break History */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <SectionHeader icon={<HardDrives size={16} color="#AF52DE" weight="duotone" />} title="Break History (12 Months)" color="#163F56" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={break_history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#163F56" }} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: "#163F56" }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(17,113,184,0.2)", fontSize: 11, color: "#062C60" }} />
              <Bar dataKey="breaks" name="Breaks" radius={[3, 3, 0, 0]}>
                {break_history.map((entry, i) => (
                  <Cell key={i} fill={entry.breaks >= 3 ? "#FF3B30" : (entry.breaks >= 2 ? "#FF9500" : "#AF52DE")} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Maintenance Schedule */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <SectionHeader icon={<Wrench size={16} color="#1171b8" weight="duotone" />} title="Predictive Maintenance Schedule" color="#163F56" />
          <div className="space-y-2">
            {maintenance_schedule.map((item) => (
              <div key={item.asset_id} className="p-2.5 rounded-sm border" style={{ backgroundColor: "rgba(255,255,255,0.88)", borderColor: item.type === "urgent" ? "#FF3B3033" : "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-white">{item.asset_name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase" style={{
                    backgroundColor: item.type === "urgent" ? "#FF3B3015" : "#1171b815",
                    color: item.type === "urgent" ? "#FF3B30" : "#1171b8",
                  }}>
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: "#163F56" }}>
                    <Timer size={10} weight="bold" className="inline mr-1" />
                    {item.scheduled_date}
                  </span>
                  <span style={{ color: "#7A9AB5" }}>Est. R{item.estimated_cost.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetHealth;
