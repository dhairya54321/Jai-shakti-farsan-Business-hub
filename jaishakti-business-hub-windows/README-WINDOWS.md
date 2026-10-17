# Jai Shakti Farsan Mart — Windows Shop PC Operational Guide

Welcome to the Windows deployment package for **Jai Shakti Farsan Mart**'s Business Hub (Phase 1: Daily Expenses Management System).

---

## 1. System Requirements on Shop PC

- **Operating System**: Windows 10, Windows 11, or Windows Server (64-bit)
- **Runtime**: Node.js LTS (v20 or v22). Download free from: [https://nodejs.org/](https://nodejs.org/)
- **Browser**: Google Chrome, Microsoft Edge, or Firefox
- **Internet Requirement**: **None.** The Daily Expenses module operates **100% offline** on local SQLite storage. Internet is only required if you optionally use cloud integrations in future phases.

---

## 2. Installation & First-Time Setup

1. Copy the entire `jaishakti-business-hub-windows` folder to any folder on your shop PC.
   *Example location*: `C:\Users\Shop Owner\Documents\Jai Shakti Business Hub`
   *(Space-containing folder names are fully supported).*
2. Double-click **`START-JAI-SHAKTI.bat`**.
   - If Node.js is not yet installed, it will prompt you and open the download page.
   - On the very first launch, it will automatically initialize the database with seed categories and launch the application in your browser at `http://localhost:3000`.

*(Optional)*: To create a Desktop shortcut, right-click `setup-windows.ps1` and choose **Run with PowerShell**.

---

## 3. Directory Layout & Data Separation

Your live business data is kept strictly separate from application program files:

```text
jaishakti-business-hub-windows/
  ├── START-JAI-SHAKTI.bat       <-- Double click to start app & open browser
  ├── STOP-JAI-SHAKTI.bat        <-- Stops the background server safely
  ├── HEALTH-CHECK.bat           <-- Verifies database and server health
  ├── BACKUP-DATA.bat            <-- Creates timestamped ZIP backup of data + receipts
  ├── RESTORE-DATA.bat           <-- Restores from a chosen backup file
  ├── UPDATE-JAI-SHAKTI.bat      <-- Updates app without touching live data
  ├── RUN-MIGRATIONS.bat         <-- Applies database schema updates
  ├── .env                       <-- Configuration settings
  ├── app/                       <-- Program files & built web interface
  ├── data/                      <-- Live SQLite database (jaishakti.sqlite)
  ├── uploads/                   <-- Uploaded bill and receipt photos
  ├── backups/                   <-- Timestamped backup archives
  └── logs/                      <-- Diagnostic server logs
```

> **Crucial Rule**: Updating or replacing files in `app/` will **never** delete or overwrite `data/`, `uploads/`, or `backups/`.

---

## 4. Default Team Accounts

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Owner (માલિક)** | `admin` | `adminpassword123` | Full administrative rights, settings, approvals, voids, backup/restore |
| **Manager (મેનેજર)** | `manager` | `managerpassword123` | Daily operations, expense approval, vendor management |
| **Staff (સ્ટાફ)** | `staff` | `staffpassword123` | Fast 1-tap quick expense recording |
| **Accountant (એકાઉન્ટન્ટ)** | `accountant` | `accountantpassword123` | Financial reports, cash outlay ledger, Excel CSV exports |

*You can change passwords or add new staff members at any time in the "Team & Permissions" screen.*

---

## 5. Daily Operations

### Starting the Application
Double-click `START-JAI-SHAKTI.bat`. The web interface opens automatically in your browser at `http://localhost:3000`.

### Stopping the Application
Double-click `STOP-JAI-SHAKTI.bat`. This gracefully checkpoints the SQLite Write-Ahead Log (WAL) and terminates the process without database corruption.

### Creating a Data Backup
Double-click `BACKUP-DATA.bat`. A timestamped archive like `jaishakti_backup_YYYYMMDD_HHMMSS.zip` is created inside the `backups/` folder.
*Tip*: Copy this ZIP archive to a USB pen drive once a week for off-site disaster recovery.

### Restoring from Backup
Double-click `RESTORE-DATA.bat`. Select the backup file. A safety backup of the current database is automatically created first before restoring.

### Accessing from Shop Mobile / Tablet
Any mobile phone or tablet connected to the shop's Wi-Fi router can access the application:
1. Open Command Prompt on the PC and type `ipconfig` to see the PC's IPv4 address (e.g. `192.168.1.45`).
2. On your phone's browser, open `http://192.168.1.45:3000`.
3. If prompted by Windows Defender Firewall on the PC, check "Private networks" and click **Allow access**.

---

## 6. Troubleshooting Guide for Shop Staff

### 1. Port already in use (EADDRINUSE: 3000)
- **Cause**: Another program or a previous instance of Jai Shakti is still running.
- **Fix**: Double-click `STOP-JAI-SHAKTI.bat` to terminate existing processes, then run `START-JAI-SHAKTI.bat` again. Or change `PORT=3001` in your `.env` file.

### 2. Database cannot be opened / locked
- **Cause**: Two server processes are attempting to open the database file concurrently, or another application opened the file exclusively.
- **Fix**: Run `STOP-JAI-SHAKTI.bat` to close background processes, then restart.

### 3. Upload directory not writable
- **Cause**: Windows folder permissions restricted write access.
- **Fix**: Right-click the `jaishakti-business-hub-windows` folder, select **Properties**, ensure **Read-only** is unchecked, and click OK.

### 4. Missing runtime (Node.js)
- **Cause**: Node.js is not installed on the shop PC.
- **Fix**: Download and install Node.js LTS from `https://nodejs.org/`. Restart your command prompt or computer after installing.

### 5. Missing environment variables (.env)
- **Cause**: `.env` file was deleted.
- **Fix**: Copy `.env.example` to `.env`. `START-JAI-SHAKTI.bat` will also do this automatically if `.env` is missing.

### 6. Windows Firewall prompt
- **Cause**: Windows detects a local server listening on port 3000.
- **Fix**: Click **Allow access** on Private networks so that phones and tablets in the shop can connect.

### 7. Backup failure
- **Cause**: The disk is full or the database file was locked by an active external lock.
- **Fix**: Ensure there is at least 500MB free space on your hard drive and run `BACKUP-DATA.bat`.

### 8. Restore failure
- **Cause**: Target backup ZIP is corrupt or missing `jaishakti.sqlite`.
- **Fix**: Inspect the backup archive in `backups/`. The restoration utility creates a pre-restore safety backup so no live data is lost.

### 9. Browser cannot connect (ERR_CONNECTION_REFUSED)
- **Cause**: The server process was closed or hasn't finished starting yet.
- **Fix**: Run `HEALTH-CHECK.bat` to see if the local server process is active. If not, run `START-JAI-SHAKTI.bat`.

### 10. Application starts and immediately closes
- **Cause**: A missing dependency or port error.
- **Fix**: Open the `logs/server.log` file in Notepad to view the exact error message.

### 11. Incorrect date or timezone
- **Cause**: The shop PC clock or timezone is not set to Indian Standard Time (IST / UTC+05:30).
- **Fix**: In Windows Settings -> Time & Language -> Date & Time, set Time zone to `(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi`.

### 12. Gujarati text not displaying correctly (showing boxes or question marks)
- **Cause**: Old Windows versions missing Gujarati unicode font packs.
- **Fix**: The web interface automatically loads Noto Sans Gujarati font. In Windows Settings -> Time & Language -> Language, ensure "Gujarati" language pack or supplemental fonts are enabled.
