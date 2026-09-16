import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Drop, ArrowRight, Recycle, Factory, Flask, Warning, Gauge, ArrowsClockwise, Thermometer, ChartLine } from "@phosphor-icons/react";
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Shared Sub-components ─────────────────────────────── */

const SummaryCard = ({ label, value, unit, subValue, subUnit, color, icon }) => (
  <div className="p-3 rounded-sm border" style={{ backgroundColor: "#FFFFFF", borderColor: `${color}33` }}>
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-sm" style={{ backgroundColor: `${color}15` }}>{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "#163F56" }}>{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color }}>{value}</span>
      <span className="text-[10px]" style={{ color: "#7A9AB5" }}>{unit}</span>
    </div>
    {subValue !== undefined && (
      <p className="text-[10px] mt-0.5" style={{ color: "#7A9AB5" }}>{subValue} {subUnit}</p>
    )}
  </div>
);

const EfficiencyBar = ({ label, value, color }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#163F56" }}>{label}</span>
      <span className="text-xs font-bold" style={{ color, fontFamily: "JetBrains Mono, monospace" }}>{value}%</span>
    </div>
    <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: "#E0E8F0" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  </div>
);

/* ── SVG Water Balance Flow Diagram ─────────────────────── */

const FLOW_NODES = [
  // Left: Inflows
  { id: "municipal", label: "Municipal\nSupply", x: 30, y: 50, w: 90, h: 44, color: "#1171b8", side: "left" },
  { id: "rainfall", label: "Rainfall\n/Runoff", x: 30, y: 110, w: 90, h: 44, color: "#1A8AD4", side: "left" },
  { id: "borehole", label: "Borehole\nSupply", x: 30, y: 170, w: 90, h: 44, color: "#1171b8", side: "left" },
  // Center: Process
  { id: "reservoir", label: "Main\nReservoir", x: 210, y: 80, w: 100, h: 52, color: "#1171b8", side: "center" },
  { id: "treatment", label: "Treatment\nPlant", x: 390, y: 80, w: 100, h: 52, color: "#1A8AD4", side: "center" },
  { id: "distribution", label: "Distribution\nSystem", x: 570, y: 80, w: 100, h: 52, color: "#34C759", side: "center" },
  // Right: Outflows
  { id: "cip", label: "CIP Lines", x: 740, y: 20, w: 80, h: 36, color: "#34C759", side: "right" },
  { id: "pet", label: "PET Lines", x: 740, y: 64, w: 80, h: 36, color: "#34C759", side: "right" },
  { id: "canline", label: "Canline", x: 740, y: 108, w: 80, h: 36, color: "#34C759", side: "right" },
  { id: "syrup", label: "Syrup Room", x: 740, y: 152, w: 80, h: 36, color: "#34C759", side: "right" },
  { id: "wwtp", label: "WWTP", x: 740, y: 200, w: 80, h: 36, color: "#FF9500", side: "right" },
  // Bottom: Recovery & Losses
  { id: "recovery", label: "Recovery\nSystem", x: 390, y: 210, w: 100, h: 44, color: "#AF52DE", side: "bottom" },
  { id: "evap", label: "Evaporation", x: 570, y: 210, w: 80, h: 36, color: "#FF9500", side: "bottom" },
  { id: "seepage", label: "Seepage", x: 570, y: 260, w: 80, h: 36, color: "#FF3B30", side: "bottom" },
];

const FlowDiagram = ({ data }) => {
  if (!data) return null;
  const { intake, treatment, distribution, recovery, wastewater, losses } = data;

  const connections = [
    { from: "municipal", to: "reservoir", value: intake.municipal.flow_rate, color: "#1171b8" },
    { from: "rainfall", to: "reservoir", value: intake.rainfall_runoff?.flow_rate || 0, color: "#1A8AD4" },
    { from: "borehole", to: "reservoir", value: intake.borehole?.flow_rate || 0, color: "#1171b8" },
    { from: "reservoir", to: "treatment", value: intake.total, color: "#1171b8" },
    { from: "treatment", to: "distribution", value: treatment.treated_output, color: "#1A8AD4" },
    { from: "distribution", to: "cip", value: distribution.cip_lines.flow_rate, color: "#34C759" },
    { from: "distribution", to: "pet", value: distribution.pet_lines.flow_rate, color: "#34C759" },
    { from: "distribution", to: "canline", value: distribution.canline.flow_rate, color: "#34C759" },
    { from: "distribution", to: "syrup", value: distribution.syrup_room.flow_rate, color: "#34C759" },
    { from: "distribution", to: "wwtp", value: wastewater.wwtp_output, color: "#FF9500" },
    { from: "recovery", to: "treatment", value: recovery.total, color: "#AF52DE" },
    { from: "distribution", to: "evap", value: losses.evaporation, color: "#FF9500" },
    { from: "distribution", to: "seepage", value: losses.seepage, color: "#FF3B30" },
  ];

  const nodeMap = {};
  FLOW_NODES.forEach((n) => { nodeMap[n.id] = n; });

  const getPort = (nodeId, dir) => {
    const n = nodeMap[nodeId];
    if (!n) return { x: 0, y: 0 };
    if (dir === "right") return { x: n.x + n.w, y: n.y + n.h / 2 };
    if (dir === "left") return { x: n.x, y: n.y + n.h / 2 };
    if (dir === "bottom") return { x: n.x + n.w / 2, y: n.y + n.h };
    return { x: n.x + n.w / 2, y: n.y };
  };

  const makePath = (fromId, toId) => {
    const fn = nodeMap[fromId];
    const tn = nodeMap[toId];
    if (!fn || !tn) return "";
    // Determine direction
    let start, end;
    if (fromId === "recovery" && toId === "treatment") {
      start = getPort(fromId, "top");
      end = getPort(toId, "bottom");
      return `M${start.x},${start.y} C${start.x},${start.y - 30} ${end.x},${end.y + 30} ${end.x},${end.y}`;
    }
    if (tn.x > fn.x + fn.w - 20) {
      start = getPort(fromId, "right");
      end = getPort(toId, "left");
    } else if (tn.y > fn.y + fn.h - 10) {
      start = getPort(fromId, "bottom");
      end = getPort(toId, "top");
    } else {
      start = getPort(fromId, "right");
      end = getPort(toId, "left");
    }
    const cx = (start.x + end.x) / 2;
    return `M${start.x},${start.y} C${cx},${start.y} ${cx},${end.y} ${end.x},${end.y}`;
  };

  return (
    <svg viewBox="0 0 860 310" className="w-full" style={{ minHeight: "260px" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#C9E0EF" />
        </marker>
      </defs>
      {/* Connections */}
      {connections.map((c, i) => {
        const d = makePath(c.from, c.to);
        if (!d) return null;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={`${c.color}25`} strokeWidth="8" />
            <path d={d} fill="none" stroke={c.color} strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" opacity="0.7">
              <animate attributeName="stroke-dashoffset" from="20" to="0" dur="2s" repeatCount="indefinite" />
            </path>
            {/* Flow value label at midpoint */}
            <text x="0" y="0" fill={c.color} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono, monospace" textAnchor="middle" opacity="0.9">
              <textPath href={`#fpath-${i}`} startOffset="50%">{c.value} L/min</textPath>
            </text>
            <path id={`fpath-${i}`} d={d} fill="none" stroke="none" />
          </g>
        );
      })}
      {/* Nodes */}
      {FLOW_NODES.map((n) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="3" ry="3"
            fill={`${n.color}12`} stroke={`${n.color}55`} strokeWidth="1" />
          {n.label.split("\n").map((line, li) => (
            <text key={li} x={n.x + n.w / 2} y={n.y + n.h / 2 + (li - (n.label.split("\n").length - 1) / 2) * 11}
              fill="#E0E0E0" fontSize="9" fontWeight="600" textAnchor="middle" dominantBaseline="central">
              {line}
            </text>
          ))}
        </g>
      ))}
      {/* Recovery arrow label */}
      <text x="345" y="175" fill="#AF52DE" fontSize="8" fontWeight="600" fontFamily="JetBrains Mono" textAnchor="middle" opacity="0.6">
        RECOVERY LOOP
      </text>
    </svg>
  );
};

/* ── Facility Balance Table ──────────────────────────────── */

const FacilityTable = ({ facilities }) => {
  if (!facilities?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse" data-testid="facility-balance-table">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(17,113,184,0.1)" }}>
            <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Facility</th>
            <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Inflows (L/min)</th>
            <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Outflows (L/min)</th>
            <th className="text-right py-2 px-3 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Storage (L/min)</th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((f, i) => {
            const totalIn = f.inflows.reduce((s, x) => s + x.value, 0);
            const totalOut = f.outflows.reduce((s, x) => s + x.value, 0);
            return (
              <tr key={i} style={{ borderBottom: "1px solid rgba(17,113,184,0.06)" }}>
                <td className="py-2.5 px-3 font-bold" style={{ color: "#062C60" }}>{f.name}</td>
                <td className="py-2.5 px-3" style={{ color: "#163F56" }}>
                  {f.inflows.map((fl, j) => (
                    <div key={j} className="flex justify-between mb-0.5">
                      <span>{fl.label}</span>
                      <span className="font-bold" style={{ color: "#1171b8", fontFamily: "JetBrains Mono" }}>{fl.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between mt-1 pt-1" style={{ borderTop: "1px solid rgba(17,113,184,0.08)" }}>
                    <span className="font-bold" style={{ color: "#062C60" }}>Total</span>
                    <span className="font-bold" style={{ color: "#1171b8", fontFamily: "JetBrains Mono" }}>{totalIn.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3" style={{ color: "#163F56" }}>
                  {f.outflows.map((fl, j) => (
                    <div key={j} className="flex justify-between mb-0.5">
                      <span>{fl.label}</span>
                      <span className="font-bold" style={{ color: "#FF9500", fontFamily: "JetBrains Mono" }}>{fl.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between mt-1 pt-1" style={{ borderTop: "1px solid rgba(17,113,184,0.08)" }}>
                    <span className="font-bold" style={{ color: "#062C60" }}>Total</span>
                    <span className="font-bold" style={{ color: "#FF9500", fontFamily: "JetBrains Mono" }}>{totalOut.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right align-top">
                  <span className="font-bold text-xs" style={{
                    color: f.storage_change >= 0 ? "#34C759" : "#FF3B30",
                    fontFamily: "JetBrains Mono",
                  }}>
                    {f.storage_change >= 0 ? "+" : ""}{f.storage_change}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ── Custom Tooltip for charts ───────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border p-2" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(17,113,184,0.12)" }}>
      <p className="text-[10px] font-bold mb-1" style={{ color: "#163F56" }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: "#163F56" }}>{p.name}:</span>
          <span className="font-bold" style={{ color: p.color, fontFamily: "JetBrains Mono" }}>{p.value} L/min</span>
        </div>
      ))}
    </div>
  );
};

/* ── Loss Pie Colors ─────────────────────────────────────── */
const LOSS_COLORS = ["#FF3B30", "#FF9500", "#FFD60A", "#AF52DE", "#FF6961"];

/* ── MAIN COMPONENT ─────────────────────────────────────── */

const WaterBalance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/water-balance`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch water balance:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 8000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <p className="text-sm" style={{ color: "#163F56" }}>Loading water balance...</p>
      </div>
    );
  }

  const { intake, treatment, distribution, recovery, wastewater, losses, efficiency, balance_summary, facilities, hourly_balance, quality_balance } = data;
  const bs = balance_summary || {};

  // Build loss pie data
  const lossData = [
    { name: "Treatment", value: losses.treatment || 0 },
    { name: "Evaporation", value: losses.evaporation || 0 },
    { name: "Seepage", value: losses.seepage || 0 },
    { name: "Leakage", value: losses.leak_losses || 0 },
    { name: "Unaccounted", value: losses.unaccounted || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div data-testid="water-balance-panel" className="space-y-4">

      {/* ── SECTION 1: Balance Overview ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <SummaryCard label="Total Inflows" value={bs.total_inflows || intake.total} unit="L/min"
          subValue={bs.total_inflows_m3d} subUnit="m³/d" color="#1171b8"
          icon={<Drop size={14} color="#1171b8" weight="duotone" />} />
        <SummaryCard label="Total Outflows" value={bs.total_outflows} unit="L/min"
          subValue={bs.total_outflows_m3d} subUnit="m³/d" color="#FF9500"
          icon={<ArrowRight size={14} color="#FF9500" weight="bold" />} />
        <SummaryCard label="Recovery" value={recovery.total} unit="L/min"
          color="#AF52DE" icon={<Recycle size={14} color="#AF52DE" weight="duotone" />} />
        <SummaryCard label="Production" value={distribution.total} unit="L/min"
          color="#34C759" icon={<Factory size={14} color="#34C759" weight="duotone" />} />
        <SummaryCard label="WWTP" value={wastewater.wwtp_output} unit="L/min"
          color="#FF9500" icon={<Warning size={14} color="#FF9500" weight="duotone" />} />
        <SummaryCard label="Total Losses" value={losses.total} unit="L/min"
          color="#FF3B30" icon={<Thermometer size={14} color="#FF3B30" weight="duotone" />} />
        <SummaryCard label="Storage" value={bs.change_in_storage || 0} unit="L/min"
          subValue={bs.change_in_storage_m3d} subUnit="m³/d"
          color={bs.change_in_storage >= 0 ? "#34C759" : "#FF3B30"}
          icon={<ArrowsClockwise size={14} color="#1A8AD4" weight="duotone" />} />
        <SummaryCard label="Balance Check" value={bs.balance_check_pct || 0} unit="%"
          color={bs.balance_check_pct < 5 ? "#34C759" : "#FF9500"}
          icon={<Gauge size={14} color="#34C759" weight="duotone" />} />
      </div>

      {/* ── SECTION 2: Water Balance Flow Diagram (SVG) ── */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#163F56" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1171b8" }} />
          Average Daily Water Balance (Sankey)
        </h4>
        <FlowDiagram data={data} />
      </div>

      {/* ── SECTION 3: Facility Balance + Loss Analysis ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Facility Table (2 cols wide) */}
        <div className="lg:col-span-2 rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#163F56" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1A8AD4" }} />
            Facility-Level Water Balance
          </h4>
          <FacilityTable facilities={facilities} />
        </div>

        {/* Loss Analysis Pie */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#163F56" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FF3B30" }} />
            Loss Analysis
          </h4>
          <div style={{ height: "160px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={lossData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                  {lossData.map((_, i) => <Cell key={i} fill={LOSS_COLORS[i % LOSS_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {lossData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LOSS_COLORS[i % LOSS_COLORS.length] }} />
                  <span className="text-[10px]" style={{ color: "#163F56" }}>{d.name}</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: LOSS_COLORS[i % LOSS_COLORS.length], fontFamily: "JetBrains Mono" }}>
                  {d.value} L/min
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 4: 24H Time Series ───────────────────── */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#163F56" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1171b8" }} />
          24H Water Balance Trend
        </h4>
        <div style={{ height: "220px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly_balance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E8F0" />
              <XAxis dataKey="hour" tick={{ fill: "#163F56", fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#163F56", fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: "10px", color: "#163F56" }} />
              <Area type="monotone" dataKey="inflows" name="Inflows" stroke="#1171b8" fill="#1171b822" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="outflows" name="Outflows" stroke="#FF9500" fill="#FF950022" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="losses" name="Losses" stroke="#FF3B30" fill="#FF3B3022" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="recovery" name="Recovery" stroke="#AF52DE" strokeWidth={2} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 5: Efficiency + Quality Balance ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Efficiency Gauges */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#163F56" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#34C759" }} />
            System Efficiency
          </h4>
          <div className="space-y-4">
            <EfficiencyBar label="System Efficiency" value={efficiency.system_efficiency}
              color={efficiency.system_efficiency > 90 ? "#34C759" : efficiency.system_efficiency > 80 ? "#FF9500" : "#FF3B30"} />
            <EfficiencyBar label="Water Use Ratio" value={efficiency.water_use_ratio}
              color={efficiency.water_use_ratio > 80 ? "#34C759" : "#FF9500"} />
            <EfficiencyBar label="Recovery Rate" value={efficiency.recovery_rate} color="#AF52DE" />
            <EfficiencyBar label="Loss Rate" value={efficiency.loss_rate}
              color={efficiency.loss_rate < 10 ? "#34C759" : efficiency.loss_rate < 20 ? "#FF9500" : "#FF3B30"} />
          </div>
        </div>

        {/* TDS/Salt Balance (like Barberton Section 5) */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#F4F8FC", borderColor: "rgba(17,113,184,0.1)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#163F56" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FF9500" }} />
            Quality / Salt Balance (TDS)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse" data-testid="quality-balance-table">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(17,113,184,0.1)" }}>
                  <th className="text-left py-2 px-2 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Point</th>
                  <th className="text-right py-2 px-2 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>TDS (mg/L)</th>
                  <th className="text-right py-2 px-2 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Flow (L/min)</th>
                  <th className="text-right py-2 px-2 font-bold uppercase tracking-wider" style={{ color: "#7A9AB5" }}>Salt (kg/d)</th>
                </tr>
              </thead>
              <tbody>
                {(quality_balance || []).map((q, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(17,113,184,0.06)" }}>
                    <td className="py-2 px-2 font-semibold" style={{ color: "#062C60" }}>{q.point}</td>
                    <td className="py-2 px-2 text-right font-bold" style={{ color: "#1A8AD4", fontFamily: "JetBrains Mono" }}>{q.tds_mg_l}</td>
                    <td className="py-2 px-2 text-right" style={{ color: "#163F56", fontFamily: "JetBrains Mono" }}>{q.flow_l_min}</td>
                    <td className="py-2 px-2 text-right font-bold" style={{ color: "#FF9500", fontFamily: "JetBrains Mono" }}>{q.salt_load_kg_d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterBalance;
