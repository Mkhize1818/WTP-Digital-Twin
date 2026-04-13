import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportCSV(data, rangeLabel) {
  const { instrument, time_series, stats } = data;
  let csv = `Instrument,${instrument.name} (${instrument.id})\nType,${instrument.type}\nUnit,${instrument.unit}\n`;
  csv += `Mean,${stats.mean}\nMin,${stats.min}\nMax,${stats.max}\nStd Dev,${stats.std_dev}\nData Points,${stats.data_points}\n\n`;
  csv += "Timestamp,Value,Rolling Avg 5,Rolling Avg 10\n";
  time_series.timestamps.forEach((ts, i) => {
    csv += `${ts},${time_series.values[i]},${time_series.rolling_avg_5[i]},${time_series.rolling_avg_10[i]}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${instrument.id}_analytics_${rangeLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(data, rangeLabel) {
  const { instrument, stats, thresholds, recent_alerts } = data;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(0, 122, 255);
  doc.text("Digital Twin - Sensor Analytics Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}  |  Range: ${rangeLabel}`, 14, 28);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`${instrument.name} (${instrument.id})`, 14, 40);
  doc.setFontSize(10);
  doc.text(`Type: ${instrument.type}  |  Unit: ${instrument.unit}`, 14, 47);
  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Value"]],
    body: [
      ["Current", `${stats.current} ${instrument.unit}`],
      ["Mean", `${stats.mean} ${instrument.unit}`],
      ["Min", `${stats.min} ${instrument.unit}`],
      ["Max", `${stats.max} ${instrument.unit}`],
      ["Std Dev", `${stats.std_dev} ${instrument.unit}`],
      ["Data Points", `${stats.data_points}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [0, 122, 255] },
  });
  if (thresholds.label) {
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Compliance Thresholds", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Parameter", "Value"]],
      body: [
        ["Range", thresholds.label],
        ["Low Limit", `${thresholds.low} ${instrument.unit}`],
        ["High Limit", `${thresholds.high} ${instrument.unit}`],
        ["Baseline", `${instrument.baseline} ${instrument.unit}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [0, 122, 255] },
    });
  }
  if (recent_alerts.length > 0) {
    const y2 = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Recent Alerts", 14, y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [["Severity", "Type", "Message", "Time"]],
      body: recent_alerts.map((a) => [a.severity, a.type, a.message, format(new Date(a.timestamp), "dd/MM HH:mm")]),
      theme: "grid",
      headStyles: { fillColor: [255, 59, 48] },
    });
  }
  doc.save(`${instrument.id}_report_${rangeLabel}.pdf`);
}
