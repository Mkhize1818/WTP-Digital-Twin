import React from "react";

const TALBOT_LOGO = "https://customer-assets.emergentagent.com/job_08778319-680e-4dcc-9637-79a56dea1c9a/artifacts/hxpepcrm_image.png";

const Header = () => {
  return (
    <header
      className="border-b px-6 md:px-8 py-3"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(17, 113, 184, 0.12)",
      }}
      data-testid="dashboard-header"
    >
      <div className="flex items-center justify-between">
        {/* Left — Talbot Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img
            src={TALBOT_LOGO}
            alt="Talbot - The Art of Water"
            className="h-9 md:h-11"
            data-testid="company-logo"
          />
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#2DA44E" }}
            />
            <span className="text-xs hidden md:inline" style={{ color: "#163F56" }}>Live</span>
          </div>
        </div>

        {/* Center — Title */}
        <div className="text-center flex-1">
          <h1
            className="text-xl md:text-2xl font-black tracking-tighter"
            style={{ fontFamily: "Chivo, sans-serif", color: "#062C60" }}
          >
            Digital Twin
          </h1>
          <p className="text-xs" style={{ color: "#1171b8", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            Water Reticulation System
          </p>
        </div>

        {/* Right — Empty space for balance */}
        <div className="flex-shrink-0 w-[100px]" />
      </div>
    </header>
  );
};

export default Header;
