You are a senior full-stack software engineer and system architect.

The project environment is already set up:
- Django + DRF + Channels are installed
- React (Vite) is installed
- Docker & docker-compose are configured
- PostgreSQL and Redis are running
- All dependencies are already installed

DO NOT include any installation steps or dependency setup.

==================================================
PROJECT GOAL
==================================================

Implement a production-ready **Barcode Management System** for secure key-lock / access control.

The system must be secure, scalable, and cleanly structured.

==================================================
CORE REQUIREMENTS
==================================================

### 1. Barcode Domain Model
- Create a barcode entity with:
  - unique identifier
  - status (active, expired, revoked)
  - expiry timestamp
  - creation timestamp
- Barcodes must not store raw secrets.

---

### 2. Secure Barcode Payload
- Implement a service to:
  - generate signed and tamper-proof barcode payloads
  - validate barcode payloads
- Payload must:
  - be non-guessable
  - include expiry
  - fail validation if altered

---

### 3. Barcode Generation Service
- Generate Code128 barcode images server-side
- Store barcode image securely
- Return image URL or base64 to frontend

---

### 4. Barcode Validation API
- Create an API endpoint to receive scanned barcode data
- Validate:
  - signature
  - expiry
  - revoked status
- Return:
  - ALLOW or DENY
- Never trust frontend validation

---

### 5. Real-Time Lock Events
- Using Django Channels:
  - emit UNLOCK event on valid barcode
  - emit DENIED event on invalid barcode
- Events must be scoped to device/lock

---

### 6. Audit Logging
- Log every scan attempt with:
  - barcode id
  - device id
  - timestamp
  - result
- Logs must be immutable

---

### 7. Authentication & Authorization
- Use JWT authentication
- Enforce role-based access:
  - Admin
  - Operator
  - Device

---

### 8. Frontend Implementation
- Admin dashboard:
  - generate barcodes
  - list barcodes
  - revoke barcodes
  - view access logs
- Scanner page:
  - camera-based scanning
  - instant feedback
  - real-time response from backend

Frontend must:
- send scan data only
- never validate barcode logic

---

==================================================
ARCHITECTURE RULES
==================================================

- Backend is API-only
- Business logic must live in services
- Views must remain thin
- Use serializers properly
- No hardcoded secrets
- Clean folder structure
- Production-grade error handling

==================================================
OUTPUT INSTRUCTIONS
==================================================

Proceed step-by-step:

STEP 1 — Define backend models
STEP 2 — Implement barcode signing & validation service
STEP 3 — Implement barcode generation logic
STEP 4 — Implement validation API endpoint
STEP 5 — Implement WebSocket lock events
STEP 6 — Implement audit logging
STEP 7 — Implement frontend pages & scanner UI
STEP 8 — Explain how components interact (briefly)

Do NOT:
- repeat setup steps
- include dependency installation
- generate placeholder code

Ask clarification questions only if absolutely necessary.

Write clean, maintainable, production-quality code.
