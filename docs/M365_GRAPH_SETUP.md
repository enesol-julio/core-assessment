# Microsoft 365 Graph API Email Setup

**Purpose:** Configure Microsoft Graph API to send OTP emails from the CORE Assessment Platform  
**Project:** CORE Assessment Platform  
**Stack:** Next.js 14+ / TypeScript  
**Version:** v1.0

---

## Overview

This guide configures email sending via Microsoft Graph API for OTP delivery. This method:
- ✅ Works with MFA-enforced tenants
- ✅ Uses app credentials (client credentials flow — no user login required)
- ✅ More secure than SMTP AUTH
- ✅ Modern Microsoft-recommended approach

---

## Prerequisites

- Entra ID App Registration complete (see [AZURE_APP_REGISTRATION_SETUP.md](AZURE_APP_REGISTRATION_SETUP.md))
- You have these values from the app registration:
  - Tenant ID
  - Client ID (Application ID)
  - Client Secret
- Admin access to Microsoft 365 Admin Center
- CORE Assessment project scaffolded (v0.1 complete)

---

## Step 1: Create Sender Mailbox

You need a mailbox to send from. A **shared mailbox** is recommended because it doesn't consume a Microsoft 365 license.

### Option A: Shared Mailbox (Recommended)

1. Go to **Microsoft 365 Admin Center**: https://admin.microsoft.com
2. Navigate to: **Teams & groups** → **Shared mailboxes**
3. Click **+ Add a shared mailbox**
4. Fill in:
   - **Name:** `CORE Assessment`
   - **Email:** `core-assessment@dataforgetechnologies.com` (or your preferred address)
5. Click **Create**

> **Note:** Shared mailboxes are free — they don't require a Microsoft 365 license.

### Option B: Use an Existing User Mailbox

With tenant-wide `Mail.Send` permission, the app can send from any mailbox in your tenant. You could use an existing user's mailbox as the sender, but this is not recommended because:
- It may confuse recipients (emails appear to come from that person)
- It doesn't clearly separate app traffic from personal email

---

## Step 2: Install Dependencies

From the project root, install the Microsoft Authentication Library for Node.js:

```bash
cd /Users/jutuonair/GDrive/ProductDevelopment/core-assessment
npm install @azure/msal-node
```

This is the only dependency needed. OTP emails are sent via direct REST calls to `https://graph.microsoft.com/v1.0/users/{sender}/sendMail` — no Graph SDK required.

---

## Step 3: Update `.env.local`

Add the Graph API credentials to your `.env.local` file at the project root:

```env
# ── Email Service (for OTP delivery via Microsoft Graph) ──
EMAIL_PROVIDER=graph
GRAPH_TENANT_ID=YOUR_TENANT_ID
GRAPH_CLIENT_ID=YOUR_CLIENT_ID
GRAPH_CLIENT_SECRET=YOUR_CLIENT_SECRET
GRAPH_SENDER_EMAIL=core-assessment@dataforgetechnologies.com
GRAPH_SENDER_NAME=CORE Assessment
```

**Replace:**
- `YOUR_TENANT_ID` — From Entra ID (Directory ID)
- `YOUR_CLIENT_ID` — From App Registration (Application ID)
- `YOUR_CLIENT_SECRET` — From App Registration (secret value)

**Verify:**
- `GRAPH_SENDER_EMAIL` matches the shared mailbox you created in Step 1
- `.env.local` is in `.gitignore` (it should be by default from the scaffold)

---

## Step 4: Implement the Email Service

The email service lives at `src/lib/auth/email.ts` (per the project architecture — auth utilities go in `src/lib/auth/`).

The implementation should:

1. **Acquire an access token** using `@azure/msal-node` `ConfidentialClientApplication` with client credentials flow:
   - Authority: `https://login.microsoftonline.com/{GRAPH_TENANT_ID}`
   - Scope: `https://graph.microsoft.com/.default`

2. **Send email** via `POST https://graph.microsoft.com/v1.0/users/{GRAPH_SENDER_EMAIL}/sendMail` with the access token in the Authorization header.

3. **Token caching** is handled automatically by MSAL Node — it caches tokens in memory and refreshes them when they expire. No manual token management needed.

Key design notes:
- The email service is consumed by the `/api/auth/request-otp` API route
- It should export a single function (e.g., `sendOtpEmail(to, name, otpCode)`)
- Error handling should return a success/failure result, not throw — the API route decides the HTTP response
- When `AUTH_BYPASS=true` in development, the OTP should print to console instead of sending email

---

## Step 5: Test Email Sending

### Quick Test (after implementing the email service)

Create a temporary test script at `scripts/test-email.ts`:

```typescript
// Run with: npx tsx scripts/test-email.ts
import { sendOtpEmail } from '../src/lib/auth/email';

async function main() {
  const result = await sendOtpEmail(
    'your-email@dataforgetechnologies.com',
    'Your Name',
    '123456'
  );
  console.log('Success:', result.success);
  console.log('Message:', result.message);
}

main().catch(console.error);
```

Run it:
```bash
npx tsx scripts/test-email.ts
```

**Expected:** Email arrives in your inbox from `core-assessment@dataforgetechnologies.com`.

### Full Login Flow Test (after v0.2.1 is implemented)

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Enter your email on the login page
4. Check inbox for OTP email
5. Enter OTP and verify login works

---

## Troubleshooting

### Error: "Authorization_RequestDenied"

App doesn't have `Mail.Send` permission:
1. Go to Azure Portal → **Microsoft Entra ID** → **App registrations** → **[Your App]** → **API Permissions**
2. Verify: Microsoft Graph → Application → `Mail.Send` is listed
3. Click **Grant admin consent** if not yet granted

### Error: "ResourceNotFound" or "MailboxNotFound"

Sender mailbox doesn't exist or app can't access it:
1. Verify the shared mailbox exists in Microsoft 365 Admin Center
2. Check spelling in `.env.local` `GRAPH_SENDER_EMAIL` matches exactly
3. New shared mailboxes may take a few minutes to provision — wait and retry

### Error: "InvalidAuthenticationToken"

Token issue:
1. Verify `GRAPH_TENANT_ID` is correct
2. Verify `GRAPH_CLIENT_ID` is correct
3. Verify `GRAPH_CLIENT_SECRET` hasn't expired
4. Confirm the secret is the **Value**, not the Secret ID

### Error: "Forbidden"

Admin consent not granted:
1. Go to App Registration → API Permissions
2. Click **Grant admin consent for DataForgeTechnologies**
3. Verify green checkmark appears

### OTP Email Not Arriving

1. Check spam/junk folder
2. Check Microsoft 365 message trace:
   - **Exchange Admin Center** → **Mail flow** → **Message trace**
   - Search for sender: `core-assessment@dataforgetechnologies.com`
3. Verify `AUTH_BYPASS` is `false` in `.env.local` (if `true`, OTP prints to console instead of emailing)
4. Check Next.js server logs for Graph API errors

---

## Security Best Practices

### 1. Protect Client Secret

- Never commit `.env.local` to the repository (it's in `.gitignore`)
- Store production credentials in your deployment platform's secret management
- For extra safety, the email service reads credentials from `process.env` — never hardcode them

### 2. Rotate Secret Regularly

- Set calendar reminder before secret expiration
- Create new secret in Azure → update `.env.local` (and deployment secrets) → restart app → delete old secret in Azure

### 3. Monitor App Activity

Check sign-in logs periodically: **Microsoft Entra ID** → **App registrations** → **[Your App]** → **Sign-in logs**

### 4. Limit Permissions

Only `Mail.Send` is needed — don't add extra Graph API permissions.

---

## Quick Reference

| Setting | Where to Find |
|---------|---------------|
| Tenant ID | Entra ID → Overview → Directory ID |
| Client ID | App Registration → Overview → Application ID |
| Client Secret | App Registration → Certificates & secrets |
| Sender Email | Your shared mailbox address |

| Graph API Endpoint | Purpose |
|--------------------|---------|
| `POST /v1.0/users/{sender}/sendMail` | Send email |
| Token URL | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |

| Project File | Purpose |
|-------------|---------|
| `.env.local` | Graph credentials (gitignored) |
| `src/lib/auth/email.ts` | Email service implementation |
| `src/app/api/auth/request-otp/route.ts` | API route that calls the email service |

---

**Email Setup Complete!**
