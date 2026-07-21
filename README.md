# Crime Analytics Dashboard

## Run locally

```powershell
npm start
```

Open `http://localhost:3000`.

## Data and current capabilities

The application persists case data in `data.json` and exposes Express APIs for case creation, filtering, case status changes, FIR extraction, alert scans, dashboard statistics, and data-backed assistant answers. Use **Load CSV** to import the Karnataka Police FIR CSV in the browser; the UI derives the visible aggregates from the imported records.

## Production integrations still required

This repository did not contain a MongoDB connection, JWT secret/user store, Socket.IO service, trained model artifact, or an eligible labelled training dataset. Do not treat the present rule-based risk scores or text extraction as a trained AI model. To deploy this for real investigations, configure MongoDB, an authenticated upload store, role-based JWT middleware, Socket.IO, and a separately trained and evaluated model using approved data.

## API endpoints

- `GET /api/data`, `GET /api/stats`
- `GET /api/search?q=&status=&risk=&offence=&district=&page=&limit=`
- `POST /api/cases`, `PUT /api/cases/:id/status`
- `POST /api/fir/analyze`, `GET /api/alerts/scan`
- `POST /api/assistant`
