# KeyLock — Barcode / QR Access Control System

A secure key-lock access control system that issues HMAC-signed barcodes / QR
codes and validates them at scan time. Django REST + Channels backend, React
(Vite + MUI) frontend.

## Features

- Generate signed, tamper-proof **barcodes** or **QR codes** with an expiry.
- **Scan validation** pipeline (signature + expiry + status) with immutable audit logs.
- Barcode lifecycle: **create, edit (label), reissue (new expiry), revoke, delete**.
- Real-time lock events over WebSockets (Django Channels).
- JWT auth with role-based access (admin / operator / device).

## Tech stack

| Layer     | Stack                                             |
|-----------|---------------------------------------------------|
| Backend   | Django 6, Django REST Framework, Channels/Daphne  |
| Auth      | SimpleJWT                                          |
| Database  | SQLite (dev) or PostgreSQL                         |
| Frontend  | React 18, Vite, Material UI                        |

## Backend setup

```bash
cd backend_qrcode
python -m venv ../env
../env/Scripts/activate        # Windows: ..\env\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env           # then edit values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

> A convenience `manage.py` shim at the repo root lets you run
> `python manage.py <cmd>` from the project root too.

The API runs at http://127.0.0.1:8000 (docs at `/api/docs/`).

### Database

Defaults to SQLite. To use PostgreSQL, set `DB_ENGINE=postgres` and the
`POSTGRES_*` values in `.env`.

### Realtime

Uses an in-memory channel layer by default (no Redis needed for dev). Set
`CHANNEL_BACKEND=redis` with `REDIS_HOST`/`REDIS_PORT` to use Redis.

## Frontend setup

```bash
cd keylock-frontend
npm install
npm run dev
```

Runs at http://localhost:5173.

## License

Provided as-is for educational / demonstration purposes.
