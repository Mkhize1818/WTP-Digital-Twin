import React from "react";

const Header = () => {
  return (
    <header
      className="border-b px-6 md:px-8 py-4 flex items-center justify-between"
      style={{
        backgroundColor: "#0A0A0A",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
      data-testid="dashboard-header"
    >
      <div className="flex items-center gap-4">
        <img
          src="https://customer-assets.emergentagent.com/job_08778319-680e-4dcc-9637-79a56dea1c9a/artifacts/hxpepcrm_image.png"
          alt="Company Logo"
          className="h-8 md:h-10"
          data-testid="company-logo"
        />
        <div>
          <h1
            className="text-xl md:text-2xl font-black tracking-tighter"
            style={{ fontFamily: "Chivo, sans-serif", color: "#FFFFFF" }}
          >
            Digital Twin
          </h1>
          <p className="text-xs text-[#A3A3A3]">Water Reticulation System</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "#34C759" }}
          ></div>
          <span className="text-sm text-[#A3A3A3] hidden md:inline">Live</span>
        </div>
      </div>
    </header>
  );
};

export default Header;