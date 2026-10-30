# FundTrail — Complete Step-by-Step Setup Guide

This guide walks you through every single step required to connect your live **Supabase** backend, deploy the **Polygon Amoy smart contract**, configure your environment variables, and run or deploy the application.

---

## 📋 Overview of What You Will Do

1. **Set Up Supabase** (Database, Auth, Storage, and RLS)
2. **Execute Database Migrations** (Create tables and policies)
3. **Deploy the Smart Contract** (Polygon Amoy via Remix IDE)
4. **Configure Your Local `.env` File**
5. **Run & Test the Application**

---

## Step 1: Set Up Supabase

### 1.1 Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and click **Start your project** (or sign in with GitHub).
2. Click **New Project**.
3. Choose an Organization or create one.
4. Fill in:
   - **Name:** `fundtrail-db` (or any name you like)
   - **Database Password:** Enter a strong password and save it somewhere secure.
   - **Region:** Choose a region close to you (e.g., `South Asia (Mumbai)` or `Singapore`).
   - **Plan:** Free Plan.
5. Click **Create new project** and wait 1–2 minutes for provisioning.

---

## Step 2: Create Tables & Security Policies (SQL Migration)

All table definitions, Row Level Security (RLS) policies, and storage bucket configs are pre-written in this project.

1. In your Supabase dashboard, open the left sidebar and click on **SQL Editor** (icon with `>_`).
2. Click **New Query** (top left).
3. Open the file [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) from this repository in your code editor.
4. Copy the entire contents of `001_initial_schema.sql` and paste it into the Supabase SQL Editor.
5. Click the green **Run** button (or press `Ctrl + Enter`).
   - You should see: `Success. No rows returned`.
   - This creates all 8 tables (`organizations`, `organization_members`, `projects`, `donations`, `expenses`, `evidence_files`, `project_updates`, `report_snapshots`, `report_anchors`), functions, RLS policies, and private storage buckets.

### (Optional) 2.2 Populate Demo Data
If you want the database pre-populated with the *School Kit Support* demo project:
1. In the Supabase **SQL Editor**, click **New Query**.
2. Copy the contents of [`supabase/seed.sql`](./supabase/seed.sql).
3. Paste it and click **Run**.

---

## Step 3: Get Your Supabase API Keys

1. In your Supabase project dashboard, click the **Settings** gear icon (bottom left) or click **Project Settings** -> **API**.
2. Look for **Project URL**:
   - Copy the URL (it looks like `https://abcdefghijkl.supabase.co`).
3. Look for **Project API Keys**:
   - Copy the **`anon` / `public`** key (starts with `eyJ...`).
   > ⚠️ **IMPORTANT:** Never use or copy the `service_role` key into frontend code. Only copy the `anon` / `public` key.

---

## Step 4: Deploy the Smart Contract on Polygon Amoy (2 Minutes)

The smart contract is located at [`contracts/ReportAnchor.sol`](./contracts/ReportAnchor.sol). The easiest, zero-setup way to deploy it is using Remix IDE.

### 4.1 Set up MetaMask with Polygon Amoy
1. Open MetaMask.
2. If Polygon Amoy is not in your network list:
   - **Network Name:** `Polygon Amoy Testnet`
   - **RPC URL:** `https://polygon-amoy.drpc.org`
   - **Chain ID:** `80002`
   - **Currency Symbol:** `POL`
   - **Block Explorer:** `https://amoy.polygonscan.com`
3. Get free test POL tokens from the [Polygon Faucet](https://faucet.polygon.technology/) (paste your MetaMask address).

### 4.2 Compile & Deploy in Remix
1. Open [https://remix.ethereum.org](https://remix.ethereum.org) in your browser.
2. In the file explorer on the left, click **contracts** -> create a new file named `ReportAnchor.sol`.
3. Open [`contracts/ReportAnchor.sol`](./contracts/ReportAnchor.sol) from this repository, copy all code, and paste it into Remix.
4. Click the **Solidity Compiler** icon on the left (3rd icon down).
   - Set Compiler to `0.8.20` (or higher).
   - Click **Compile ReportAnchor.sol**.
5. Click the **Deploy & Run Transactions** icon on the left (4th icon down).
   - In the **ENVIRONMENT** dropdown, select **Injected Provider - MetaMask**.
   - MetaMask will prompt you to connect. Make sure your network in MetaMask says **Polygon Amoy** (Chain ID 80002).
   - Under **Contract**, ensure `ReportAnchor - contracts/ReportAnchor.sol` is selected.
   - Click the orange **Deploy** button.
   - Confirm the transaction in MetaMask (costs a fraction of test POL).
6. Once mined, under **Deployed Contracts** at the bottom left:
   - Click the copy icon next to the contract name to copy the **Contract Address** (e.g., `0x1234...5678`).

---

## Step 5: Configure Your `.env` File

1. In the root directory of this project, you will see [`.env.example`](./.env.example).
2. Create a copy of `.env.example` and name it `.env`:
   - In PowerShell, run:
     ```powershell
     Copy-Item .env.example .env
     ```
3. Open `.env` in your editor and replace the placeholder values with your real keys:

```bash
# 1. Supabase public browser configuration
VITE_SUPABASE_URL=https://YOUR_ACTUAL_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ACTUAL_ANON_PUBLIC_KEY

# 2. Polygon Amoy configuration
VITE_AMOY_CHAIN_ID=80002
VITE_AMOY_RPC_URL=https://polygon-amoy.drpc.org
VITE_AMOY_EXPLORER_URL=https://amoy.polygonscan.com
VITE_REPORT_ANCHOR_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS_FROM_REMIX

# 3. Local or hosted frontend URL
VITE_PUBLIC_APP_URL=http://localhost:5173
```

4. Save the `.env` file. (Note: `.env` is already included in `.gitignore` so your secrets won't accidentally be committed to GitHub).

---

## Step 6: Run & Verify the Application

### 6.1 Start the Dev Server
In your terminal, run:
```powershell
npm run dev
```
Open `http://localhost:5173`.

### 6.2 Test the Complete Workflow
1. **Sign In:** Click **"Priya (Admin)"** to sign in.
2. **Explore Project:** Open the pre-seeded **School Kit Support** project.
3. **Test Manual Donation:** Add a ₹5,000 UPI donation. Check that the totals update immediately.
4. **Test CSV Import:**
   - Click **Donations** tab -> **Import CSV Template**.
   - Download the sample template or upload your own CSV file.
   - View the row validation and duplicate alerts.
5. **Test Evidence Upload:**
   - Click **Expenses & Evidence** tab.
   - Upload any sample invoice image or PDF.
   - Notice the browser instantly calculates the original file's SHA-256 fingerprint.
6. **Publish Report:**
   - Click **Publish & Amoy Anchor** tab.
   - Click **Generate & Publish Version**.
7. **Anchor On-Chain:**
   - Connect MetaMask and click **Anchor on Polygon Amoy**.
   - Confirm transaction and view on PolygonScan Amoy.
8. **Verify Public Donor Link:**
   - Open the public link (`/r/school-kit-support-2026-v1`) in an incognito browser window (no login/no wallet).
   - Check the live integrity badge: `MATCH`.
   - Click **Simulate Alteration (Test Tamper Detection)** to verify that tampered reports are immediately caught as `MISMATCH`!

---

## 🧪 Verification Commands

To run the automated test suite anytime:
```powershell
npm test
```
To verify the production build:
```powershell
npm run build
```

