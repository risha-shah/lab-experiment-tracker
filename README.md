# Labnote — Experiment Tracking Platform

A student-built full-stack web app for recording lab experiments, importing CSV measurements, and visualizing trial results. Inspired by the problem of scattered experiment data; not affiliated with Benchling.

## Features
- Create, browse, and delete experiments
- Save individual trial measurements (condition, value, unit)
- Upload CSV files with up to 1,000 measurements, maximum 1 MB
- Interactive line and bar charts with summary statistics
- Persistent local SQLite database and documented REST API
- Sample plant-growth experiment

## Stack
- **Frontend:** React, Vite, Recharts, Lucide React
- **Backend:** Python, FastAPI, SQLite

## Run locally

**Backend** (Python 3.10+):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
The API runs on http://localhost:8000 and API documentation is at http://localhost:8000/docs.

**Frontend** (Node.js 20+, in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

## CSV format
An example file is in `examples/plant_growth.csv`.

```csv
trial,condition,value,unit
1,15°C,2.1,cm
2,20°C,3.2,cm
```

## Backend tests
```bash
cd backend
pip install pytest httpx
pytest -q
```

## Deployment notes
Set `VITE_API_URL` to the backend base URL when building the frontend. Configure `FRONTEND_ORIGINS` to allow your deployed frontend origin.

## Scope
This is a personal portfolio project, not a production laboratory information management system. It does not have user accounts, collaboration, permissions, audit trails, unit conversions, or hosted deployment. It is intended for learning and local demonstration.
