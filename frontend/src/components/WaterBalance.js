import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Drop, ArrowRight, Recycle, Factory, Flask, Warning, Gauge } from "@phosphor-icons/react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/* ── Summary Stat Card ──────────────────────────────────── */
const BalanceCard = ({ label, value, unit, color, icon, subtext, testId }) => (
  <div
    className="p-3 rounded-sm border"
    style={{ backgroundColor: "#1A1A1A", borderColor: `${color}33` }}
    data-testid={testId}
  >
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-sm" style={{ backgroundColor: `${color}15` }}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "#A3A3A3" }}>
        {label}
      </span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: "#525252" }}>{unit}</span>
    </div>
    {subtext && (
      <p className="text-[10px] mt-1" style={{ color: "#525252" }}>{subtext}</p>
    )}
  </div>
);

/* ── Flow Arrow ─────────────────────────────────────────── */
const FlowArrow = ({ from, to, value, color, style: customStyle }) => (
  <div className="flex items-center gap-1" style={customStyle}>
    <span className="text-[9px] font-bold" style={{ color: "#A3A3A3" }}>{from}</span>
    <div className="flex items-center gap-0.5">
      <div className="h-[2px] w-4" style={{ backgroundColor: color }} />
      <ArrowRight size={10} color={color} weight="bold" />
    </div>
    <span className="text-[9px] font-bold" style={{ color }}>
      {value} L/min
    </span>
    <div className="flex items-center gap-0.5">
      <div className="h-[2px] w-4" style={{ backgroundColor: color }} />
      <ArrowRight size={10} color={color} weight="bold" />
    </div>
    <span className="text-[9px] font-bold" style={{ color: "#A3A3A3" }}>{to}</span>
  </div>
);

/* ── Flow Node ──────────────────────────────────────────── */
const FlowNode = ({ label, value, unit, color, isLarge }) => (
  <div
    className="flex flex-col items-center justify-center rounded-sm border text-center"
    style={{
      backgroundColor: `${color}0D`,
      borderColor: `${color}44`,
      padding: isLarge ? "12px 16px" : "8px 12px",
      minWidth: isLarge ? "120px" : "90px",
    }}
  >
    <span className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#A3A3A3" }}>
      {label}
    </span>
    <span
      className={`font-black tracking-tighter ${isLarge ? "text-xl" : "text-sm"}`}
      style={{ fontFamily: "Chivo, sans-serif", color }}
    >
      {value}
    </span>
    <span className="text-[9px]" style={{ color: "#525252" }}>{unit}</span>
  </div>
);

/* ── Connector Line ─────────────────────────────────────── */
const Connector = ({ color, width = 40, thickness = 2, dashed }) => (
  <div className="flex items-center">
    <div
      style={{
        width: `${width}px`,
        height: `${thickness}px`,
        backgroundColor: dashed ? "transparent" : color,
        borderTop: dashed ? `${thickness}px dashed ${color}` : "none",
      }}
    />
    <ArrowRight size={12} color={color} weight="bold" />
  </div>
);

/* ── Distribution Row ───────────────────────────────────── */
const DistributionItem = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-1.5 px-2 rounded-sm" style={{ backgroundColor: "#0A0A0A" }}>
    <span className="text-[10px]" style={{ color: "#A3A3A3" }}>{label}</span>
    <span className="text-xs font-bold" style={{ color, fontFamily: "JetBrains Mono, monospace" }}>
      {value} <span style={{ color: "#525252", fontWeight: 400 }}>L/min</span>
    </span>
  </div>
);

/* ── Efficiency Gauge ───────────────────────────────────── */
const EfficiencyGauge = ({ label, value, color }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A3A3A3" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color, fontFamily: "JetBrains Mono, monospace" }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: "#252525" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clampedValue}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────── */
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
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <p className="text-sm" style={{ color: "#A3A3A3" }}>Loading water balance...</p>
      </div>
    );
  }

  const { intake, treatment, distribution, recovery, wastewater, losses, efficiency } = data;

  return (
    <div data-testid="water-balance-panel">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <BalanceCard
          label="Municipal Intake"
          value={intake.municipal.flow_rate}
          unit="L/min"
          color="#007AFF"
          icon={<Drop size={16} color="#007AFF" weight="duotone" />}
          subtext="FIT_10 · Main Feed"
          testId="wb-card-intake"
        />
        <BalanceCard
          label="Treated Output"
          value={treatment.treated_output}
          unit="L/min"
          color="#32ADE6"
          icon={<Flask size={16} color="#32ADE6" weight="duotone" />}
          subtext={`${treatment.loss_pct}% treatment loss`}
          testId="wb-card-treated"
        />
        <BalanceCard
          label="Production"
          value={distribution.total}
          unit="L/min"
          color="#34C759"
          icon={<Factory size={16} color="#34C759" weight="duotone" />}
          subtext="CIP + PET + Can + Syrup"
          testId="wb-card-production"
        />
        <BalanceCard
          label="Recovery"
          value={recovery.total}
          unit="L/min"
          color="#AF52DE"
          icon={<Recycle size={16} color="#AF52DE" weight="duotone" />}
          subtext="Nano + Backwash"
          testId="wb-card-recovery"
        />
        <BalanceCard
          label="Wastewater"
          value={wastewater.wwtp_output}
          unit="L/min"
          color="#FF9500"
          icon={<Warning size={16} color="#FF9500" weight="duotone" />}
          subtext="WWTP Output"
          testId="wb-card-wastewater"
        />
        <BalanceCard
          label="Total Losses"
          value={losses.total}
          unit="L/min"
          color="#FF3B30"
          icon={<Gauge size={16} color="#FF3B30" weight="duotone" />}
          subtext={`Incl. ${losses.leak_losses} leak loss`}
          testId="wb-card-losses"
        />
      </div>

      {/* Flow Diagram */}
      <div className="rounded-sm border p-4 md:p-6 mb-4" style={{ backgroundColor: "#0D0D0D", borderColor: "rgba(255,255,255,0.08)" }}>
        <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "#A3A3A3" }}>
          System Flow Diagram
        </h4>

        {/* Main horizontal flow */}
        <div className="flex items-center justify-between gap-2 mb-6 overflow-x-auto pb-2">
          <FlowNode label="Municipal" value={intake.total} unit="L/min" color="#007AFF" isLarge />
          <Connector color="#007AFF" width={30} />
          <FlowNode label="Treatment" value={treatment.treated_output} unit="L/min" color="#32ADE6" isLarge />
          <Connector color="#32ADE6" width={30} />
          <FlowNode label="Distribution" value={distribution.total} unit="L/min" color="#34C759" isLarge />
          <Connector color="#34C759" width={20} dashed />
          <FlowNode label="Production" value={distribution.total} unit="L/min" color="#34C759" isLarge />
        </div>

        {/* Bottom detail rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Distribution Breakdown */}
          <div className="rounded-sm border p-3" style={{ backgroundColor: "#121212", borderColor: "rgba(52,199,89,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Factory size={14} color="#34C759" weight="duotone" />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#34C759" }}>
                Production Lines
              </span>
            </div>
            <div className="space-y-1.5">
              <DistributionItem label="CIP Lines" value={distribution.cip_lines.flow_rate} color="#34C759" />
              <DistributionItem label="PET Lines" value={distribution.pet_lines.flow_rate} color="#34C759" />
              <DistributionItem label="Canline" value={distribution.canline.flow_rate} color="#34C759" />
              <DistributionItem label="Syrup Room" value={distribution.syrup_room.flow_rate} color="#34C759" />
            </div>
          </div>

          {/* Recovery Breakdown */}
          <div className="rounded-sm border p-3" style={{ backgroundColor: "#121212", borderColor: "rgba(175,82,222,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Recycle size={14} color="#AF52DE" weight="duotone" />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#AF52DE" }}>
                Water Recovery
              </span>
            </div>
            <div className="space-y-1.5">
              <DistributionItem label="Nano Recovery 1" value={recovery.nano_recovery_1.flow_rate} color="#AF52DE" />
              <DistributionItem label="Nano Recovery 2" value={recovery.nano_recovery_2.flow_rate} color="#AF52DE" />
              <DistributionItem label="Backwash Recovery" value={recovery.backwash.flow_rate} color="#AF52DE" />
            </div>
            <FlowArrow from="Recovery" to="Treatment" value={recovery.total} color="#AF52DE" style={{ marginTop: "8px" }} />
          </div>

          {/* Losses + Wastewater */}
          <div className="rounded-sm border p-3" style={{ backgroundColor: "#121212", borderColor: "rgba(255,59,48,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Warning size={14} color="#FF9500" weight="duotone" />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF9500" }}>
                Outflows & Losses
              </span>
            </div>
            <div className="space-y-1.5">
              <DistributionItem label="WWTP Output" value={wastewater.wwtp_output} color="#FF9500" />
              <DistributionItem label="Treatment Loss" value={losses.treatment} color="#FF3B30" />
              <DistributionItem label="Leak Losses" value={losses.leak_losses} color="#FF3B30" />
              <DistributionItem label="Unaccounted" value={losses.unaccounted} color="#FF3B30" />
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Gauges */}
      <div className="rounded-sm border p-4" style={{ backgroundColor: "#0D0D0D", borderColor: "rgba(255,255,255,0.08)" }}>
        <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#A3A3A3" }}>
          System Efficiency
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <EfficiencyGauge
            label="System Efficiency"
            value={efficiency.system_efficiency}
            color={efficiency.system_efficiency > 90 ? "#34C759" : efficiency.system_efficiency > 80 ? "#FF9500" : "#FF3B30"}
          />
          <EfficiencyGauge
            label="Water Use Ratio"
            value={efficiency.water_use_ratio}
            color={efficiency.water_use_ratio > 80 ? "#34C759" : "#FF9500"}
          />
          <EfficiencyGauge
            label="Recovery Rate"
            value={efficiency.recovery_rate}
            color="#AF52DE"
          />
          <EfficiencyGauge
            label="Loss Rate"
            value={efficiency.loss_rate}
            color={efficiency.loss_rate < 10 ? "#34C759" : efficiency.loss_rate < 20 ? "#FF9500" : "#FF3B30"}
          />
        </div>
      </div>
    </div>
  );
};

export default WaterBalance;
