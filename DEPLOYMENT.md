# DEPLOYMENT.md – Production Deployment & Hosting Guide

**Target Cloud Platform**: Render (Web Service) / AI Studio / Node.js Containers  
**Application**: TrustVault Secure Document Sharing Platform  
**Port**: 3000 (Default) / Dynamic `$PORT` provided by cloud environment  

---

## 1. Environment Variables Configuration

Create a `.env` file in the project root or configure these variables in the Render Dashboard:

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `3000` | Port on which the Express server listens. Render automatically injects this. |
| `NODE_ENV` | No | `production` | Set to `production` for optimized static asset serving. |
| `APP_URL` | No | `https://trustvault.onrender.com` | Base public URL of the deployed application. |
| `TWILIO_ACCOUNT_SID` | Optional | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | SMS gateway for production SMS OTP delivery. (In evaluation mode, OTPs are surfaced in the UI). |
| `TWILIO_AUTH_TOKEN` | Optional | `your_auth_token` | Twilio authentication token. |
| `SMTP_HOST` | Optional | `smtp.sendgrid.net` | Outbound SMTP host for production email OTP delivery. |
| `SMTP_USER` | Optional | `apikey` | SMTP username. |
| `SMTP_PASS` | Optional | `SG.xxxxxxxxxxxxxxxx` | SMTP password / API key. |

---

## 2. Deploying on Render (Step-by-Step)

1. **Connect GitHub Repository**:
   - Push your code to your GitHub repository.
   - In Render, click **New +** &rarr; **Web Service**.
   - Select your TrustVault repository.

2. **Configure Service Settings**:
   - **Name**: `trustvault-secure-platform`
   - **Region**: Oregon (US West) or Frankfurt (EU Central)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: Free / Starter

3. **Persistent Disk Setup (Render Disks)**:
   - For persisting uploaded files and database records across container restarts on Render:
     - Click **Disks** &rarr; **Add Disk**.
     - **Name**: `vault-data`
     - **Mount Path**: `/app/applet/data` or `data`
     - **Size**: 1 GB

4. **Deploy**:
   - Click **Create Web Service**.
   - Render will build the Vite single-page app and start the Express full-stack backend.

---

## 3. Seed Accounts for Evaluation

Once deployed, the database automatically initializes with 4 demo accounts:

1. **Administrator**: `admin@trustvault.local` / `Admin@Trust2026!`
2. **Owner**: `owner@trustvault.local` / `Owner@Trust2026!`
3. **Editor**: `editor@trustvault.local` / `Editor@Trust2026!`
4. **Viewer**: `viewer@trustvault.local` / `Viewer@Trust2026!`

---

## 4. Troubleshooting Guide

### Issue: "Port 3000 in use"
- **Solution**: The server reads `process.env.PORT`. If running locally and port 3000 is occupied:
  ```bash
  PORT=3001 npm start
  ```

### Issue: "Document shows RETRY_NEEDED"
- **Solution**: Click the **Retry Scan** button on the document row in **My Documents** or **Document Details**. This invokes `/api/documents/:id/retry-scan`, running deep heuristic analysis and repairing the scan status.

### Issue: "Audit verification fails"
- **Solution**: If the database file `/data/trustvault_db.json` was manually edited by an external text editor, the SHA-256 hash sequence will detect the alteration. Click **Verify Hash Chain Integrity** to see the exact block that was modified.
