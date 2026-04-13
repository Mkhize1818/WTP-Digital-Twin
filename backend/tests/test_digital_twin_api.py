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
