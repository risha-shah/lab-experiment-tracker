"""REST API for a student experiment tracker."""
import csv
import io
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(os.getenv("LAB_DB_PATH", str(Path(__file__).with_name("experiments.db"))))
app = FastAPI(title="Labnote API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(","), allow_methods=["GET", "POST", "DELETE"], allow_headers=["*"])

@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    finally:
        db.close()

def init_db():
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS experiments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          experiment_id INTEGER NOT NULL,
          trial TEXT NOT NULL, condition TEXT NOT NULL,
          value REAL NOT NULL, unit TEXT NOT NULL,
          FOREIGN KEY(experiment_id) REFERENCES experiments(id)
        );
        """)

init_db()

class ExperimentIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)

class MeasurementIn(BaseModel):
    trial: str = Field(min_length=1, max_length=80)
    condition: str = Field(min_length=1, max_length=120)
    value: float = Field(allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=40)

def get_experiment(db, eid):
    row = db.execute("SELECT * FROM experiments WHERE id=?", (eid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Experiment not found")
    return dict(row)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/experiments")
def list_experiments():
    with connect() as db:
        return [dict(r) for r in db.execute("SELECT * FROM experiments ORDER BY id DESC")]

@app.post("/api/experiments", status_code=201)
def create_experiment(data: ExperimentIn):
    with connect() as db:
        cur = db.execute("INSERT INTO experiments(title,description,created_at) VALUES(?,?,?)", (data.title.strip(), data.description.strip(), datetime.now(timezone.utc).isoformat()))
        return get_experiment(db, cur.lastrowid)

@app.get("/api/experiments/{eid}")
def detail(eid: int):
    with connect() as db:
        exp = get_experiment(db, eid)
        exp["measurements"] = [dict(r) for r in db.execute("SELECT * FROM measurements WHERE experiment_id=? ORDER BY id", (eid,))]
        return exp

@app.delete("/api/experiments/{eid}", status_code=204)
def delete_experiment(eid: int):
    with connect() as db:
        get_experiment(db, eid)
        db.execute("DELETE FROM measurements WHERE experiment_id=?", (eid,))
        db.execute("DELETE FROM experiments WHERE id=?", (eid,))

@app.post("/api/experiments/{eid}/measurements", status_code=201)
def add_measurement(eid: int, data: MeasurementIn):
    with connect() as db:
        get_experiment(db, eid)
        cur = db.execute("INSERT INTO measurements(experiment_id,trial,condition,value,unit) VALUES(?,?,?,?,?)", (eid,data.trial.strip(),data.condition.strip(),data.value,data.unit.strip()))
        return dict(db.execute("SELECT * FROM measurements WHERE id=?", (cur.lastrowid,)).fetchone())

@app.post("/api/experiments/{eid}/upload")
async def upload_csv(eid: int, file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Upload a .csv file")
    raw = await file.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        raise HTTPException(413, "CSV must be 1 MB or smaller")
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
        required = {"trial","condition","value","unit"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("Required columns: trial,condition,value,unit")
        rows = [MeasurementIn(**row) for row in reader]
        if not 1 <= len(rows) <= 1000:
            raise ValueError("CSV must contain 1 to 1000 rows")
    except Exception as exc:
        raise HTTPException(400, f"Invalid CSV: {exc}") from exc
    with connect() as db:
        get_experiment(db, eid)
        db.executemany("INSERT INTO measurements(experiment_id,trial,condition,value,unit) VALUES(?,?,?,?,?)", [(eid,r.trial.strip(),r.condition.strip(),r.value,r.unit.strip()) for r in rows])
    return {"imported":len(rows)}
