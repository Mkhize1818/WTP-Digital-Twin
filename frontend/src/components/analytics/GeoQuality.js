import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { MapPin, Warning, CheckCircle, ArrowDown, Gauge } from "@phosphor-icons/react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ZONE_COLORS = {
  intake: "#1171b8", treatment: "#0E5A94", storage: "#34C759",
  production: "#FF9500", recovery: "#AF52DE", wwtp: "#CF222E",
  runoff: "#D4820A", groundwater: "#163F56",
};

const RISK_COLORS = { normal: "#2DA44E", warning: "#D4820A", critical: "#CF222E" };

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border p-2 shadow-sm" style={{ backgroundColor: "#FFFFFFEE", borderColor: "rgba(17,113,184,0.15)" }}>
      <p className="text-[10px] font-bold mb-1" style={{ color: "#062C60" }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: "#163F56" }}>{p.name}:</span>
          <span className="font-bold" style={{ color: p.color, fontFamily: "JetBrains Mono" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const ZoneCard = ({ zone }) => {
  const [expanded, setExpanded] = useState(false);
  const riskColor = RISK_COLORS[zone.risk_level];
  const zoneColor = ZONE_COLORS[zone.zone_type] || "#1171b8";

  return (
    <div className="rounded-md border p-3" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(17,113,184,0.12)" }} data-testid={`geo-zone-${zone.id}`}>
      <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zoneColor }} />
          <div>
            <h4 className="text-xs font-bold" style={{ color: "#062C60" }}>{zone.name}</h4>
            <p className="text-[9px]" style={{ color: "#7A9AB5" }}>{zone.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-black" style={{ color: riskColor, fontFamily: "Chivo" }}>{zone.env_score}</div>
            <div className="text-[8px] font-bold uppercase" style={{ color: "#7A9AB5" }}>Score</div>
          </div>
          {zone.violations > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${riskColor}12`, border: `1px solid ${riskColor}33` }}>
              <Warning size={10} color={riskColor} weight="bold" />
              <span className="text-[9px] font-bold" style={{ color: riskColor }}>{zone.violations}</span>
            </div>
          )}
          {zone.violations === 0 && <CheckCircle size={16} color="#2DA44E" weight="fill" />}
          <ArrowDown size={12} color="#7A9AB5" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(17,113,184,0.08)" }}>
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(17,113,184,0.08)" }}>
                <th className="text-left py-1 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Parameter</th>
                <th className="text-right py-1 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Value</th>
                <th className="text-right py-1 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Limit</th>
                <th className="text-right py-1 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>% of Limit</th>
              </tr>
            </thead>
            <tbody>
              {zone.parameters.map((p) => (
                <tr key={p.param_id} style={{ borderBottom: "1px solid rgba(17,113,184,0.04)" }}>
                  <td className="py-1 font-semibold" style={{ color: "#062C60" }}>{p.name}</td>
                  <td className="py-1 text-right font-bold" style={{ color: p.in_limit ? "#062C60" : "#CF222E", fontFamily: "JetBrains Mono" }}>
                    {p.value} <span style={{ color: "#7A9AB5", fontWeight: 400 }}>{p.unit}</span>
                  </td>
                  <td className="py-1 text-right" style={{ color: "#7A9AB5", fontFamily: "JetBrains Mono" }}>{typeof p.env_limit === "number" ? `≤${p.env_limit}` : p.env_limit}</td>
                  <td className="py-1 text-right">
                    <span className="font-bold px-1 py-0.5 rounded-sm" style={{
                      color: RISK_COLORS[p.severity],
                      backgroundColor: `${RISK_COLORS[p.severity]}10`,
                      fontFamily: "JetBrains Mono",
                    }}>{p.pct_of_limit}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const GeoQuality = ({ dateRange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/analytics/geo-quality`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch geo quality:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return <div className="flex items-center justify-center" style={{ minHeight: "300px" }}><p style={{ color: "#1171b8" }}>Loading Geo Quality data...</p></div>;
  }

  const { zones, env_trends, summary } = data;
  const scoreColor = summary.avg_env_score >= 75 ? "#2DA44E" : summary.avg_env_score >= 50 ? "#D4820A" : "#CF222E";

  return (
    <div className="space-y-4" data-testid="geo-quality-panel">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: "Avg Env Score", v: summary.avg_env_score, u: "/100", c: scoreColor, icon: <Gauge size={14} color={scoreColor} weight="duotone" /> },
          { l: "Compliance Rate", v: `${summary.compliance_rate}%`, u: "", c: summary.compliance_rate >= 90 ? "#2DA44E" : "#D4820A", icon: <CheckCircle size={14} color="#2DA44E" weight="duotone" /> },
          { l: "Zones Checked", v: `${summary.compliant_zones}/${summary.total_zones}`, u: "compliant", c: "#1171b8", icon: <MapPin size={14} color="#1171b8" weight="duotone" /> },
          { l: "Violations", v: summary.total_violations, u: "", c: summary.total_violations === 0 ? "#2DA44E" : "#CF222E", icon: <Warning size={14} color="#CF222E" weight="duotone" /> },
          { l: "Params Checked", v: summary.total_parameters_checked, u: "", c: "#163F56", icon: <Gauge size={14} color="#163F56" weight="duotone" /> },
        ].map((card, i) => (
          <div key={i} className="p-3 rounded-md border" style={{ backgroundColor: "#FFFFFF", borderColor: `${card.c}22` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 rounded-sm" style={{ backgroundColor: `${card.c}10` }}>{card.icon}</div>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "#7A9AB5" }}>{card.l}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "Chivo", color: card.c }}>{card.v}</span>
              {card.u && <span className="text-[10px]" style={{ color: "#7A9AB5" }}>{card.u}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Spatial Map + Zone Risk Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spatial Plant Map */}
        <div className="rounded-md border p-4" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(17,113,184,0.12)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#062C60" }}>
            <MapPin size={14} color="#1171b8" weight="duotone" /> Spatial Quality Map
          </h4>
          <svg viewBox="0 0 100 100" className="w-full" style={{ minHeight: "260px", background: "#F4F8FC", borderRadius: "4px" }}>
            {/* Grid lines */}
            {[20, 40, 60, 80].map(v => (
              <g key={v}>
                <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(17,113,184,0.06)" strokeWidth="0.3" />
                <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(17,113,184,0.06)" strokeWidth="0.3" />
              </g>
            ))}
            {/* Zone circles */}
            {zones.map((z) => {
              const col = RISK_COLORS[z.risk_level];
              const r = z.radius / 10;
              return (
                <g key={z.id}>
                  <circle cx={z.x} cy={z.y} r={r} fill={`${col}15`} stroke={col} strokeWidth="0.4" strokeDasharray="2 1" />
                  <circle cx={z.x} cy={z.y} r="1.5" fill={col} />
                  <text x={z.x} y={z.y - r - 1.5} fill="#062C60" fontSize="2.8" fontWeight="700" textAnchor="middle">{z.name}</text>
                  <text x={z.x} y={z.y + 1} fill={col} fontSize="3.5" fontWeight="900" textAnchor="middle" fontFamily="Chivo">{z.env_score}</text>
                  {z.violations > 0 && (
                    <text x={z.x} y={z.y + 4} fill="#CF222E" fontSize="2" fontWeight="700" textAnchor="middle">{z.violations} violation{z.violations > 1 ? "s" : ""}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Zone Risk Bar Chart */}
        <div className="rounded-md border p-4" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(17,113,184,0.12)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#062C60" }}>
            <Gauge size={14} color="#1171b8" weight="duotone" /> Environmental Scores by Zone
          </h4>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zones} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E8F0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#163F56", fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#062C60", fontSize: 8, fontWeight: 600 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="env_score" name="Env Score" radius={[0, 3, 3, 0]} barSize={14}>
                  {zones.map((z, i) => <Cell key={i} fill={RISK_COLORS[z.risk_level]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* WWTP Discharge Trends */}
      <div className="rounded-md border p-4" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(17,113,184,0.12)" }}>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#062C60" }}>
          <Warning size={14} color="#CF222E" weight="duotone" /> 24H WWTP Discharge Trends (Environmental Impact)
        </h4>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={env_trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E8F0" />
              <XAxis dataKey="hour" tick={{ fill: "#163F56", fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#163F56", fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: "10px", color: "#062C60" }} />
              <Area type="monotone" dataKey="tds_wwtp" name="TDS (mg/L)" stroke="#1171b8" fill="#1171b818" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="bod_wwtp" name="BOD₅ (mg/L)" stroke="#CF222E" fill="#CF222E18" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="cod_wwtp" name="COD (mg/L)" stroke="#D4820A" fill="#D4820A18" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="tss_wwtp" name="TSS (mg/L)" stroke="#AF52DE" fill="#AF52DE18" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone Detail Cards */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#062C60" }}>
          <MapPin size={14} color="#1171b8" weight="duotone" /> Zone-by-Zone Environmental Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {zones.map((z) => <ZoneCard key={z.id} zone={z} />)}
        </div>
      </div>
    </div>
  );
};

export default GeoQuality;
