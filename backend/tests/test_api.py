import pytest
import sys
import os

# Ensure backend root is importable when pytest runs from this folder
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import the Flask app instance
from app import app


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


def test_root(client):
    # The application exposes a readiness/test endpoint at `/api/test`.
    resp = client.get("/api/test")
    assert resp.status_code == 200
    assert resp.is_json
    data = resp.get_json()
    assert "message" in data


def test_api_test(client):
    resp = client.get("/api/test")
    assert resp.status_code == 200
    assert resp.is_json
    data = resp.get_json()
    assert data.get("message") == "Flask backend is connected successfully!"
