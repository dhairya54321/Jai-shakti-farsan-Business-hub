# Jai Shakti Business Hub — macOS Development Guide (Mac mini)

Welcome to the development environment for **Jai Shakti Farsan Mart**'s Business Hub (Phase 1: Daily Expenses Management System).

---

## 1. Prerequisites on macOS

- **macOS**: macOS 12 Monterey or newer (optimized for Apple Silicon & Intel)
- **Node.js**: v18.x or v20.x (Recommended: v20 LTS via `nvm` or `brew install node`)
- **npm**: v9+ or v10+

---

## 2. Quick Setup

From the `jaishakti-business-hub-mac` folder, run:

```bash
chmod +x *.sh
./setup-mac.sh
```

This script:
1. Verifies your Node.js and npm versions.
2. Creates `.env` from `.env.example` in the core project.
3. Installs all required backend and frontend dependencies.
4. Executes database migrations and seeds initial Gujarati/English categories, roles, and default vendors.

---

## 3. Daily Development Commands

| Script | Purpose | Command |
|---|---|---|
| **Start Server & Web App** | Runs server on `http://localhost:3000` | `./start-mac.sh` |
| **Stop Server** | Safely terminates running instance on port 3000 | `./stop-mac.sh` |
| **Run Automated Tests** | Executes 19 verification test suites | `./test-mac.sh` |
| **Build Frontend** | Compiles React UI into `server/public` | `./build-mac.sh` |
| **Run Migrations** | Applies SQLite schema migrations | `./migrate-mac.sh` |
| **Package for Windows** | Compiles & populates `jaishakti-business-hub-windows` | `./package-windows.sh` |

---

## 4. Default Credentials (Seeded)

| Role | Username | Password | Notes |
|---|---|---|---|
| **Owner (માલિક)** | `admin` | `adminpassword123` | Full access, settings, approvals, voids, backup |
| **Manager (મેનેજર)** | `manager` | `managerpassword123` | Can approve expenses, manage categories & vendors |
| **Staff (સ્ટાફ)** | `staff` | `staffpassword123` | Quick & detailed expense entry |
| **Accountant (એકાઉન્ટન્ટ)** | `accountant` | `accountantpassword123` | Financial reports, cash ledger, CSV exports |

---

## 5. Mac-to-Windows Deployment Workflow

1. Finish your code changes and run `./test-mac.sh` to ensure all tests pass.
2. Run `./package-windows.sh`. This builds the optimized React bundle and synchronizes code into `jaishakti-business-hub-windows/app/`.
3. Copy the entire `jaishakti-business-hub-windows` folder to a USB drive.
4. Paste it onto the Windows shop PC and double-click `START-JAI-SHAKTI.bat`.

---

## 6. Troubleshooting on macOS

- **Port 3000 already in use**:
  Run `./stop-mac.sh` to free the port, or change `PORT=3001` in `.env`.
- **Permission denied on shell scripts**:
  Run `chmod +x *.sh`.
- **Database lock errors**:
  Ensure only one server instance is running. The application uses SQLite Write-Ahead Logging (`WAL`), which requires process shutdown before direct file replacement.
