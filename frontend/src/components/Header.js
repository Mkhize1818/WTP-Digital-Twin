import React from "react";

const TALBOT_LOGO = "https://customer-assets.emergentagent.com/job_08778319-680e-4dcc-9637-79a56dea1c9a/artifacts/hxpepcrm_image.png";
const CCBA_LOGO = "https://customer-assets.emergentagent.com/job_liquid-ops-twin/artifacts/e6b8n337_CocoCola%20Africa%20Logo.jpg";

const Header = () => {
  return (
    <header
      className="border-b px-6 md:px-8 py-3"
      style={{
        backgroundColor: "#0A0A0A",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      data-testid="dashboard-header"
    >
      <div className="flex items-center justify-between">
        {/* Left — Talbot Logo */}
        <div className="flex items-center gap-3 flex-shrink-0 w-[180px]">
          <img
            src={TALBOT_LOGO}
            alt="Talbot"
            className="h-9 md:h-11"
            data-testid="company-logo"
          />
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#34C759" }}
            />
            <span className="text-xs text-[#A3A3A3] hidden md:inline">Live</span>
          </div>
        </div>

        {/* Center — Title */}
        <div className="text-center flex-1">
          <h1
            className="text-xl md:text-2xl font-black tracking-tighter"
            style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
          >
            Digital Twin
          </h1>
          <p className="text-xs text-[#A3A3A3]">Water Reticulation System</p>
        </div>

        {/* Right — CCBA Logo */}
        <div className="flex items-center justify-end flex-shrink-0 w-[180px]">
          <img
            src={CCBA_LOGO}
            alt="Coca-Cola Beverages Africa"
            className="h-9 md:h-11 rounded-sm"
            data-testid="ccba-logo"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
