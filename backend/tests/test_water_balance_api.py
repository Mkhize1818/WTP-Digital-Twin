"""
Test suite for Water Balance API endpoint
Tests the enhanced /api/water-balance endpoint with:
- balance_summary with m³/d conversions
- facilities (5 entries)
- hourly_balance (24 entries)
- quality_balance (6 entries)
- enhanced losses (evaporation, seepage, etc.)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestWaterBalanceAPI:
    """Water Balance endpoint tests"""

    def test_water_balance_endpoint_returns_200(self):
        """Test that /api/water-balance returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/water-balance returns 200 OK")

    def test_water_balance_has_required_keys(self):
        """Test that response contains all required top-level keys"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        required_keys = [
            'timestamp', 'intake', 'treatment', 'distribution', 'recovery',
            'wastewater', 'losses', 'balance_summary', 'efficiency',
            'total_system_water', 'facilities', 'hourly_balance', 'quality_balance', 'flow_paths'
        ]
        
        for key in required_keys:
            assert key in data, f"Missing required key: {key}"
        
        print(f"✓ All {len(required_keys)} required keys present")

    def test_balance_summary_structure(self):
        """Test balance_summary contains m³/d conversions"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        bs = data.get('balance_summary', {})
        required_fields = [
            'total_inflows', 'total_inflows_m3d',
            'total_outflows', 'total_outflows_m3d',
            'total_recovery', 'change_in_storage', 'change_in_storage_m3d',
            'balance_check_pct'
        ]
        
        for field in required_fields:
            assert field in bs, f"Missing balance_summary field: {field}"
            assert isinstance(bs[field], (int, float)), f"{field} should be numeric"
        
        # Verify m³/d conversion (1 L/min = 1.44 m³/d)
        expected_m3d = round(bs['total_inflows'] * 1.44, 1)
        assert abs(bs['total_inflows_m3d'] - expected_m3d) < 1, "m³/d conversion incorrect"
        
        print(f"✓ balance_summary has all fields with m³/d conversions")
        print(f"  - Total Inflows: {bs['total_inflows']} L/min = {bs['total_inflows_m3d']} m³/d")

    def test_facilities_count_and_structure(self):
        """Test that facilities array has 5 entries with correct structure"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        facilities = data.get('facilities', [])
        assert len(facilities) == 5, f"Expected 5 facilities, got {len(facilities)}"
        
        expected_names = ['Main Reservoir', 'Treatment Plant', 'Distribution System', 'Recovery System', 'WWTP']
        actual_names = [f['name'] for f in facilities]
        
        for name in expected_names:
            assert name in actual_names, f"Missing facility: {name}"
        
        # Check structure of first facility
        facility = facilities[0]
        assert 'name' in facility
        assert 'inflows' in facility and isinstance(facility['inflows'], list)
        assert 'outflows' in facility and isinstance(facility['outflows'], list)
        assert 'storage_change' in facility
        
        # Check inflow/outflow structure
        if facility['inflows']:
            inflow = facility['inflows'][0]
            assert 'label' in inflow
            assert 'value' in inflow
        
        print(f"✓ 5 facilities present: {actual_names}")

    def test_hourly_balance_count_and_structure(self):
        """Test that hourly_balance has 24 entries (24 hours)"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        hourly = data.get('hourly_balance', [])
        assert len(hourly) == 24, f"Expected 24 hourly entries, got {len(hourly)}"
        
        # Check structure of first entry
        entry = hourly[0]
        required_fields = ['timestamp', 'hour', 'inflows', 'outflows', 'losses', 'recovery', 'net']
        
        for field in required_fields:
            assert field in entry, f"Missing hourly_balance field: {field}"
        
        # Verify hour format (HH:00)
        assert ':00' in entry['hour'], f"Hour format should be HH:00, got {entry['hour']}"
        
        print(f"✓ 24 hourly balance entries present")
        print(f"  - Sample: {entry['hour']} - Inflows: {entry['inflows']}, Outflows: {entry['outflows']}")

    def test_quality_balance_count_and_structure(self):
        """Test that quality_balance has 6 measurement points"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        quality = data.get('quality_balance', [])
        assert len(quality) == 6, f"Expected 6 quality points, got {len(quality)}"
        
        expected_points = [
            'Municipal Intake', 'Post-RO Treatment', 'Post-NACF',
            'Treated Water (Distribution)', 'Recovery Return', 'WWTP Discharge'
        ]
        actual_points = [q['point'] for q in quality]
        
        for point in expected_points:
            assert point in actual_points, f"Missing quality point: {point}"
        
        # Check structure
        entry = quality[0]
        required_fields = ['point', 'tds_mg_l', 'flow_l_min', 'salt_load_kg_d']
        
        for field in required_fields:
            assert field in entry, f"Missing quality_balance field: {field}"
        
        # Verify salt load calculation: kg/d = TDS(mg/L) * flow(L/min) * 1.44 / 1000
        expected_salt = round(entry['tds_mg_l'] * entry['flow_l_min'] * 1.44 / 1000, 2)
        assert abs(entry['salt_load_kg_d'] - expected_salt) < 0.5, "Salt load calculation incorrect"
        
        print(f"✓ 6 quality balance points present")
        print(f"  - Sample: {entry['point']} - TDS: {entry['tds_mg_l']} mg/L, Salt: {entry['salt_load_kg_d']} kg/d")

    def test_losses_structure(self):
        """Test that losses contains all required categories"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        losses = data.get('losses', {})
        required_fields = ['treatment', 'evaporation', 'seepage', 'leak_losses', 'unaccounted', 'total']
        
        for field in required_fields:
            assert field in losses, f"Missing losses field: {field}"
            assert isinstance(losses[field], (int, float)), f"{field} should be numeric"
        
        # Verify total is sum of components
        component_sum = (losses['treatment'] + losses['evaporation'] + 
                        losses['seepage'] + losses['leak_losses'] + losses['unaccounted'])
        assert abs(losses['total'] - component_sum) < 0.5, "Total losses doesn't match sum of components"
        
        print(f"✓ Losses structure correct")
        print(f"  - Treatment: {losses['treatment']}, Evaporation: {losses['evaporation']}, Seepage: {losses['seepage']}")
        print(f"  - Leak: {losses['leak_losses']}, Unaccounted: {losses['unaccounted']}, Total: {losses['total']}")

    def test_efficiency_metrics(self):
        """Test efficiency metrics are present and valid percentages"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        efficiency = data.get('efficiency', {})
        required_fields = ['water_use_ratio', 'recovery_rate', 'loss_rate', 'system_efficiency']
        
        for field in required_fields:
            assert field in efficiency, f"Missing efficiency field: {field}"
            value = efficiency[field]
            assert isinstance(value, (int, float)), f"{field} should be numeric"
            assert 0 <= value <= 100, f"{field} should be 0-100%, got {value}"
        
        # Verify system_efficiency = 100 - loss_rate
        expected_sys_eff = round(100 - efficiency['loss_rate'], 1)
        assert abs(efficiency['system_efficiency'] - expected_sys_eff) < 0.5, "System efficiency calculation incorrect"
        
        print(f"✓ Efficiency metrics valid")
        print(f"  - System: {efficiency['system_efficiency']}%, Water Use: {efficiency['water_use_ratio']}%")
        print(f"  - Recovery: {efficiency['recovery_rate']}%, Loss: {efficiency['loss_rate']}%")

    def test_intake_structure(self):
        """Test intake data structure with multiple sources"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        intake = data.get('intake', {})
        required_fields = ['municipal', 'rainfall_runoff', 'borehole', 'total', 'total_m3d']
        
        for field in required_fields:
            assert field in intake, f"Missing intake field: {field}"
        
        # Check municipal structure
        municipal = intake['municipal']
        assert 'flow_rate' in municipal
        assert 'unit' in municipal
        assert municipal['unit'] == 'L/min'
        
        print(f"✓ Intake structure correct")
        print(f"  - Municipal: {intake['municipal']['flow_rate']} L/min")
        print(f"  - Rainfall: {intake['rainfall_runoff']['flow_rate']} L/min")
        print(f"  - Borehole: {intake['borehole']['flow_rate']} L/min")
        print(f"  - Total: {intake['total']} L/min = {intake['total_m3d']} m³/d")

    def test_distribution_structure(self):
        """Test distribution data with production line breakdown"""
        response = requests.get(f"{BASE_URL}/api/water-balance")
        assert response.status_code == 200
        data = response.json()
        
        dist = data.get('distribution', {})
        required_fields = ['cip_lines', 'pet_lines', 'canline', 'syrup_room', 'total']
        
        for field in required_fields:
            assert field in dist, f"Missing distribution field: {field}"
        
        # Check line structure
        cip = dist['cip_lines']
        assert 'flow_rate' in cip
        assert 'label' in cip
        
        print(f"✓ Distribution structure correct")
        print(f"  - CIP: {dist['cip_lines']['flow_rate']}, PET: {dist['pet_lines']['flow_rate']}")
        print(f"  - Canline: {dist['canline']['flow_rate']}, Syrup: {dist['syrup_room']['flow_rate']}")
        print(f"  - Total Production: {dist['total']} L/min")


class TestOtherEndpoints:
    """Regression tests for other API endpoints"""

    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert 'message' in data
        print("✓ /api/ returns 200 OK")

    def test_stats_endpoint(self):
        """Test system stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ['total_flow', 'avg_pressure', 'active_alerts', 
                          'anomalies_detected', 'online_sensors', 'total_sensors']
        
        for field in required_fields:
            assert field in data, f"Missing stats field: {field}"
        
        print(f"✓ /api/stats returns valid data")
        print(f"  - Total Flow: {data['total_flow']} L/min, Sensors: {data['online_sensors']}/{data['total_sensors']}")

    def test_sensors_latest_endpoint(self):
        """Test latest sensors endpoint"""
        response = requests.get(f"{BASE_URL}/api/sensors/latest")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one sensor"
        
        # Check sensor structure
        sensor = data[0]
        required_fields = ['instrument_id', 'instrument_name', 'type', 'value', 'unit', 'status']
        
        for field in required_fields:
            assert field in sensor, f"Missing sensor field: {field}"
        
        print(f"✓ /api/sensors/latest returns {len(data)} sensors")

    def test_leaks_zones_endpoint(self):
        """Test leak zones endpoint"""
        response = requests.get(f"{BASE_URL}/api/leaks/zones")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 6, f"Expected 6 leak zones, got {len(data)}"
        
        print(f"✓ /api/leaks/zones returns 6 zones")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
