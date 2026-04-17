"""
Test suite for Plant Overview and DateRangeFilter features
Tests:
- Backend API endpoints used by Plant Overview (sensors, leaks)
- Backend API endpoints used by analytics tabs with date filtering
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPlantOverviewAPIs:
    """Tests for APIs used by Plant Overview component"""

    def test_sensors_latest_returns_all_sensors(self):
        """Test that /api/sensors/latest returns all 27 sensors for Plant Overview"""
        response = requests.get(f"{BASE_URL}/api/sensors/latest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 27, f"Expected 27 sensors, got {len(data)}"
        
        # Check for key tank sensors used in Plant Overview
        tank_ids = ['LIT_MR', 'LIT_RT4', 'LIT_RR2', 'LIT_STW', 'LIT_TWT', 
                   'LIT_BRT', 'LIT_HT', 'LIT_ST', 'LIT_NR1', 'LIT_NR2']
        sensor_ids = [s['instrument_id'] for s in data]
        
        for tank_id in tank_ids:
            assert tank_id in sensor_ids, f"Missing tank sensor: {tank_id}"
        
        print(f"✓ /api/sensors/latest returns all 27 sensors including 10 tank sensors")

    def test_sensor_data_structure_for_plant_overview(self):
        """Test sensor data has fields needed for Plant Overview water levels"""
        response = requests.get(f"{BASE_URL}/api/sensors/latest")
        assert response.status_code == 200
        data = response.json()
        
        # Find a tank sensor
        tank_sensor = next((s for s in data if s['instrument_id'] == 'LIT_MR'), None)
        assert tank_sensor is not None, "LIT_MR sensor not found"
        
        # Check required fields for Plant Overview
        required_fields = ['instrument_id', 'value', 'unit', 'status']
        for field in required_fields:
            assert field in tank_sensor, f"Missing field: {field}"
        
        # Value should be numeric for water level display
        assert isinstance(tank_sensor['value'], (int, float)), "Value should be numeric"
        
        print(f"✓ Sensor data structure correct for Plant Overview")
        print(f"  - LIT_MR (Main Reservoir): {tank_sensor['value']} {tank_sensor['unit']}")

    def test_leaks_zones_for_plant_overview(self):
        """Test leak zones endpoint returns data for Plant Overview leak indicators"""
        response = requests.get(f"{BASE_URL}/api/leaks/zones")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 6, f"Expected 6 leak zones, got {len(data)}"
        
        # Check structure
        zone = data[0]
        required_fields = ['id', 'name', 'has_leak', 'severity', 'estimated_loss', 'confidence']
        for field in required_fields:
            assert field in zone, f"Missing leak zone field: {field}"
        
        print(f"✓ /api/leaks/zones returns 6 zones with leak status")


class TestSensorAnalyticsAPI:
    """Tests for sensor analytics drill-down from Plant Overview"""

    def test_sensor_analytics_endpoint(self):
        """Test /api/sensors/{id}/analytics returns time series data"""
        response = requests.get(f"{BASE_URL}/api/sensors/LIT_MR/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required keys
        required_keys = ['instrument', 'time_series', 'stats', 'thresholds', 
                        'recent_alerts', 'recent_anomalies']
        for key in required_keys:
            assert key in data, f"Missing analytics key: {key}"
        
        # Check time_series structure
        ts = data['time_series']
        assert 'timestamps' in ts
        assert 'values' in ts
        assert 'rolling_avg_5' in ts
        assert 'rolling_avg_10' in ts
        
        print(f"✓ /api/sensors/LIT_MR/analytics returns complete analytics data")
        print(f"  - Data points: {len(ts['values'])}")

    def test_sensor_analytics_with_time_range(self):
        """Test sensor analytics with time_range parameter"""
        response = requests.get(f"{BASE_URL}/api/sensors/LIT_MR/analytics?time_range=24h")
        assert response.status_code == 200
        data = response.json()
        
        assert 'time_series' in data
        print(f"✓ Sensor analytics with time_range=24h works")

    def test_sensor_analytics_with_custom_dates(self):
        """Test sensor analytics with custom date range (for DateRangeFilter)"""
        end_date = datetime.now().isoformat()
        start_date = (datetime.now() - timedelta(hours=6)).isoformat()
        
        response = requests.get(
            f"{BASE_URL}/api/sensors/LIT_MR/analytics",
            params={'start_date': start_date, 'end_date': end_date}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'time_series' in data
        print(f"✓ Sensor analytics with custom date range works")


class TestAnalyticsTabsAPIs:
    """Tests for analytics tab APIs that use DateRangeFilter"""

    def test_water_balance_api(self):
        """Test /api/water-balance for Water Balance tab"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        assert 'balance_summary' in data
        assert 'hourly_balance' in data
        print(f"✓ /api/water-balance returns data for Water Balance tab")

    def test_nrw_analytics_api(self):
        """Test /api/analytics/nrw for NRW Analytics tab"""
        response = requests.get(f"{BASE_URL}/api/analytics/nrw")
        assert response.status_code == 200
        data = response.json()
        
        required_keys = ['hourly_balance', 'dma_analysis', 'mnf_profile', 
                        'loss_separation', 'pipe_risk', 'anomaly_flags']
        for key in required_keys:
            assert key in data, f"Missing NRW key: {key}"
        
        print(f"✓ /api/analytics/nrw returns complete NRW data")

    def test_demand_analytics_api(self):
        """Test /api/analytics/demand for Demand tab"""
        response = requests.get(f"{BASE_URL}/api/analytics/demand")
        assert response.status_code == 200
        data = response.json()
        
        required_keys = ['forecast', 'heatmap', 'segments', 'seasonal_trend', 'summary']
        for key in required_keys:
            assert key in data, f"Missing demand key: {key}"
        
        print(f"✓ /api/analytics/demand returns complete demand data")

    def test_asset_health_api(self):
        """Test /api/analytics/asset-health for Asset Health tab"""
        response = requests.get(f"{BASE_URL}/api/analytics/asset-health")
        assert response.status_code == 200
        data = response.json()
        
        required_keys = ['assets', 'break_history', 'maintenance_schedule', 'summary']
        for key in required_keys:
            assert key in data, f"Missing asset health key: {key}"
        
        print(f"✓ /api/analytics/asset-health returns complete asset data")

    def test_water_quality_api(self):
        """Test /api/analytics/water-quality for Water Quality tab"""
        response = requests.get(f"{BASE_URL}/api/analytics/water-quality")
        assert response.status_code == 200
        data = response.json()
        
        required_keys = ['quality_parameters', 'decay_curve', 'spatial_quality', 
                        'contamination_events', 'predictions', 'summary']
        for key in required_keys:
            assert key in data, f"Missing water quality key: {key}"
        
        print(f"✓ /api/analytics/water-quality returns complete quality data")


class TestCoreAPIs:
    """Regression tests for core API endpoints"""

    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ /api/ returns 200 OK")

    def test_stats_endpoint(self):
        """Test system stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data['total_sensors'] == 27
        print(f"✓ /api/stats returns valid data with {data['total_sensors']} sensors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
