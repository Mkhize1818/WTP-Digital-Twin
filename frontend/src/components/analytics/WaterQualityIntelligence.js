import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Flask, ShieldCheck, Warning, TrendDown, Broadcast } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_COLORS = { compliant: "#34C759", "non-compliant": "#FF3B30", normal: "#34C759", alarm: "#FF3B30" };
const SEVERITY_COLORS = { critical: "#FF3B30", warning: "#FF9500", info: "#1A8AD4" };
const TREND_COLORS = { stable: "#34C759", degrading: "#FF3B30", improving: "#1A8AD4" };

const SectionHeader = ({ icon, title, color }) => (
  <div className="flex items-center gap-2 mb-3">
    {icon}
    <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>{title}</h4>
  </div>
);

const WaterQualityIntelligence = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/analytics/water-quality`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Water quality fetch error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><p className="text-sm" style={{ color: "#C9E0EF" }}>Loading water quality...</p></div>;
  }

  const { quality_parameters, decay_curve, spatial_quality, contamination_events, predictions, summary } = data;

  return (
    <div className="space-y-5" data-testid="water-quality-analytics">
      {/* Status Banner */}
      <div
        className="flex items-center justify-between p-3 rounded-sm border"
        style={{
          backgroundColor: summary.overall_status === "compliant" ? "#34C75908" : "#FF3B3008",
          borderColor: summary.overall_status === "compliant" ? "#34C75933" : "#FF3B3033",
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} color={STATUS_COLORS[summary.overall_status]} weight="fill" />
          <span className="text-sm font-bold" style={{ color: STATUS_COLORS[summary.overall_status] }}>
            System: {summary.overall_status === "compliant" ? "COMPLIANT" : "NON-COMPLIANT"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span style={{ color: "#C9E0EF" }}>Zones: {summary.compliant_zones}/{summary.total_zones}</span>
          <span style={{ color: "#C9E0EF" }}>Params: {summary.parameters_in_spec}/{summary.total_parameters}</span>
          <span style={{ color: summary.active_events > 0 ? "#FF9500" : "#C9E0EF" }}>{summary.active_events} active events</span>
        </div>
      </div>

      {/* Live Quality Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quality_parameters.map((param) => (
          <div key={param.id} className="p-3 rounded-sm border" style={{ backgroundColor: "#163F56", borderColor: param.in_spec ? "#34C75933" : "#FF3B3055" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#C9E0EF" }}>{param.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase" style={{
                backgroundColor: param.in_spec ? "#34C75915" : "#FF3B3015",
                color: param.in_spec ? "#34C759" : "#FF3B30",
              }}>
                {param.status}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-black tracking-tighter" style={{ fontFamily: "Chivo, sans-serif", color: param.in_spec ? "#FFFFFF" : "#FF3B30" }}>
                {param.value}
              </span>
              <span className="text-[10px]" style={{ color: "#5A8BA8" }}>{param.unit}</span>
            </div>
            {/* Range bar */}
            <div className="relative h-1.5 rounded-full" style={{ backgroundColor: "#252525" }}>
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: `${(param.low_limit / (param.high_limit * 1.3)) * 100}%`,
                  right: `${100 - (param.high_limit / (param.high_limit * 1.3)) * 100}%`,
                  backgroundColor: "#34C75933",
                }}
              />
              <div
                className="absolute w-2 h-2 rounded-full -top-[1px]"
                style={{
                  left: `${Math.min(100, (param.value / (param.high_limit * 1.3)) * 100)}%`,
                  transform: "translateX(-50%)",
                  backgroundColor: param.in_spec ? "#34C759" : "#FF3B30",
                  boxShadow: `0 0 4px ${param.in_spec ? "#34C759" : "#FF3B30"}`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[8px]" style={{ color: "#5A8BA8" }}>
              <span>{param.low_limit}</span>
              <span>{param.high_limit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chlorine Decay Model */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<TrendDown size={16} color="#34C759" weight="duotone" />} title="Chlorine Decay Model" color="#C9E0EF" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={decay_curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
              <XAxis dataKey="distance_m" tick={{ fontSize: 9, fill: "#5A8BA8" }} label={{ value: "Distance (m)", position: "bottom", offset: -5, style: { fontSize: 9, fill: "#5A8BA8" } }} />
              <YAxis tick={{ fontSize: 9, fill: "#5A8BA8" }} domain={[0, "auto"]} />
              <Tooltip contentStyle={{ backgroundColor: "#163F56", border: "1px solid #333", fontSize: 11, color: "#FFF" }} />
              <ReferenceLine y={0.2} stroke="#FF3B30" strokeDasharray="5 5" label={{ value: "Min Required", position: "right", style: { fontSize: 8, fill: "#FF3B30" } }} />
              <Line type="monotone" dataKey="chlorine_mg_l" name="Chlorine (mg/L)" stroke="#34C759" strokeWidth={2} dot={{ r: 3, fill: "#34C759" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Spatial Quality Map */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Broadcast size={16} color="#1A8AD4" weight="duotone" />} title="Spatial Quality Grid" color="#C9E0EF" />
          <div className="space-y-2">
            {spatial_quality.map((zone) => (
              <div key={zone.id} className="p-2.5 rounded-sm border" style={{ backgroundColor: "#0B1D3A", borderColor: zone.status === "compliant" ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.25)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white">{zone.name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase" style={{
                    backgroundColor: zone.status === "compliant" ? "#34C75915" : "#FF3B3015",
                    color: STATUS_COLORS[zone.status],
                  }}>
                    {zone.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span style={{ color: "#5A8BA8" }}>pH</span>
                    <p className="font-bold" style={{ color: 6.5 <= zone.ph && zone.ph <= 8.5 ? "#34C759" : "#FF3B30" }}>{zone.ph}</p>
                  </div>
                  <div>
                    <span style={{ color: "#5A8BA8" }}>Cl (mg/L)</span>
                    <p className="font-bold" style={{ color: 0.5 <= zone.chlorine && zone.chlorine <= 1.2 ? "#34C759" : "#FF3B30" }}>{zone.chlorine}</p>
                  </div>
                  <div>
                    <span style={{ color: "#5A8BA8" }}>EC (uS/cm)</span>
                    <p className="font-bold" style={{ color: 200 <= zone.conductivity && zone.conductivity <= 800 ? "#34C759" : "#FF3B30" }}>{zone.conductivity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contamination Events */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Warning size={16} color="#FF9500" weight="duotone" />} title="Contamination Event Log" color="#C9E0EF" />
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {contamination_events.map((event) => (
              <div key={event.id} className="p-2 rounded-sm flex items-start gap-2" style={{ backgroundColor: "#0B1D3A" }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: SEVERITY_COLORS[event.severity] }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white">{event.type}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm" style={{
                      backgroundColor: event.resolved ? "#34C75915" : "#FF950015",
                      color: event.resolved ? "#34C759" : "#FF9500",
                    }}>
                      {event.resolved ? "Resolved" : "Active"}
                    </span>
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: "#C9E0EF" }}>{event.zone} | {event.duration_hours}h | {event.source_trace}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Predictions */}
        <div className="rounded-sm border p-4" style={{ backgroundColor: "#091A30", borderColor: "rgba(255,255,255,0.08)" }}>
          <SectionHeader icon={<Flask size={16} color="#AF52DE" weight="duotone" />} title="Predictive Quality Degradation" color="#C9E0EF" />
          <div className="space-y-3">
            {predictions.map((pred) => (
              <div key={pred.parameter} className="p-2.5 rounded-sm" style={{ backgroundColor: "#0B1D3A" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-white">{pred.parameter}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase" style={{
                    backgroundColor: `${TREND_COLORS[pred.trend]}15`,
                    color: TREND_COLORS[pred.trend],
                  }}>
                    {pred.trend}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: "#C9E0EF" }}>Current: {pred.current_value}</span>
                  {pred.hours_to_breach && (
                    <span style={{ color: "#FF3B30" }}>Breach in ~{pred.hours_to_breach}h</span>
                  )}
                  <span style={{ color: "#5A8BA8" }}>Conf: {(pred.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterQualityIntelligence;
