import requests
import sys
import json
from datetime import datetime

class DigitalTwinAPITester:
    def __init__(self, base_url="https://liquid-ops-twin.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text) if response.text else 0
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                        result["response_items"] = len(response_data)
                    elif isinstance(response_data, dict):
                        print(f"   Response: Dict with keys: {list(response_data.keys())}")
                        result["response_keys"] = list(response_data.keys())
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                result["error_response"] = response.text[:200]

            self.test_results.append(result)
            return success, response.json() if success and response.text else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "TIMEOUT",
                "success": False,
                "error": "Request timeout"
            }
            self.test_results.append(result)
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_system_stats(self):
        """Test system statistics endpoint"""
        success, response = self.run_test("System Stats", "GET", "stats", 200)
        if success:
            required_fields = ["total_flow", "avg_pressure", "active_alerts", "anomalies_detected", "online_sensors", "total_sensors"]
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"⚠️  Warning: Missing fields in stats response: {missing_fields}")
            else:
                print(f"   Stats: Flow={response.get('total_flow')}L/min, Pressure={response.get('avg_pressure')}bar, Alerts={response.get('active_alerts')}")
        return success

    def test_latest_sensors(self):
        """Test latest sensor readings endpoint"""
        success, response = self.run_test("Latest Sensors", "GET", "sensors/latest", 200)
        if success and isinstance(response, list):
            if len(response) > 0:
                sensor = response[0]
                required_fields = ["instrument_id", "instrument_name", "type", "value", "unit", "status"]
                missing_fields = [field for field in required_fields if field not in sensor]
                if missing_fields:
                    print(f"⚠️  Warning: Missing fields in sensor response: {missing_fields}")
                else:
                    print(f"   Sample sensor: {sensor.get('instrument_name')} = {sensor.get('value')} {sensor.get('unit')} ({sensor.get('status')})")
        return success

    def test_alerts(self):
        """Test alerts endpoint"""
        success, response = self.run_test("Active Alerts", "GET", "alerts?acknowledged=false", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} active alerts")
            if len(response) > 0:
                alert = response[0]
                print(f"   Sample alert: {alert.get('type')} - {alert.get('message')[:50]}...")
        return success

    def test_anomalies(self):
        """Test anomalies endpoint"""
        success, response = self.run_test("Anomalies", "GET", "anomalies", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} anomalies")
            if len(response) > 0:
                anomaly = response[0]
                print(f"   Sample anomaly: {anomaly.get('anomaly_type')} - {anomaly.get('description')[:50]}...")
        return success

    def test_ai_query(self):
        """Test AI query endpoint with Claude Sonnet 4.5"""
        test_query = "What is the current system status?"
        success, response = self.run_test(
            "AI Query", 
            "POST", 
            "ai/query", 
            200, 
            data={"query": test_query, "session_id": f"test-{datetime.now().timestamp()}"},
            timeout=60  # AI queries may take longer
        )
        if success:
            ai_response = response.get('response', '')
            print(f"   AI Response length: {len(ai_response)} characters")
            print(f"   AI Response preview: {ai_response[:100]}...")
        return success

    def test_acknowledge_alert(self):
        """Test alert acknowledgment - first get an alert, then acknowledge it"""
        # First get alerts
        success, alerts = self.run_test("Get Alerts for Ack", "GET", "alerts?acknowledged=false", 200)
        if success and isinstance(alerts, list) and len(alerts) > 0:
            alert_id = alerts[0]['id']
            success, response = self.run_test(
                "Acknowledge Alert", 
                "POST", 
                f"alerts/{alert_id}/acknowledge", 
                200
            )
            return success
        else:
            print("   No alerts available to acknowledge")
            return True  # Not a failure if no alerts exist

    def test_sensor_analytics(self):
        """Test the sensor analytics endpoint with time range filtering (UPDATED FEATURE)"""
        print("\n=== Testing Sensor Analytics with Time Range Filtering ===")
        
        # First get available sensors
        success, sensors = self.run_test("Get Sensors for Analytics", "GET", "sensors/latest", 200)
        if not success or not sensors:
            print("❌ Cannot test analytics - no sensors available")
            return False

        analytics_results = []
        test_instruments = ["FIT_10", "PIT_M1", "pH_001"]  # Test key instruments
        time_ranges = ["1h", "6h", "24h", "7d", "all"]  # NEW: Test different time ranges
        
        for instrument_id in test_instruments:
            print(f"\n   Testing {instrument_id} with different time ranges:")
            
            for time_range in time_ranges:
                success, analytics = self.run_test(
                    f"Analytics {instrument_id} ({time_range})", 
                    "GET", 
                    f"sensors/{instrument_id}/analytics?time_range={time_range}", 
                    200
                )
                
                if success and analytics:
                    # Validate analytics structure
                    required_fields = ['instrument', 'time_series', 'stats', 'thresholds', 'recent_alerts', 'recent_anomalies']
                    missing_fields = [field for field in required_fields if field not in analytics]
                    
                    if missing_fields:
                        print(f"     ⚠️  Missing fields for {instrument_id} ({time_range}): {missing_fields}")
                        analytics_results.append({'instrument_id': instrument_id, 'time_range': time_range, 'success': False, 'issue': f"Missing fields: {missing_fields}"})
                    else:
                        # Validate time series data
                        ts = analytics.get('time_series', {})
                        if ts.get('timestamps') and ts.get('values'):
                            data_points = len(ts['timestamps'])
                            print(f"     📈 {time_range}: {data_points} data points")
                            
                            # Validate rolling averages match data points
                            if len(ts.get('rolling_avg_5', [])) != data_points or len(ts.get('rolling_avg_10', [])) != data_points:
                                print(f"     ⚠️  Rolling average lengths don't match data points")
                        
                        # Validate stats
                        stats = analytics.get('stats', {})
                        required_stats = ['current', 'min', 'max', 'mean', 'std_dev', 'data_points']
                        available_stats = [stat for stat in required_stats if stat in stats]
                        
                        if len(available_stats) == len(required_stats):
                            print(f"     📊 {time_range}: All stats available, {stats.get('data_points')} points")
                        else:
                            print(f"     ⚠️  {time_range}: Missing stats: {[s for s in required_stats if s not in stats]}")
                        
                        analytics_results.append({
                            'instrument_id': instrument_id,
                            'time_range': time_range,
                            'success': True,
                            'data_points': data_points,
                            'stats_count': len(available_stats)
                        })
                else:
                    print(f"     ❌ Analytics call failed for {instrument_id} ({time_range})")
                    analytics_results.append({'instrument_id': instrument_id, 'time_range': time_range, 'success': False, 'issue': 'API call failed'})

        # Test invalid instrument ID
        success, response = self.run_test(
            "Analytics for Invalid ID", 
            "GET", 
            "sensors/INVALID_ID/analytics", 
            404
        )
        
        if success:
            print("   ✅ Correctly returns 404 for invalid instrument ID")

        # Summary
        successful_analytics = [r for r in analytics_results if r['success']]
        print(f"\n   📈 Analytics Summary: {len(successful_analytics)}/{len(analytics_results)} tests passed")
        
        return len(successful_analytics) > 0

    def test_leak_detection(self):
        """Test the new leak detection endpoints (NEW FEATURE)"""
        print("\n=== Testing Leak Detection Endpoints (NEW FEATURE) ===")
        
        # Test active leaks endpoint
        success, leaks = self.run_test("Active Leaks", "GET", "leaks", 200)
        if success:
            print(f"   Found {len(leaks)} active leaks")
            if len(leaks) > 0:
                leak = leaks[0]
                required_fields = ['id', 'zone_id', 'zone_name', 'severity', 'estimated_loss', 'confidence', 'active', 'timestamp']
                missing_fields = [field for field in required_fields if field not in leak]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in leak response: {missing_fields}")
                else:
                    print(f"   Sample leak: {leak.get('zone_name')} - {leak.get('severity')} ({leak.get('estimated_loss')} L/min)")
        
        # Test leak zones endpoint
        success, zones = self.run_test("Leak Zones", "GET", "leaks/zones", 200)
        if success:
            print(f"   Found {len(zones)} leak zones")
            active_zones = [z for z in zones if z.get('has_leak')]
            print(f"   Active leak zones: {len(active_zones)}")
            
            if len(zones) > 0:
                zone = zones[0]
                required_fields = ['id', 'name', 'x', 'y', 'has_leak']
                missing_fields = [field for field in required_fields if field not in zone]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in zone response: {missing_fields}")
                else:
                    print(f"   Sample zone: {zone.get('name')} at ({zone.get('x')}, {zone.get('y')}) - Leak: {zone.get('has_leak')}")
                    if zone.get('has_leak'):
                        print(f"     Severity: {zone.get('severity')}, Loss: {zone.get('estimated_loss')} L/min, Confidence: {zone.get('confidence')}")
        
        return success

    def test_compliance_reports(self):
        """Test the new compliance reports endpoint (NEW FEATURE)"""
        print("\n=== Testing Compliance Reports Endpoint (NEW FEATURE) ===")
        
        time_ranges = ["1h", "6h", "24h", "7d", "30d"]
        
        for time_range in time_ranges:
            success, report = self.run_test(
                f"Compliance Report ({time_range})", 
                "GET", 
                f"reports/compliance?time_range={time_range}", 
                200
            )
            
            if success and report:
                required_fields = ['report_generated', 'range', 'range_start', 'range_end', 'compliance_data', 'alert_summary', 'total_leak_events']
                missing_fields = [field for field in required_fields if field not in report]
                
                if missing_fields:
                    print(f"   ⚠️  Missing fields in {time_range} report: {missing_fields}")
                else:
                    compliance_data = report.get('compliance_data', [])
                    alert_summary = report.get('alert_summary', {})
                    print(f"   📊 {time_range}: {len(compliance_data)} compliance instruments")
                    print(f"   🚨 {time_range}: {sum(alert_summary.values())} total alerts, {report.get('total_leak_events')} leak events")
                    
                    # Validate compliance data structure
                    if compliance_data:
                        sample = compliance_data[0]
                        required_compliance_fields = ['instrument_id', 'instrument_name', 'unit', 'low_limit', 'high_limit', 'readings_count', 'compliance_pct']
                        missing_compliance_fields = [field for field in required_compliance_fields if field not in sample]
                        if missing_compliance_fields:
                            print(f"     ⚠️  Missing compliance data fields: {missing_compliance_fields}")
                        else:
                            print(f"     ✅ Compliance data structure valid for {sample.get('instrument_name')}: {sample.get('compliance_pct')}% compliant")
            else:
                print(f"   ❌ Compliance report failed for {time_range}")
                return False
        
        return True

def main():
    print("🚀 Starting Digital Twin API Tests")
    print("=" * 50)
    
    tester = DigitalTwinAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_root_endpoint,
        tester.test_system_stats,
        tester.test_latest_sensors,
        tester.test_alerts,
        tester.test_anomalies,
        tester.test_sensor_analytics,  # UPDATED: Test analytics with time range filtering
        tester.test_leak_detection,    # NEW: Test leak detection endpoints
        tester.test_compliance_reports, # NEW: Test compliance reports endpoint
        tester.test_ai_query,
        tester.test_acknowledge_alert
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test method {test_method.__name__} failed with exception: {e}")
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": tester.tests_passed/tester.tests_run*100 if tester.tests_run > 0 else 0
            },
            "test_results": tester.test_results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())