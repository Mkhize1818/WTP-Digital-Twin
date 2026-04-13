import requests
import sys
from datetime import datetime, timedelta
import json

class DigitalTwinAPITester:
    def __init__(self, base_url="https://liquid-ops-twin.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    self.results.append({
                        "test": name,
                        "status": "PASSED",
                        "response_size": len(str(response_data)) if response_data else 0
                    })
                    return True, response_data
                except:
                    self.results.append({
                        "test": name,
                        "status": "PASSED",
                        "response_size": 0
                    })
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}...")
                self.results.append({
                    "test": name,
                    "status": "FAILED",
                    "error": f"Status {response.status_code}, expected {expected_status}"
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.results.append({
                "test": name,
                "status": "FAILED",
                "error": str(e)
            })
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("=== Testing Basic Endpoints ===")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Test system stats
        success, stats = self.run_test("System Stats", "GET", "stats", 200)
        if success and stats:
            print(f"   📊 Total Sensors: {stats.get('total_sensors', 'N/A')}")
            print(f"   📊 Online Sensors: {stats.get('online_sensors', 'N/A')}")
            print(f"   📊 Total Flow: {stats.get('total_flow', 'N/A')} L/min")
            print(f"   📊 Active Alerts: {stats.get('active_alerts', 'N/A')}")
        
        # Test latest sensors
        success, sensors = self.run_test("Latest Sensors", "GET", "sensors/latest", 200)
        if success and sensors:
            print(f"   📊 Sensor Count: {len(sensors)}")
            sensor_types = {}
            for sensor in sensors:
                sensor_type = sensor.get('type', 'unknown')
                sensor_types[sensor_type] = sensor_types.get(sensor_type, 0) + 1
            print(f"   📊 Sensor Types: {sensor_types}")
        
        return sensors if success else []

    def test_analytics_endpoints(self, sensors):
        """Test analytics endpoints with new date range functionality"""
        print("\n=== Testing Analytics Endpoints ===")
        
        if not sensors:
            print("❌ No sensors available for analytics testing")
            return
        
        # Test a few different sensor types
        test_sensors = []
        sensor_types_tested = set()
        
        for sensor in sensors:
            sensor_type = sensor.get('type')
            if sensor_type not in sensor_types_tested and len(test_sensors) < 5:
                test_sensors.append(sensor)
                sensor_types_tested.add(sensor_type)
        
        for sensor in test_sensors:
            instrument_id = sensor.get('instrument_id')
            instrument_name = sensor.get('instrument_name', 'Unknown')
            
            # Test default analytics (all data)
            success, analytics = self.run_test(
                f"Analytics Default - {instrument_name}",
                "GET",
                f"sensors/{instrument_id}/analytics",
                200
            )
            
            if success and analytics:
                time_series = analytics.get('time_series', {})
                timestamps = time_series.get('timestamps', [])
                values = time_series.get('values', [])
                print(f"   📊 Data Points: {len(timestamps)}")
                print(f"   📊 Value Range: {min(values) if values else 'N/A'} - {max(values) if values else 'N/A'}")
            
            # Test preset time range
            self.run_test(
                f"Analytics 24H Range - {instrument_name}",
                "GET",
                f"sensors/{instrument_id}/analytics",
                200,
                params={"time_range": "24h"}
            )
            
            # Test custom date range (last 2 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=2)
            
            success, custom_analytics = self.run_test(
                f"Analytics Custom Range - {instrument_name}",
                "GET",
                f"sensors/{instrument_id}/analytics",
                200,
                params={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            )
            
            if success and custom_analytics:
                custom_time_series = custom_analytics.get('time_series', {})
                custom_timestamps = custom_time_series.get('timestamps', [])
                print(f"   📊 Custom Range Data Points: {len(custom_timestamps)}")
            
            # Test invalid sensor ID
            self.run_test(
                "Analytics Invalid Sensor",
                "GET",
                "sensors/INVALID_ID/analytics",
                404
            )

    def test_other_endpoints(self):
        """Test other important endpoints"""
        print("\n=== Testing Other Endpoints ===")
        
        # Test alerts
        self.run_test("Alerts", "GET", "alerts", 200)
        self.run_test("Unacknowledged Alerts", "GET", "alerts", 200, params={"acknowledged": False})
        
        # Test anomalies
        self.run_test("Anomalies", "GET", "anomalies", 200)
        
        # Test leaks
        self.run_test("Active Leaks", "GET", "leaks", 200)
        self.run_test("Leak Zones", "GET", "leaks/zones", 200)
        
        # Test compliance report
        self.run_test("Compliance Report", "GET", "reports/compliance", 200)
        self.run_test("Compliance Report 7D", "GET", "reports/compliance", 200, params={"time_range": "7d"})

    def test_ai_integration(self):
        """Test AI integration"""
        print("\n=== Testing AI Integration ===")
        
        # Test AI query
        test_query = {
            "query": "What is the current system status?",
            "session_id": f"test_session_{datetime.now().strftime('%H%M%S')}"
        }
        
        success, ai_response = self.run_test(
            "AI Query",
            "POST",
            "ai/query",
            200,
            data=test_query
        )
        
        if success and ai_response:
            response_text = ai_response.get('response', '')
            print(f"   🤖 AI Response Length: {len(response_text)} characters")
            print(f"   🤖 AI Response Preview: {response_text[:100]}...")
        
        # Test chat history
        if success:
            self.run_test(
                "AI Chat History",
                "GET",
                f"ai/history/{test_query['session_id']}",
                200
            )

    def save_results(self):
        """Save test results to file"""
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "tests_run": self.tests_run,
            "tests_passed": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "detailed_results": self.results
        }
        
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n📄 Results saved to /app/backend_test_results.json")

def main():
    print("🚀 Starting Digital Twin API Testing")
    print("=" * 50)
    
    tester = DigitalTwinAPITester()
    
    # Run all tests
    sensors = tester.test_basic_endpoints()
    tester.test_analytics_endpoints(sensors)
    tester.test_other_endpoints()
    tester.test_ai_integration()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"📊 Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Save results
    tester.save_results()
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())