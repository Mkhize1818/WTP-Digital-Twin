import React, { useState } from "react";
import axios from "axios";
import { FileCsv, FilePdf, FileText, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { generateComplianceCSV, generateCompliancePDF } from "../utils/exportCompliance";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RANGES = [
  { label: "1H", value: "1h" },
  { label: "6H", value: "6h" },
  { label: "24H", value: "24h" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
];

const ComplianceExport = () => {
  const [range, setRange] = useState("24h");
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    const res = await axios.get(`${API}/reports/compliance?time_range=${range}`);
    return res.data;
  };

  const handleCSV = async () => {
    setLoading(true);
    try {
      const report = await fetchReport();
      generateComplianceCSV(report, range);
      toast.success("CSV report downloaded");
    } catch (e) {
      toast.error("Failed to generate CSV");
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    setLoading(true);
    try {
      const report = await fetchReport();
      generateCompliancePDF(report, range);
      toast.success("PDF report downloaded");
    } catch (e) {
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="grid-border p-4 md:p-6"
      style={{ backgroundColor: "#0B1D3A" }}
      data-testid="compliance-export"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText size={24} color="#1171b8" weight="duotone" />
        <h3
          className="text-xl md:text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
        >
          Compliance Reports
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Range selector */}
        <div
          className="flex items-center rounded-sm border overflow-hidden"
          style={{
            borderColor: "rgba(201, 224, 239, 0.15)",
            backgroundColor: "#163F56",
          }}
          data-testid="report-range-selector"
        >
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className="px-3 py-1.5 text-xs font-bold transition-colors"
              style={{
                backgroundColor:
                  range === r.value ? "#1171b8" : "transparent",
                color: range === r.value ? "#FFFFFF" : "#C9E0EF",
              }}
              data-testid={`report-range-${r.value}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Export buttons */}
        <button
          onClick={handleCSV}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-sm border text-sm font-medium hover:border-[#34C759] transition-colors disabled:opacity-50"
          style={{
            borderColor: "rgba(201, 224, 239, 0.15)",
            color: "#34C759",
            backgroundColor: "#163F56",
          }}
          data-testid="compliance-csv-button"
        >
          {loading ? (
            <CircleNotch size={16} className="animate-spin" />
          ) : (
            <FileCsv size={16} weight="duotone" />
          )}
          Export CSV
        </button>
        <button
          onClick={handlePDF}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-sm border text-sm font-medium hover:border-[#FF3B30] transition-colors disabled:opacity-50"
          style={{
            borderColor: "rgba(201, 224, 239, 0.15)",
            color: "#FF3B30",
            backgroundColor: "#163F56",
          }}
          data-testid="compliance-pdf-button"
        >
          {loading ? (
            <CircleNotch size={16} className="animate-spin" />
          ) : (
            <FilePdf size={16} weight="duotone" />
          )}
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default ComplianceExport;
