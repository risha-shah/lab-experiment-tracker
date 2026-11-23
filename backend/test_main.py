import importlib
from fastapi.testclient import TestClient

def test_lifecycle(tmp_path, monkeypatch):
    monkeypatch.setenv("LAB_DB_PATH", str(tmp_path / "test.db"))
    import main
    importlib.reload(main)
    with TestClient(main.app) as client:
        exp = client.post("/api/experiments", json={"title":"Temperature study"})
        assert exp.status_code == 201
        eid = exp.json()["id"]
        row = client.post(f"/api/experiments/{eid}/measurements", json={"trial":"1","condition":"20 C","value":2.5,"unit":"cm"})
        assert row.status_code == 201
        assert len(client.get(f"/api/experiments/{eid}").json()["measurements"]) == 1
        assert client.delete(f"/api/experiments/{eid}").status_code == 204
        assert client.get(f"/api/experiments/{eid}").status_code == 404

def test_csv_upload(tmp_path, monkeypatch):
    monkeypatch.setenv("LAB_DB_PATH", str(tmp_path / "test2.db"))
    import main
    importlib.reload(main)
    with TestClient(main.app) as client:
        eid = client.post("/api/experiments", json={"title":"CSV trial"}).json()["id"]
        response = client.post(f"/api/experiments/{eid}/upload", files={"file":("data.csv","trial,condition,value,unit\n1,low,1.3,cm\n2,high,2.2,cm\n","text/csv")})
        assert response.status_code == 200
        assert response.json()["imported"] == 2
