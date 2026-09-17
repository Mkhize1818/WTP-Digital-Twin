"""Tests for the new Geo Quality analytics endpoint."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://liquid-ops-twin.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def geo_data():
    r = requests.get(f"{BASE_URL}/api/analytics/geo-quality", timeout=30)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    return r.json()


def test_root_structure(geo_data):
    for k in ("timestamp", "zones", "env_trends", "summary"):
        assert k in geo_data, f"missing key {k}"


def test_zones_count_and_fields(geo_data):
    zones = geo_data["zones"]
    assert len(zones) == 8
    zone_ids = {z["id"] for z in zones}
    expected = {"GZ_INTAKE", "GZ_TREATMENT", "GZ_STORAGE", "GZ_PRODUCTION",
                "GZ_RECOVERY", "GZ_WWTP", "GZ_RUNOFF", "GZ_GROUNDWATER"}
    assert expected.issubset(zone_ids)
    for z in zones:
        for k in ("id", "name", "zone_type", "x", "y", "radius", "parameters",
                  "violations", "env_score", "risk_level"):
            assert k in z, f"zone missing {k}"
        assert len(z["parameters"]) == 8
        assert 0 <= z["env_score"] <= 100


def test_env_trends(geo_data):
    trends = geo_data["env_trends"]
    assert len(trends) == 24
    for t in trends:
        for k in ("timestamp", "hour", "tds_wwtp", "bod_wwtp", "cod_wwtp", "tss_wwtp"):
            assert k in t


def test_summary(geo_data):
    s = geo_data["summary"]
    for k in ("total_zones", "compliant_zones", "total_parameters_checked",
              "total_violations", "compliance_rate", "avg_env_score", "critical_zones"):
        assert k in s
    assert s["total_zones"] == 8
    assert s["total_parameters_checked"] == 8 * 8
    assert 0 <= s["compliance_rate"] <= 100
    assert 0 <= s["avg_env_score"] <= 100


def test_zone_parameter_fields(geo_data):
    param = geo_data["zones"][0]["parameters"][0]
    for k in ("param_id", "name", "unit", "value", "env_limit",
              "in_limit", "pct_of_limit", "severity"):
        assert k in param


# Regression: existing endpoints still work
@pytest.mark.parametrize("path", [
    "/api/stats",
    "/api/sensors/latest",
    "/api/water-balance",
    "/api/analytics/nrw",
    "/api/analytics/demand",
    "/api/analytics/asset-health",
    "/api/analytics/water-quality",
])
def test_existing_endpoints(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=30)
    assert r.status_code == 200, f"{path} -> {r.status_code}"
