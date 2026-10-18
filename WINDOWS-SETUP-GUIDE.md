# 🏪 Jai Shakti Business Hub — Shop Windows PC & Antigravity Guide

This guide contains everything you need to run, use, and continue developing **Jai Shakti Business Hub** on your **Shop Windows PC** using **Google Antigravity** directly from your **Extreme SSD**.

---

## 📦 What is Packed in this Folder (`jaishakti-business-hub`)

Everything is 100% self-contained in this single folder on your SSD:

1. **Frontend & UI (`client/`)**: Complete React + Vite source code with Gujarati/English bilingual interface, Expense modals, Voice input, Bill OCR scanner, and Vendor management.
2. **Backend API (`server/`)**: Express REST API, SQLite database engine, receipt upload processor, local Tesseract OCR engine, and Gemini Vision OCR integration.
3. **Live Business Database (`data/jaishakti.sqlite`)**: All your active business categories, registered vendors, expense records, payments, and audit logs from your Mac Mini session.
4. **Receipts & Bill Photos (`uploads/`)**: All high-resolution photos and bill attachments.
5. **Backups (`backups/`)**: Timestamped ZIP disaster recovery backups.
6. **Pre-built Production Assets (`server/public/`)**: Production web build ready for instant 1-click launch without compiling.
7. **Offline OCR Model (`eng.traineddata`)**: Offline neural OCR language model for extracting vendor bills.
8. **1-Click Windows Launchers**:
   - `START-JAI-SHAKTI.bat` — 1-click launcher for daily shop usage.
   - `START-DEV.bat` — 1-click launcher for developing in Antigravity with live hot-reload.
   - `SETUP-WINDOWS.bat` — 1-click installer that sets up Windows native modules.
   - `STOP-JAI-SHAKTI.bat` — Gracefully stops background processes and flushes the database.
   - `BACKUP-DATA.bat` — 1-click instant backup.
   - `HEALTH-CHECK.bat` — Tests database and server health.

---

## 🚀 Before Leaving the Mac Mini (Step 0)

1. Open Terminal on the Mac Mini in this folder.
2. Run `./stop-mac.sh` (or press `Ctrl+C` in the terminal running the server).
   - This ensures SQLite flushes all memory and Write-Ahead Log (WAL) data cleanly into `jaishakti.sqlite`.
3. Safely Eject the **Extreme SSD** from macOS (right-click the drive on Desktop -> **Eject**).

---

## 💻 At the Shop Windows PC: Step-by-Step Instructions

### Step 1: Connect your SSD
- Plug your **Extreme SSD** into any USB 3.0 port on the Shop Windows PC.
- Open **File Explorer** (`Win + E`) and locate your SSD drive (for example `D:\` or `E:\`).
- You will see the folder: `jay shakti business HUB` containing `jaishakti-business-hub`.

---

### Step 2: Install Node.js (Only if not already installed)
1. Check if Node.js is installed:
   - Double-click **`SETUP-WINDOWS.bat`**.
   - If Node.js is missing, it will automatically open the official download page: [https://nodejs.org/](https://nodejs.org/)
2. Download and run the **LTS installer** (Windows x64 .msi).
3. Follow the setup wizard (accept defaults, click Next until Finish).

---

### Step 3: First-Time Windows Setup (1-Click)
- In the folder, double-click **`SETUP-WINDOWS.bat`**.
- It will automatically:
  - Install dependencies and compile the Windows prebuilt binaries for `better-sqlite3` and `sharp` (preventing any Mac-to-Windows architecture issues).
  - Verify your SQLite database connectivity.
  - Apply any database schema migrations.
  - Ensure the production frontend bundle is ready.

*(Note: You only need to run this once when first setting up on a new PC, or whenever new npm packages are added).*

---

### Step 4: Linking to Antigravity on Windows (For Further Development)

To continue developing the remaining parts of Jai Shakti Business Hub (e.g. Sales, Inventory, Billing, Reports):

1. Open **Google Antigravity** on your Shop Windows PC.
2. Click **Open Folder** (or **File > Open Folder...**).
3. Browse to your SSD and select the folder:
   ```text
   E:\jay shakti business HUB\jaishakti-business-hub
   ```
   *(Or `D:\...` depending on your drive letter).*
4. Once linked:
   - Antigravity will index the entire codebase, full client, backend, database models, and tests.
   - You can prompt Antigravity to build new features, add pages, refactor logic, or run tests.

---

### Step 5: How to Run the App on Windows

You have two easy ways to run the app depending on what you are doing:

#### Option A: Active Development Mode (With Live Hot-Reload)
*Use this while coding with Antigravity!*
- Double-click **`START-DEV.bat`** (or in Antigravity's terminal run `npm run dev`).
- This starts:
  - Backend API on `http://localhost:3000` (with auto-restart on file changes)
  - Vite Frontend Dev Server on `http://localhost:5173` (with instant Hot Module Replacement)
- Automatically opens `http://localhost:5173` in your browser. Any edit you or Antigravity make to the code will update in the browser instantly!

#### Option B: Shop Operational Mode (Fast & Silent)
*Use this for daily counter sales and staff expense entry!*
- Double-click **`START-JAI-SHAKTI.bat`**.
- Starts the production server in the background and opens `http://localhost:3000` in Google Chrome / Edge.
- When done for the day, double-click **`STOP-JAI-SHAKTI.bat`**.

---

## 📱 Accessing from Mobile Phones & Tablets at the Shop

Any smartphone or tablet connected to the shop's Wi-Fi router can access the app:
1. On the Windows PC, open Command Prompt (`cmd`) and type `ipconfig`.
2. Find the **IPv4 Address** (e.g. `192.168.1.45`).
3. On the phone/tablet browser, open:
   ```text
   http://192.168.1.45:3000
   ```
4. Bookmark it on the phone home screen as a Web App!

---

## 🛡️ Default Login Credentials

| Role | Username | Password | Privileges |
|---|---|---|---|
| **Owner (માલિક)** | `admin` | `adminpassword123` | Full access, settings, approvals, voids, backup |
| **Manager (મેનેજર)** | `manager` | `managerpassword123` | Daily operations, expense approval, vendor management |
| **Staff (સ્ટાફ)** | `staff` | `staffpassword123` | Quick 1-tap expense recording |
| **Accountant (એકાઉન્ટન્ટ)** | `accountant` | `accountantpassword123` | Reports, ledgers, CSV exports |

---

## 🔄 Moving Back to Mac Mini

If you want to plug the SSD back into the Mac Mini:
1. Double-click `STOP-JAI-SHAKTI.bat` on Windows.
2. Safely Eject the SSD from Windows (taskbar icon -> Eject).
3. Plug into the Mac Mini.
4. In Terminal:
   ```bash
   cd "/Volumes/Extreme SSD/jay shakti business HUB/jaishakti-business-hub"
   ./start-mac.sh
   ```
Everything is 100% synchronized!
