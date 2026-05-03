import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";

/* ── Equipment definitions (matching the reference 3D schematic) ─── */
const EQUIPMENT = [
  // ZONE A: Main reservoir & outdoor area
  { id:"LIT_MR", x:-14, z:-10, w:4, d:4, h:4.5, col:"#2a5f9e", label:"Main Reservoir (500m³)", tank:true },
  { id:"LIT_RT4", x:2, z:-10, w:2.5, d:2.5, h:3, col:"#2a7fbf", label:"Reservoir T4 (117m³)", tank:true },
  { id:"FIT_10", x:-9, z:-10, w:0.8, d:0.8, h:0.8, col:"#e08020", label:"Pump M1 (FIT_10)" },
  { id:"m2", x:-11, z:-10, w:0.8, d:0.8, h:0.8, col:"#e08020", label:"Pump M2" },
  { id:"m3", x:-14, z:-7, w:0.8, d:0.8, h:0.8, col:"#e08020", label:"Pump M3" },
  // ZONE B: Red tanks & backwash
  { id:"LIT_RR2", x:-14, z:-3, w:2, d:2, h:3.5, col:"#c03020", label:"Red Reservoir 1", tank:true },
  { id:"red2", x:-11, z:-3, w:2, d:2, h:3.5, col:"#c03020", label:"Red Reservoir 2", tank:true },
  { id:"LIT_STW", x:-7, z:-3, w:2.5, d:2, h:2.8, col:"#2a7fbf", label:"Semi-Treated (35m³)", tank:true },
  { id:"LIT_BRT", x:-14, z:0, w:2.5, d:2, h:2.5, col:"#4a9f6e", label:"Backwash Recovery", tank:true },
  { id:"LIT_HT", x:-11, z:0, w:2.5, d:2, h:2.2, col:"#4a8060", label:"Holding Tank (60m³)", tank:true },
  { id:"m4", x:-8, z:0, w:0.8, d:0.8, h:0.8, col:"#e08020", label:"Pump M4" },
  // ZONE C: NACF Filters
  { id:"PIT_NACF1", x:-14, z:3, w:2.5, d:2, h:2.8, col:"#8a5fc0", label:"NACF 3 (25m³)" },
  { id:"PIT_NACF2", x:-11, z:3, w:2.5, d:2, h:2.8, col:"#8a5fc0", label:"NACF 2 (25m³)" },
  { id:"nacf1", x:-7.5, z:3, w:2.5, d:2, h:2.8, col:"#8a5fc0", label:"NACF 1 (25m³)" },
  { id:"DPT_BF", x:-4.5, z:3, w:1.5, d:1.2, h:1.8, col:"#555a70", label:"Bag Filter" },
  { id:"m5", x:-14, z:5.5, w:0.7, d:0.7, h:0.7, col:"#e08020", label:"Pump M5" },
  { id:"m6", x:-11, z:5.5, w:0.7, d:0.7, h:0.7, col:"#e08020", label:"Pump M6" },
  { id:"FIT_6", x:-7.5, z:5.5, w:0.7, d:0.7, h:0.7, col:"#e08020", label:"Pump M7 (FIT_6)" },
  // ZONE D: Nano Filtration
  { id:"pH_NACF", x:-3, z:2, w:5, d:4, h:1.2, col:"#4a3870", label:"Nano Filtration Plant" },
  { id:"m9", x:0, z:5.5, w:0.7, d:0.7, h:0.7, col:"#e08020", label:"Pump M9" },
  { id:"LIT_ST", x:-1, z:7, w:2.5, d:2.5, h:2.8, col:"#2a7fbf", label:"Storage Tank (19m³)", tank:true },
  // ZONE E: RACF Filters
  { id:"PIT_RACF1", x:1, z:-3, w:2, d:1.8, h:2.5, col:"#5a7fc0", label:"RACF 1" },
  { id:"PIT_RACF2", x:4, z:-3, w:2, d:1.8, h:2.5, col:"#5a7fc0", label:"RACF 2" },
  { id:"PIT_RACF3", x:7, z:-3, w:2, d:1.8, h:2.5, col:"#5a7fc0", label:"RACF 3" },
  { id:"DPT_PF", x:10, z:-3, w:1.5, d:1.2, h:1.8, col:"#555a70", label:"Bag Filter (RACF)" },
  // ZONE F: RO Plant
  { id:"pH_RO", x:9, z:0, w:1.5, d:1.5, h:1.5, col:"#2a7fbf", label:"RO Break Tank", tank:true },
  { id:"EC_RO", x:9, z:2, w:5, d:3, h:1.2, col:"#c07020", label:"RO Plant (30m³/hr)" },
  { id:"m10", x:11, z:4.5, w:0.7, d:0.7, h:0.7, col:"#e08020", label:"Pump M10" },
  { id:"LIT_TWT", x:13, z:-2, w:2, d:2, h:3.2, col:"#2a9fbf", label:"Treated Water (25m³)", tank:true },
  { id:"CL_001", x:13, z:0.5, w:1, d:0.8, h:1, col:"#e0e060", label:"UV Light 1 (CL)" },
  { id:"EC_NANO", x:9, z:5, w:1, d:0.8, h:1, col:"#e0e060", label:"UV Light 2 (EC)" },
  // ZONE G: Recovery
  { id:"LIT_NR1", x:2, z:9, w:2, d:2, h:2.2, col:"#2aaa8a", label:"Nano Recovery 1", tank:true },
  { id:"LIT_NR2", x:5, z:9, w:2, d:2, h:2.5, col:"#2aaa8a", label:"Nano Recovery 2", tank:true },
  { id:"FIT_8", x:-1, z:10, w:1.5, d:1.2, h:1, col:"#3a5a50", label:"Recovery Sump (FIT_8)" },
  { id:"polish", x:2, z:12, w:1.5, d:1.2, h:1.5, col:"#555a70", label:"Polishing Filter" },
  // ZONE H: Distribution
  { id:"admin", x:16, z:-10, w:3, d:2, h:2, col:"#404860", label:"Admin / Ablutions" },
  { id:"condensers", x:16, z:-7, w:2, d:1.5, h:1.5, col:"#555a70", label:"Condensers" },
  { id:"softeners", x:16, z:-5, w:2, d:1.5, h:1.5, col:"#555a70", label:"Softeners" },
  { id:"lab", x:16, z:-3, w:2, d:1.5, h:1.5, col:"#404860", label:"Lab" },
  { id:"FIT_CIP", x:16, z:-1, w:3, d:1, h:1, col:"#c07020", label:"CIP Lines (FIT_CIP)" },
  { id:"FIT_FL", x:16, z:1, w:3, d:1, h:1, col:"#555a70", label:"PET Line 4 (FIT_FL)" },
  { id:"pet3", x:16, z:2.5, w:3, d:1, h:1, col:"#555a70", label:"PET Line 3" },
  { id:"syrup", x:16, z:4, w:3, d:1.5, h:1.5, col:"#8a4040", label:"Syrup Room" },
  { id:"canline", x:16, z:6, w:3, d:1.5, h:1.5, col:"#8a4040", label:"Canline" },
  // ZONE I: WWTP
  { id:"wwtp", x:18, z:10, w:3.5, d:3, h:1.5, col:"#2aaa8a", label:"WWTP" },
  { id:"sewage", x:13, z:10, w:3, d:2, h:1.5, col:"#3a5040", label:"Sewage / Manhole" },
];

const FLOWS = [
  { path:["LIT_MR","FIT_10","LIT_RT4"], col:"#2a7fbf" },
  { path:["LIT_MR","m2","LIT_RR2"], col:"#c03020" },
  { path:["LIT_MR","m3","LIT_BRT"], col:"#4a9f6e" },
  { path:["LIT_RR2","red2","LIT_STW"], col:"#c03020" },
  { path:["LIT_STW","PIT_RACF1","PIT_RACF2","PIT_RACF3","DPT_PF","pH_RO"], col:"#5a7fc0" },
  { path:["pH_RO","EC_RO","m10","LIT_TWT"], col:"#2a9fbf" },
  { path:["LIT_TWT","CL_001"], col:"#2a9fbf" },
  { path:["LIT_BRT","LIT_HT","m4","nacf1","PIT_NACF2","PIT_NACF1"], col:"#8a5fc0" },
  { path:["nacf1","DPT_BF","pH_NACF","m9","EC_NANO"], col:"#8a5fc0" },
  { path:["LIT_ST","LIT_NR1","LIT_NR2"], col:"#2aaa8a" },
  { path:["LIT_NR1","polish"], col:"#2aaa8a" },
  { path:["FIT_8","polish"], col:"#2aaa8a" },
  { path:["LIT_TWT","FIT_CIP"], col:"#2a9fbf" },
  { path:["LIT_TWT","FIT_FL","pet3","syrup","canline"], col:"#2a9fbf" },
  { path:["canline","wwtp"], col:"#2aaa8a" },
  { path:["sewage","wwtp"], col:"#2aaa8a" },
];

const SCALE = 28;
const EQ_MAP = {};
EQUIPMENT.forEach(e => { EQ_MAP[e.id] = e; });

const LEGEND = [
  { label: "Raw / Reservoir", color: "#4a9f6e" },
  { label: "Treated Water", color: "#2a7fbf" },
  { label: "Nano Filtration", color: "#8a5fc0" },
  { label: "RO / Polishing", color: "#c07020" },
  { label: "Infrastructure", color: "#555a70" },
  { label: "Recovery / WWTP", color: "#2aaa8a" },
  { label: "Pumps", color: "#e08020" },
];

const ZONE_LABELS = [
  { text: "OUTSIDE HMI", x: -10, z: -12, col: "#4a9" },
  { text: "SIEMENS HMI / RO", x: 8, z: -1, col: "#ca4" },
  { text: "NANO FILTRATION", x: -3, z: 5, col: "#8a5fc0" },
  { text: "DISTRIBUTION", x: 16, z: 0, col: "#4af" },
  { text: "WWTP / RECOVERY", x: 15, z: 11, col: "#2aaa8a" },
];

/* ── Helper functions ────────────────────────────────────── */
function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function darken(hex, f) {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
}
function lighten(hex, f) {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.min(255,Math.round(r*f))},${Math.min(255,Math.round(g*f))},${Math.min(255,Math.round(b*f))})`;
}

/* ── Main Component ──────────────────────────────────────── */
const PlantOverview = ({ sensors, onSensorClick }) => {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    cam: { rotX: 0.52, rotY: 0.6, zoom: 1.0 },
    flowOn: false, flowT: 0, animFrame: null, drag: false, lastX: 0, lastY: 0,
    W: 0, H: 0, clickables: [],
  });
  const [viewMode, setViewMode] = useState("iso");
  const [flowOn, setFlowOn] = useState(false);
  const [infoPanel, setInfoPanel] = useState(null);

  const sensorMap = useMemo(() => {
    const map = {};
    (sensors || []).forEach(s => { map[s.instrument_id || s.id] = s; });
    return map;
  }, [sensors]);

  const project = useCallback((x, y, z) => {
    const { rotX, rotY, zoom } = stateRef.current.cam;
    const { W, H } = stateRef.current;
    const cx = x * Math.cos(rotY) + z * Math.sin(rotY);
    const cz = -x * Math.sin(rotY) + z * Math.cos(rotY);
    const cy2 = y * Math.cos(rotX) - cz * Math.sin(rotX);
    const cz2 = y * Math.sin(rotX) + cz * Math.cos(rotX);
    return [W/2 + cx * SCALE * zoom, H/2 + (-cy2) * SCALE * zoom, cz2];
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const { W, H, cam } = stateRef.current;
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#062C60"); bg.addColorStop(1, "#0B1D3A");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(201,224,239,0.06)"; ctx.lineWidth = 0.5;
    for (let gx = -18; gx <= 24; gx += 2) {
      const [x1,y1] = project(gx, -0.05, -14);
      const [x2,y2] = project(gx, -0.05, 16);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
    for (let gz = -14; gz <= 16; gz += 2) {
      const [x1,y1] = project(-18, -0.05, gz);
      const [x2,y2] = project(24, -0.05, gz);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }

    stateRef.current.clickables = [];

    // Sort by depth
    const sorted = [...EQUIPMENT].sort((a, b) => {
      const [,,za] = project(a.x+a.w/2, 0, a.z+a.d/2);
      const [,,zb] = project(b.x+b.w/2, 0, b.z+b.d/2);
      return zb - za;
    });

    // Draw flows
    FLOWS.forEach(f => {
      const { path, col } = f;
      for (let i = 0; i < path.length - 1; i++) {
        const a = EQ_MAP[path[i]], b = EQ_MAP[path[i+1]];
        if (!a || !b) continue;
        const pA = project(a.x+a.w/2, a.h*0.4, a.z+a.d/2);
        const pB = project(b.x+b.w/2, b.h*0.4, b.z+b.d/2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
        if (stateRef.current.flowOn) {
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -stateRef.current.flowT * 20;
          ctx.globalAlpha = 0.8;
        } else { ctx.setLineDash([]); }
        ctx.beginPath(); ctx.moveTo(pA[0], pA[1]); ctx.lineTo(pB[0], pB[1]); ctx.stroke();
        if (!stateRef.current.flowOn) {
          const mx = (pA[0]+pB[0])/2, my = (pA[1]+pB[1])/2;
          const ang = Math.atan2(pB[1]-pA[1], pB[0]-pA[0]);
          ctx.globalAlpha = 0.6; ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(-4,-3); ctx.lineTo(4,0); ctx.lineTo(-4,3);
          ctx.fillStyle = col; ctx.fill(); ctx.restore();
        }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    });

    // Draw equipment
    sorted.forEach(eq => {
      const { x, z, w, d, h, col, label, tank, id } = eq;
      const P = (px,py,pz) => project(px,py,pz);
      const b00=P(x,0,z), b10=P(x+w,0,z), b11=P(x+w,0,z+d), b01=P(x,0,z+d);
      const t00=P(x,h,z), t10=P(x+w,h,z), t11=P(x+w,h,z+d), t01=P(x,h,z+d);

      const drawFace = (pts, fCol, alpha=1) => {
        ctx.globalAlpha = alpha; ctx.fillStyle = fCol;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.globalAlpha = 1;
      };

      drawFace([b00,b10,t10,t00], darken(col, 0.55));
      drawFace([b00,b01,t01,t00], darken(col, 0.75));
      drawFace([b10,b11,t11,t10], darken(col, 0.75));
      drawFace([b01,b11,t11,t01], col);
      drawFace([t00,t10,t11,t01], lighten(col, 1.25), 0.92);

      // Tank water level
      if (tank) {
        const sensor = sensorMap[id];
        const level = sensor ? Math.min(100, Math.max(0, sensor.value)) / 100 : 0.5;
        const wh = h * level;
        if (wh > 0.1) {
          const wt00=P(x+0.1,wh,z+0.1), wt10=P(x+w-0.1,wh,z+0.1), wt11=P(x+w-0.1,wh,z+d-0.1), wt01=P(x+0.1,wh,z+d-0.1);
          ctx.globalAlpha = 0.4; ctx.fillStyle = "#1171b8";
          ctx.beginPath(); ctx.moveTo(wt00[0],wt00[1]);
          ctx.lineTo(wt10[0],wt10[1]); ctx.lineTo(wt11[0],wt11[1]); ctx.lineTo(wt01[0],wt01[1]);
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        }
        // Ellipse on top for cylinder effect
        const cx2 = (t00[0]+t10[0]+t11[0]+t01[0])/4;
        const cy2 = (t00[1]+t10[1]+t11[1]+t01[1])/4;
        const rx = Math.abs(t10[0]-t00[0])/2 * 0.7;
        const ry = Math.abs(t10[0]-t11[0])/3 * 0.7 + 3;
        ctx.fillStyle = lighten(col, 1.1); ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(cx2, cy2, Math.max(1,rx), Math.max(1,ry), 0, 0, Math.PI*2);
        ctx.fill(); ctx.globalAlpha = 1;

        // Level text
        if (sensor) {
          ctx.font = `bold ${Math.max(8, cam.zoom * 9)}px JetBrains Mono, monospace`;
          ctx.fillStyle = "#FFF"; ctx.textAlign = "center";
          const labelY = (t00[1]+t10[1]+t11[1]+t01[1])/4;
          ctx.fillText(`${sensor.value}`, cx2, labelY + 3);
          ctx.font = `${Math.max(6, cam.zoom * 6)}px JetBrains Mono, monospace`;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText(sensor.unit || "%", cx2, labelY + 12);
        }
      }

      // Label
      const lx = (t00[0]+t10[0]+t11[0]+t01[0])/4;
      const ly = Math.min(t00[1],t10[1],t01[1],t11[1]) - 5;
      const fs = Math.max(7, Math.min(10, SCALE * cam.zoom * 0.32));
      ctx.font = `${fs}px sans-serif`;
      ctx.fillStyle = "rgba(220,235,255,0.85)"; ctx.textAlign = "center";
      ctx.fillText(label.length > 22 ? label.slice(0,20)+"…" : label, lx, ly);

      // Clickable region
      const allX = [b00,b10,b11,b01,t00,t10,t11,t01].map(p=>p[0]);
      const allY = [b00,b10,b11,b01,t00,t10,t11,t01].map(p=>p[1]);
      stateRef.current.clickables.push({
        id, x: Math.min(...allX)-4, y: Math.min(...allY)-4,
        w: Math.max(...allX)-Math.min(...allX)+8, h: Math.max(...allY)-Math.min(...allY)+8,
        label, desc: eq.desc || "",
      });
    });

    // Zone labels
    ZONE_LABELS.forEach(l => {
      const [sx, sy] = project(l.x, 6, l.z);
      ctx.font = "11px sans-serif"; ctx.fillStyle = l.col;
      ctx.globalAlpha = 0.45; ctx.textAlign = "center";
      ctx.fillText(l.text, sx, sy); ctx.globalAlpha = 1;
    });
  }, [project, sensorMap]);

  // Setup canvas and event listeners
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const parent = cv.parentElement;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      stateRef.current.W = cv.width = rect.width * dpr;
      stateRef.current.H = cv.height = rect.height * dpr;
      draw();
    };

    const onMouseDown = (e) => { stateRef.current.drag = true; stateRef.current.lastX = e.clientX; stateRef.current.lastY = e.clientY; };
    const onMouseMove = (e) => {
      if (!stateRef.current.drag) return;
      const dx = e.clientX - stateRef.current.lastX, dy = e.clientY - stateRef.current.lastY;
      stateRef.current.cam.rotY += dx * 0.008;
      stateRef.current.cam.rotX = Math.max(-0.1, Math.min(Math.PI/2, stateRef.current.cam.rotX + dy * 0.006));
      stateRef.current.lastX = e.clientX; stateRef.current.lastY = e.clientY;
      draw();
    };
    const onMouseUp = () => { stateRef.current.drag = false; };
    const onWheel = (e) => {
      e.preventDefault();
      stateRef.current.cam.zoom *= e.deltaY > 0 ? 0.93 : 1.07;
      stateRef.current.cam.zoom = Math.max(0.25, Math.min(3.5, stateRef.current.cam.zoom));
      draw();
    };
    const onClick = (e) => {
      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;
      let hit = null;
      for (const c of stateRef.current.clickables) {
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) { hit = c; break; }
      }
      if (hit) {
        // If it's a known sensor ID, navigate to analytics
        const knownSensors = ["LIT_MR","LIT_RT4","LIT_RR2","LIT_STW","LIT_TWT","LIT_BRT","LIT_HT","LIT_ST","LIT_NR1","LIT_NR2","FIT_10","FIT_FL","FIT_CIP","FIT_6","FIT_8","PIT_RACF1","PIT_RACF2","PIT_RACF3","PIT_NACF1","PIT_NACF2","pH_RO","pH_NACF","CL_001","EC_RO","EC_NANO","DPT_BF","DPT_PF"];
        if (knownSensors.includes(hit.id) && onSensorClick) {
          onSensorClick(hit.id);
        } else {
          setInfoPanel({ label: hit.label, desc: hit.desc || `Equipment: ${hit.label}` });
        }
      } else {
        setInfoPanel(null);
      }
    };

    resize();
    cv.addEventListener("mousedown", onMouseDown);
    cv.addEventListener("mousemove", onMouseMove);
    cv.addEventListener("mouseup", onMouseUp);
    cv.addEventListener("mouseleave", onMouseUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("click", onClick);
    window.addEventListener("resize", resize);

    return () => {
      cv.removeEventListener("mousedown", onMouseDown);
      cv.removeEventListener("mousemove", onMouseMove);
      cv.removeEventListener("mouseup", onMouseUp);
      cv.removeEventListener("mouseleave", onMouseUp);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
    };
  }, [draw, onSensorClick]);

  // Redraw on sensor data change
  useEffect(() => { draw(); }, [draw, sensors]);

  // Flow animation loop
  useEffect(() => {
    stateRef.current.flowOn = flowOn;
    if (!flowOn) { return; }
    let running = true;
    const animate = () => {
      if (!running) return;
      stateRef.current.flowT += 0.018;
      draw();
      stateRef.current.animFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => { running = false; cancelAnimationFrame(stateRef.current.animFrame); };
  }, [flowOn, draw]);

  // View mode changes
  useEffect(() => {
    const cam = stateRef.current.cam;
    if (viewMode === "iso") { cam.rotX = 0.52; cam.rotY = 0.6; cam.zoom = 1.0; }
    else if (viewMode === "top") { cam.rotX = Math.PI/2; cam.rotY = 0; cam.zoom = 0.9; }
    else if (viewMode === "front") { cam.rotX = 0.1; cam.rotY = 0; cam.zoom = 0.9; }
    draw();
  }, [viewMode, draw]);

  return (
    <div className="relative" style={{ minHeight: "600px", background: "#062C60", borderRadius: "2px" }} data-testid="plant-overview">
      <div style={{ width: "100%", height: "600px" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", cursor: "grab" }} />
      </div>

      {/* Controls */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5" style={{ zIndex: 10 }}>
        {["iso","top","front"].map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors"
            style={{
              background: viewMode === v ? "rgba(100,180,255,0.25)" : "rgba(255,255,255,0.08)",
              borderColor: viewMode === v ? "rgba(100,180,255,0.6)" : "rgba(255,255,255,0.15)",
              color: "#e0e8ff",
            }}
            data-testid={`plant-view-${v}`}
          >
            {v === "iso" ? "Isometric" : v === "top" ? "Top View" : "Front View"}
          </button>
        ))}
        <button onClick={() => { stateRef.current.cam = { rotX: 0.52, rotY: 0.6, zoom: 1.0 }; setViewMode("iso"); draw(); }}
          className="text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors"
          style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#e0e8ff" }}>
          Reset
        </button>
        <div className="border-t my-0.5" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <button onClick={() => setFlowOn(p => !p)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors"
          style={{
            background: flowOn ? "rgba(100,180,255,0.25)" : "rgba(255,255,255,0.08)",
            borderColor: flowOn ? "rgba(100,180,255,0.6)" : "rgba(255,255,255,0.15)",
            color: "#e0e8ff",
          }}
          data-testid="plant-flow-toggle"
        >
          {flowOn ? "Stop ■" : "Animate ▶"}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 rounded-lg p-2" style={{ background: "rgba(10,15,26,0.85)", border: "0.5px solid rgba(255,255,255,0.15)", zIndex: 10 }}>
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5 my-0.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
            <span className="text-[9px]" style={{ color: "#aab" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Info Panel */}
      {infoPanel && (
        <div className="absolute top-3 right-3 rounded-lg p-3" style={{ background: "rgba(10,15,26,0.92)", border: "0.5px solid rgba(100,180,255,0.3)", zIndex: 10, maxWidth: "210px" }}>
          <h4 className="text-xs font-bold mb-1" style={{ color: "#7cf" }}>{infoPanel.label}</h4>
          <p className="text-[10px] leading-relaxed" style={{ color: "#9ab" }}>{infoPanel.desc}</p>
        </div>
      )}

      {/* Hint */}
      <div className="absolute bottom-3 right-3 text-[10px]" style={{ color: "rgba(255,255,255,0.3)", zIndex: 10 }}>
        Drag to orbit · Scroll to zoom · Click equipment for analytics
      </div>
    </div>
  );
};

export default PlantOverview;
