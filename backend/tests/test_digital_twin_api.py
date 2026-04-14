"""
Digital Twin API Tests - Water Reticulation System
Tests all backend endpoints for the Coke water reticulation digital twin demo.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndStats:
    """Test health check and system stats endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: API root returns: {data}")
    
    def test_system_stats(self):
        """Test GET /api/stats returns valid system statistics"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Validate all required fields
        assert "total_flow" in data
        assert "avg_pressure" in data
        assert "active_alerts" in data
        assert "anomalies_detected" in data
        assert "online_sensors" in data
        assert "total_sensors" in data
        
        # Validate data types and ranges
        assert isinstance(data["total_flow"], (int, float))
        assert isinstance(data["avg_pressure"], (int, float))
        assert isinstance(data["active_alerts"], int)
        assert data["total_sensors"] == 27  # Expected 27 instruments
        assert data["online_sensors"] <= data["total_sensors"]
        
        print(f"SUCCESS: Stats - Flow: {data['total_flow']}, Pressure: {data['avg_pressure']}, Sensors: {data['online_sensors']}/{data['total_sensors']}")


class TestSensorEndpoints:
    """Test sensor-related endpoints"""
    
    def test_get_latest_sensors(self):
        """Test GET /api/sensors/latest returns sensor array"""
        response = requests.get(f"{BASE_URL}/api/sensors/latest")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Validate sensor structure
        sensor = data[0]
        assert "id" in sensor
        assert "instrument_id" in sensor
        assert "instrument_name" in sensor
        assert "type" in sensor
        assert "value" in sensor
        assert "unit" in sensor
        assert "status" in sensor
        
        # Validate sensor types
        valid_types = ["flow", "pressure", "ph", "conductivity", "chlorine", "level"]
        for s in data:
            assert s["type"] in valid_types
            assert s["status"] in ["online", "offline", "warning"]
        
        print(f"SUCCESS: Got {len(data)} sensors with valid structure")
    
    def test_sensor_history(self):
        """Test GET /api/sensors/{instrument_id}/history"""
        # First get a valid sensor ID
        sensors_response = requests.get(f"{BASE_URL}/api/sensors/latest")
        sensors = sensors_response.json()
        instrument_id = sensors[0]["instrument_id"]
        
        response = requests.get(f"{BASE_URL}/api/sensors/{instrument_id}/history?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} history records for {instrument_id}")
    
    def test_sensor_analytics_default(self):
        """Test GET /api/sensors/{sensor_id}/analytics with default range"""
        response = requests.get(f"{BASE_URL}/api/sensors/FIT_10/analytics")
        assert response.status_code == 200
        data = response.json()
        
        # Validate analytics structure
        assert "instrument" in data
        assert "time_series" in data
        assert "stats" in data
        assert "thresholds" in data
        assert "recent_alerts" in data
        assert "recent_anomalies" in data
        
        # Validate instrument info
        assert data["instrument"]["id"] == "FIT_10"
        assert data["instrument"]["name"] == "Main Feed Flow"
        assert data["instrument"]["type"] == "flow"
        
        # Validate time series
        ts = data["time_series"]
        assert "timestamps" in ts
        assert "values" in ts
        assert "rolling_avg_5" in ts
        assert "rolling_avg_10" in ts
        
        # Validate stats
        stats = data["stats"]
        if stats:  # May be empty if no data
            assert "current" in stats
            assert "min" in stats
            assert "max" in stats
            assert "mean" in stats
            assert "std_dev" in stats
        
        print(f"SUCCESS: Analytics for FIT_10 - {len(ts['values'])} data points")
    
    def test_sensor_analytics_time_ranges(self):
        """Test analytics with different preset time ranges"""
        ranges = ["1h", "6h", "24h", "7d", "all"]
        
        for time_range in ranges:
            response = requests.get(f"{BASE_URL}/api/sensors/FIT_10/analytics?time_range={time_range}")
            assert response.status_code == 200
            data = response.json()
            assert "time_series" in data
            print(f"SUCCESS: Analytics range {time_range} - {len(data['time_series']['values'])} points")
    
    def test_sensor_analytics_custom_date_range(self):
        """Test analytics with custom start_date and end_date parameters"""
        now = datetime.utcnow()
        start = (now - timedelta(hours=2)).isoformat() + "Z"
        end = now.isoformat() + "Z"
        
        response = requests.get(
            f"{BASE_URL}/api/sensors/FIT_10/analytics",
            params={"start_date": start, "end_date": end}
        )
        assert response.status_code == 200
        data = response.json()
        assert "time_series" in data
        print(f"SUCCESS: Custom date range analytics - {len(data['time_series']['values'])} points")
    
    def test_sensor_analytics_invalid_id(self):
        """Test analytics returns 404 for invalid sensor ID"""
        response = requests.get(f"{BASE_URL}/api/sensors/INVALID_SENSOR/analytics")
        assert response.status_code == 404
        print("SUCCESS: Invalid sensor ID returns 404")


class TestAlertEndpoints:
    """Test alert-related endpoints"""
    
    def test_get_alerts_unacknowledged(self):
        """Test GET /api/alerts?acknowledged=false"""
        response = requests.get(f"{BASE_URL}/api/alerts?acknowledged=false")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert
            assert "type" in alert
            assert "severity" in alert
            assert "message" in alert
            assert "timestamp" in alert
            assert "acknowledged" in alert
            
            # Validate alert types
            valid_types = ["compliance", "leak", "anomaly", "offline"]
            valid_severities = ["critical", "warning", "info"]
            assert alert["type"] in valid_types
            assert alert["severity"] in valid_severities
        
        print(f"SUCCESS: Got {len(data)} unacknowledged alerts")
    
    def test_get_all_alerts(self):
        """Test GET /api/alerts without filter"""
        response = requests.get(f"{BASE_URL}/api/alerts?limit=50")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} total alerts")


class TestAnomalyEndpoints:
    """Test anomaly detection endpoints"""
    
    def test_get_anomalies(self):
        """Test GET /api/anomalies returns anomaly data"""
        response = requests.get(f"{BASE_URL}/api/anomalies")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            anomaly = data[0]
            assert "id" in anomaly
            assert "instrument_id" in anomaly
            assert "instrument_name" in anomaly
            assert "anomaly_type" in anomaly
            assert "confidence" in anomaly
            assert "description" in anomaly
            assert "timestamp" in anomaly
            
            # Validate confidence is between 0 and 1
            assert 0 <= anomaly["confidence"] <= 1
        
        print(f"SUCCESS: Got {len(data)} anomalies")


class TestLeakEndpoints:
    """Test leak detection endpoints"""
    
    def test_get_leak_zones(self):
        """Test GET /api/leaks/zones returns leak zone data"""
        response = requests.get(f"{BASE_URL}/api/leaks/zones")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 6  # Expected 6 leak zones
        
        zone = data[0]
        assert "id" in zone
        assert "name" in zone
        assert "x" in zone
        assert "y" in zone
        assert "has_leak" in zone
        assert "severity" in zone or zone["severity"] is None
        assert "estimated_loss" in zone
        assert "confidence" in zone
        
        print(f"SUCCESS: Got {len(data)} leak zones")
    
    def test_get_active_leaks(self):
        """Test GET /api/leaks returns active leaks"""
        response = requests.get(f"{BASE_URL}/api/leaks?active_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} active leaks")


class TestComplianceEndpoints:
    """Test compliance reporting endpoints"""
    
    def test_get_compliance_report_default(self):
        """Test GET /api/reports/compliance returns compliance report"""
        response = requests.get(f"{BASE_URL}/api/reports/compliance")
        assert response.status_code == 200
        data = response.json()
        
        assert "report_generated" in data
        assert "range" in data
        assert "compliance_data" in data
        assert "alert_summary" in data
        assert "total_leak_events" in data
        
        # Validate alert summary structure
        summary = data["alert_summary"]
        assert "compliance" in summary
        assert "leak" in summary
        assert "anomaly" in summary
        assert "offline" in summary
        
        print(f"SUCCESS: Compliance report generated with {len(data['compliance_data'])} items")
    
    def test_compliance_report_time_ranges(self):
        """Test compliance report with different time ranges"""
        ranges = ["1h", "6h", "24h", "7d", "30d"]
        
        for time_range in ranges:
            response = requests.get(f"{BASE_URL}/api/reports/compliance?time_range={time_range}")
            assert response.status_code == 200
            data = response.json()
            assert data["range"] == time_range
            print(f"SUCCESS: Compliance report for {time_range}")


class TestWaterBalanceEndpoints:
    """Test water balance feature endpoints - NEW FEATURE"""
    
    def test_get_water_balance(self):
        """Test GET /api/water-balance returns valid water balance data"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        # Validate top-level structure
        assert "timestamp" in data
        assert "intake" in data
        assert "treatment" in data
        assert "distribution" in data
        assert "recovery" in data
        assert "wastewater" in data
        assert "losses" in data
        assert "efficiency" in data
        assert "total_system_water" in data
        assert "flow_paths" in data
        
        print(f"SUCCESS: Water balance API returns all required top-level fields")
    
    def test_water_balance_intake_structure(self):
        """Test water balance intake section structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        intake = data["intake"]
        assert "municipal" in intake
        assert "total" in intake
        
        municipal = intake["municipal"]
        assert "flow_rate" in municipal
        assert "unit" in municipal
        assert "sensor" in municipal
        assert "label" in municipal
        assert municipal["sensor"] == "FIT_10"
        assert municipal["label"] == "Municipal Intake"
        assert isinstance(municipal["flow_rate"], (int, float))
        
        print(f"SUCCESS: Intake - Municipal: {municipal['flow_rate']} L/min")
    
    def test_water_balance_treatment_structure(self):
        """Test water balance treatment section structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        treatment = data["treatment"]
        assert "treated_output" in treatment
        assert "treatment_loss" in treatment
        assert "loss_pct" in treatment
        
        assert isinstance(treatment["treated_output"], (int, float))
        assert isinstance(treatment["treatment_loss"], (int, float))
        assert isinstance(treatment["loss_pct"], (int, float))
        
        print(f"SUCCESS: Treatment - Output: {treatment['treated_output']}, Loss: {treatment['treatment_loss']} ({treatment['loss_pct']}%)")
    
    def test_water_balance_distribution_structure(self):
        """Test water balance distribution/production lines structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        dist = data["distribution"]
        assert "cip_lines" in dist
        assert "pet_lines" in dist
        assert "canline" in dist
        assert "syrup_room" in dist
        assert "total" in dist
        
        # Validate CIP lines structure
        cip = dist["cip_lines"]
        assert "flow_rate" in cip
        assert "unit" in cip
        assert "sensor" in cip
        assert cip["sensor"] == "FIT_CIP"
        
        # Validate other production lines
        assert "flow_rate" in dist["pet_lines"]
        assert "flow_rate" in dist["canline"]
        assert "flow_rate" in dist["syrup_room"]
        
        print(f"SUCCESS: Distribution - CIP: {cip['flow_rate']}, PET: {dist['pet_lines']['flow_rate']}, Canline: {dist['canline']['flow_rate']}, Syrup: {dist['syrup_room']['flow_rate']}")
    
    def test_water_balance_recovery_structure(self):
        """Test water balance recovery section structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        recovery = data["recovery"]
        assert "nano_recovery_1" in recovery
        assert "nano_recovery_2" in recovery
        assert "backwash" in recovery
        assert "total" in recovery
        
        # Validate Nano Recovery 1
        nr1 = recovery["nano_recovery_1"]
        assert "flow_rate" in nr1
        assert "sensor" in nr1
        assert nr1["sensor"] == "FIT_6"
        
        # Validate Nano Recovery 2
        nr2 = recovery["nano_recovery_2"]
        assert "flow_rate" in nr2
        assert "sensor" in nr2
        assert nr2["sensor"] == "FIT_8"
        
        # Validate Backwash
        bw = recovery["backwash"]
        assert "flow_rate" in bw
        assert "sensor" in bw
        assert bw["sensor"] == "LIT_BRT"
        
        print(f"SUCCESS: Recovery - NR1: {nr1['flow_rate']}, NR2: {nr2['flow_rate']}, Backwash: {bw['flow_rate']}, Total: {recovery['total']}")
    
    def test_water_balance_wastewater_structure(self):
        """Test water balance wastewater section structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        wastewater = data["wastewater"]
        assert "wwtp_output" in wastewater
        assert "unit" in wastewater
        assert isinstance(wastewater["wwtp_output"], (int, float))
        
        print(f"SUCCESS: Wastewater - WWTP Output: {wastewater['wwtp_output']} L/min")
    
    def test_water_balance_losses_structure(self):
        """Test water balance losses section structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        losses = data["losses"]
        assert "treatment" in losses
        assert "unaccounted" in losses
        assert "leak_losses" in losses
        assert "total" in losses
        
        assert isinstance(losses["treatment"], (int, float))
        assert isinstance(losses["unaccounted"], (int, float))
        assert isinstance(losses["leak_losses"], (int, float))
        assert isinstance(losses["total"], (int, float))
        
        print(f"SUCCESS: Losses - Treatment: {losses['treatment']}, Unaccounted: {losses['unaccounted']}, Leaks: {losses['leak_losses']}, Total: {losses['total']}")
    
    def test_water_balance_efficiency_structure(self):
        """Test water balance efficiency gauges structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        eff = data["efficiency"]
        assert "water_use_ratio" in eff
        assert "recovery_rate" in eff
        assert "loss_rate" in eff
        assert "system_efficiency" in eff
        
        # Validate efficiency values are percentages (0-100 range)
        assert 0 <= eff["water_use_ratio"] <= 100
        assert 0 <= eff["recovery_rate"] <= 100
        assert 0 <= eff["loss_rate"] <= 100
        assert 0 <= eff["system_efficiency"] <= 100
        
        print(f"SUCCESS: Efficiency - System: {eff['system_efficiency']}%, Water Use: {eff['water_use_ratio']}%, Recovery: {eff['recovery_rate']}%, Loss: {eff['loss_rate']}%")
    
    def test_water_balance_flow_paths(self):
        """Test water balance flow paths for diagram"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        flow_paths = data["flow_paths"]
        assert isinstance(flow_paths, list)
        assert len(flow_paths) >= 10  # Should have at least 10 flow paths
        
        # Validate flow path structure
        for path in flow_paths:
            assert "from" in path
            assert "to" in path
            assert "value" in path
            assert isinstance(path["value"], (int, float))
        
        # Check for expected flow paths
        path_names = [(p["from"], p["to"]) for p in flow_paths]
        assert ("Municipal", "Treatment") in path_names
        assert ("Treatment", "Distribution") in path_names
        assert ("Distribution", "CIP Lines") in path_names
        
        print(f"SUCCESS: Flow paths - {len(flow_paths)} paths defined for diagram")


class TestNRWAnalyticsEndpoints:
    """Test NRW (Non-Revenue Water) Analytics endpoints - NEW FEATURE"""
    
    def test_get_nrw_analytics(self):
        """Test GET /api/analytics/nrw returns valid NRW data"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        # Validate top-level structure
        assert "timestamp" in data
        assert "hourly_balance" in data
        assert "dma_analysis" in data
        assert "mnf_profile" in data
        assert "mnf_baseline" in data
        assert "loss_separation" in data
        assert "pipe_risk" in data
        assert "anomaly_flags" in data
        
        print(f"SUCCESS: NRW Analytics API returns all required fields")
    
    def test_nrw_hourly_balance(self):
        """Test NRW hourly balance structure (24H chart data)"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        hourly = data["hourly_balance"]
        assert isinstance(hourly, list)
        assert len(hourly) == 24  # 24 hours
        
        # Validate structure
        for entry in hourly:
            assert "hour" in entry
            assert "input" in entry
            assert "consumption" in entry
            assert "losses" in entry
            assert isinstance(entry["input"], (int, float))
            assert isinstance(entry["consumption"], (int, float))
            assert isinstance(entry["losses"], (int, float))
        
        print(f"SUCCESS: NRW hourly balance - {len(hourly)} hours of data")
    
    def test_nrw_dma_analysis(self):
        """Test NRW DMA (District Metered Area) analysis structure"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        dma = data["dma_analysis"]
        assert isinstance(dma, list)
        assert len(dma) == 6  # 6 DMA zones
        
        for zone in dma:
            assert "id" in zone
            assert "name" in zone
            assert "pipe_km" in zone
            assert "age_years" in zone
            assert "material" in zone
            assert "input_volume" in zone
            assert "loss_pct" in zone
            assert "loss_volume" in zone
            assert "severity" in zone
            assert "mnf_ratio" in zone
            assert zone["severity"] in ["critical", "warning", "normal"]
        
        print(f"SUCCESS: NRW DMA analysis - {len(dma)} zones analyzed")
    
    def test_nrw_mnf_profile(self):
        """Test NRW MNF (Minimum Night Flow) profile"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        mnf = data["mnf_profile"]
        assert isinstance(mnf, list)
        assert len(mnf) == 24  # 24 hours
        
        for entry in mnf:
            assert "hour" in entry
            assert "flow" in entry
            assert isinstance(entry["flow"], (int, float))
        
        assert "mnf_baseline" in data
        assert isinstance(data["mnf_baseline"], (int, float))
        
        print(f"SUCCESS: NRW MNF profile - baseline: {data['mnf_baseline']} L/min")
    
    def test_nrw_loss_separation(self):
        """Test NRW loss separation (apparent vs real losses)"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        loss = data["loss_separation"]
        assert "total_loss" in loss
        assert "apparent" in loss
        assert "real" in loss
        
        # Apparent losses
        apparent = loss["apparent"]
        assert "total" in apparent
        assert "meter_inaccuracy" in apparent
        assert "unauthorized" in apparent
        
        # Real losses
        real = loss["real"]
        assert "total" in real
        assert "pipe_leaks" in real
        assert "overflow" in real
        
        print(f"SUCCESS: NRW loss separation - Total: {loss['total_loss']}, Apparent: {apparent['total']}, Real: {real['total']}")
    
    def test_nrw_pipe_risk(self):
        """Test NRW pipe leak probability list"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        pipes = data["pipe_risk"]
        assert isinstance(pipes, list)
        assert len(pipes) == 10  # 10 pipe segments
        
        for pipe in pipes:
            assert "id" in pipe
            assert "name" in pipe
            assert "material" in pipe
            assert "diameter_mm" in pipe
            assert "age_years" in pipe
            assert "leak_probability" in pipe
            assert "risk_level" in pipe
            assert 0 <= pipe["leak_probability"] <= 1
            assert pipe["risk_level"] in ["low", "medium", "high"]
        
        print(f"SUCCESS: NRW pipe risk - {len(pipes)} pipe segments analyzed")


class TestDemandAnalyticsEndpoints:
    """Test Demand Intelligence Analytics endpoints - NEW FEATURE"""
    
    def test_get_demand_analytics(self):
        """Test GET /api/analytics/demand returns valid demand data"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        # Validate top-level structure
        assert "timestamp" in data
        assert "forecast" in data
        assert "heatmap" in data
        assert "segments" in data
        assert "seasonal_trend" in data
        assert "summary" in data
        
        print(f"SUCCESS: Demand Analytics API returns all required fields")
    
    def test_demand_forecast(self):
        """Test demand forecast structure (24H prediction)"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        forecast = data["forecast"]
        assert isinstance(forecast, list)
        assert len(forecast) == 24  # 24 hours
        
        for entry in forecast:
            assert "hour" in entry
            assert "actual" in entry
            assert "predicted" in entry
            assert "lower_bound" in entry
            assert "upper_bound" in entry
        
        print(f"SUCCESS: Demand forecast - {len(forecast)} hours predicted")
    
    def test_demand_heatmap(self):
        """Test demand peak heatmap (7 days x 24 hours)"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        heatmap = data["heatmap"]
        assert isinstance(heatmap, list)
        assert len(heatmap) == 168  # 7 days * 24 hours
        
        for cell in heatmap:
            assert "day" in cell
            assert "hour" in cell
            assert "value" in cell
            assert cell["day"] in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            assert 0 <= cell["hour"] <= 23
        
        print(f"SUCCESS: Demand heatmap - {len(heatmap)} cells (7x24)")
    
    def test_demand_segments(self):
        """Test consumer segmentation data"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        segments = data["segments"]
        assert isinstance(segments, list)
        assert len(segments) == 5  # 5 consumer segments
        
        for seg in segments:
            assert "name" in seg
            assert "type" in seg
            assert "share_pct" in seg
            assert "avg_flow" in seg
        
        # Check expected segments
        names = [s["name"] for s in segments]
        assert "CIP Lines" in names
        assert "PET Lines" in names
        assert "Canline" in names
        
        print(f"SUCCESS: Demand segments - {len(segments)} consumer segments")
    
    def test_demand_seasonal_trend(self):
        """Test seasonal usage trend (12 months)"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        seasonal = data["seasonal_trend"]
        assert isinstance(seasonal, list)
        assert len(seasonal) == 12  # 12 months
        
        for month in seasonal:
            assert "month" in month
            assert "avg_demand" in month
            assert "peak_demand" in month
            assert "temperature" in month
        
        print(f"SUCCESS: Demand seasonal trend - {len(seasonal)} months")
    
    def test_demand_summary(self):
        """Test demand summary cards data"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "current_demand" in summary
        assert "predicted_peak" in summary
        assert "avg_daily" in summary
        
        print(f"SUCCESS: Demand summary - Current: {summary['current_demand']}, Peak: {summary['predicted_peak']}, Avg: {summary['avg_daily']}")


class TestAssetHealthEndpoints:
    """Test Asset Health Analytics endpoints - NEW FEATURE"""
    
    def test_get_asset_health(self):
        """Test GET /api/analytics/asset-health returns valid data"""
        response = requests.get(f"{BASE_URL}/api/analytics/asset-health")
        assert response.status_code == 200
        data = response.json()
        
        # Validate top-level structure
        assert "timestamp" in data
        assert "assets" in data
        assert "break_history" in data
        assert "maintenance_schedule" in data
        assert "summary" in data
        
        print(f"SUCCESS: Asset Health API returns all required fields")
    
    def test_asset_condition_table(self):
        """Test asset condition table with grades"""
        response = requests.get(f"{BASE_URL}/api/analytics/asset-health")
        assert response.status_code == 200
        data = response.json()
        
        assets = data["assets"]
        assert isinstance(assets, list)
        assert len(assets) == 10  # 10 pipe segments
        
        for asset in assets:
            assert "id" in asset
            assert "name" in asset
            assert "material" in asset
            assert "age_years" in asset
            assert "condition_score" in asset
            assert "condition_grade" in asset
            assert "rul_years" in asset
            assert "failure_probability" in asset
            assert "risk_level" in asset
            assert "last_inspection" in asset
            
            # Validate grades and risk levels
            assert asset["condition_grade"] in ["A", "B", "C", "D"]
            assert asset["risk_level"] in ["low", "medium", "high"]
            assert 0 <= asset["condition_score"] <= 100
            assert 0 <= asset["failure_probability"] <= 1
        
        print(f"SUCCESS: Asset condition - {len(assets)} assets with grades")
    
    def test_asset_break_history(self):
        """Test break history chart data (12 months)"""
        response = requests.get(f"{BASE_URL}/api/analytics/asset-health")
        assert response.status_code == 200
        data = response.json()
        
        history = data["break_history"]
        assert isinstance(history, list)
        assert len(history) == 12  # 12 months
        
        for entry in history:
            assert "month" in entry
            assert "breaks" in entry
            assert "cost_estimate" in entry
            assert isinstance(entry["breaks"], int)
        
        print(f"SUCCESS: Asset break history - {len(history)} months")
    
    def test_asset_maintenance_schedule(self):
        """Test predictive maintenance schedule"""
        response = requests.get(f"{BASE_URL}/api/analytics/asset-health")
        assert response.status_code == 200
        data = response.json()
        
        schedule = data["maintenance_schedule"]
        assert isinstance(schedule, list)
        assert len(schedule) >= 1  # At least 1 scheduled maintenance
        
        for item in schedule:
            assert "asset_id" in item
            assert "asset_name" in item
            assert "type" in item
            assert "scheduled_date" in item
            assert "priority" in item
            assert "estimated_cost" in item
            assert item["type"] in ["preventive", "urgent"]
            assert item["priority"] in ["low", "medium", "high"]
        
        print(f"SUCCESS: Asset maintenance schedule - {len(schedule)} items")
    
    def test_asset_summary_cards(self):
        """Test asset health summary cards"""
        response = requests.get(f"{BASE_URL}/api/analytics/asset-health")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total_assets" in summary
        assert "avg_condition_score" in summary
        assert "high_risk_count" in summary
        assert "total_pipe_length_m" in summary
        assert "avg_rul_years" in summary
        assert "total_breaks_12m" in summary
        
        assert summary["total_assets"] == 10
        
        print(f"SUCCESS: Asset summary - Avg Score: {summary['avg_condition_score']}, High Risk: {summary['high_risk_count']}")


class TestWaterQualityEndpoints:
    """Test Water Quality Intelligence endpoints - NEW FEATURE"""
    
    def test_get_water_quality(self):
        """Test GET /api/analytics/water-quality returns valid data"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        # Validate top-level structure
        assert "timestamp" in data
        assert "quality_parameters" in data
        assert "decay_curve" in data
        assert "spatial_quality" in data
        assert "contamination_events" in data
        assert "predictions" in data
        assert "summary" in data
        
        print(f"SUCCESS: Water Quality API returns all required fields")
    
    def test_quality_parameters(self):
        """Test live quality parameter cards with range bars"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        params = data["quality_parameters"]
        assert isinstance(params, list)
        assert len(params) == 4  # pH, chlorine, conductivity, turbidity
        
        for param in params:
            assert "id" in param
            assert "name" in param
            assert "unit" in param
            assert "value" in param
            assert "low_limit" in param
            assert "high_limit" in param
            assert "in_spec" in param
            assert "status" in param
            assert param["status"] in ["normal", "alarm"]
        
        # Check expected parameters
        ids = [p["id"] for p in params]
        assert "pH" in ids
        assert "chlorine" in ids
        assert "conductivity" in ids
        assert "turbidity" in ids
        
        print(f"SUCCESS: Quality parameters - {len(params)} parameters with range bars")
    
    def test_chlorine_decay_curve(self):
        """Test chlorine decay model chart"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        decay = data["decay_curve"]
        assert isinstance(decay, list)
        assert len(decay) >= 10  # At least 10 distance points
        
        for point in decay:
            assert "distance_m" in point
            assert "chlorine_mg_l" in point
            assert "min_required" in point
            assert point["min_required"] == 0.2  # Minimum chlorine requirement
        
        # Verify decay (chlorine should decrease with distance)
        first_cl = decay[0]["chlorine_mg_l"]
        last_cl = decay[-1]["chlorine_mg_l"]
        assert first_cl > last_cl  # Chlorine decays over distance
        
        print(f"SUCCESS: Chlorine decay curve - {len(decay)} points, {first_cl:.3f} -> {last_cl:.3f} mg/L")
    
    def test_spatial_quality_grid(self):
        """Test spatial quality map by zone"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        spatial = data["spatial_quality"]
        assert isinstance(spatial, list)
        assert len(spatial) == 5  # 5 quality zones
        
        for zone in spatial:
            assert "id" in zone
            assert "name" in zone
            assert "sensors" in zone
            assert "ph" in zone
            assert "chlorine" in zone
            assert "conductivity" in zone
            assert "status" in zone
            assert "parameters_ok" in zone
            assert "parameters_total" in zone
            assert zone["status"] in ["compliant", "non-compliant"]
        
        print(f"SUCCESS: Spatial quality grid - {len(spatial)} zones")
    
    def test_contamination_events(self):
        """Test contamination event log"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        events = data["contamination_events"]
        assert isinstance(events, list)
        assert len(events) >= 1  # At least 1 event
        
        for event in events:
            assert "id" in event
            assert "type" in event
            assert "severity" in event
            assert "zone" in event
            assert "timestamp" in event
            assert "source_trace" in event
            assert "resolved" in event
            assert "duration_hours" in event
            assert event["severity"] in ["critical", "warning", "info"]
        
        print(f"SUCCESS: Contamination events - {len(events)} events logged")
    
    def test_quality_predictions(self):
        """Test quality degradation predictions"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        predictions = data["predictions"]
        assert isinstance(predictions, list)
        assert len(predictions) == 4  # 4 parameters
        
        for pred in predictions:
            assert "parameter" in pred
            assert "current_value" in pred
            assert "trend" in pred
            assert "confidence" in pred
            assert pred["trend"] in ["stable", "degrading", "improving"]
            assert 0 <= pred["confidence"] <= 1
        
        print(f"SUCCESS: Quality predictions - {len(predictions)} parameters predicted")
    
    def test_quality_summary_banner(self):
        """Test compliance status summary"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "overall_status" in summary
        assert "compliant_zones" in summary
        assert "total_zones" in summary
        assert "active_events" in summary
        assert "parameters_in_spec" in summary
        assert "total_parameters" in summary
        
        assert summary["overall_status"] in ["compliant", "non-compliant"]
        assert summary["total_zones"] == 5
        assert summary["total_parameters"] == 4
        
        print(f"SUCCESS: Quality summary - Status: {summary['overall_status']}, Zones: {summary['compliant_zones']}/{summary['total_zones']}")


class TestAIEndpoints:
    """Test AI chat endpoints"""
    
    def test_ai_query(self):
        """Test POST /api/ai/query accepts query and returns response"""
        payload = {
            "query": "What is the current system status?",
            "session_id": "test-session-123"
        }
        
        response = requests.post(f"{BASE_URL}/api/ai/query", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert isinstance(data["response"], str)
        assert len(data["response"]) > 0
        
        print(f"SUCCESS: AI query returned response of {len(data['response'])} chars")
    
    def test_ai_chat_history(self):
        """Test GET /api/ai/history/{session_id} retrieves chat history"""
        session_id = "test-session-123"
        
        response = requests.get(f"{BASE_URL}/api/ai/history/{session_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} chat messages for session")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
