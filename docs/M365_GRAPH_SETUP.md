# Microsoft 365 Graph API Email Setup

**Purpose:** Configure Microsoft Graph API to send OTP emails from the CORE Assessment Platform
**Project:** CORE Assessment Platform
**Stack:** Next.js 14+ / TypeScript
**Version:** v1.1
**Updated:** April 2026 — env var names aligned with the shipping code (`AZURE_*` + `EMAIL_FROM`); reflects that the email service now ships at `src/lib/auth/email.ts` and falls back to a dev-console sender when credentials are absent.

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
- CORE Assessment project cloned locally with `.env.local` in place (see project [`README.md`](../README.md) Quick Start)

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

`@azure/msal-node` is already in `package.json` — nothing to install. OTP emails are sent via direct REST calls to `https://graph.microsoft.com/v1.0/users/{sender}/sendMail` — no Graph SDK required. MSAL handles token acquisition (client-credentials flow) and in-memory token caching.

---

## Step 3: Update `.env.local`

Add the Graph API credentials to your `.env.local` file at the project root. These names match exactly what `src/lib/auth/email.ts` reads:

```env
# ── Email Service (for OTP delivery via Microsoft Graph) ──
AZURE_TENANT_ID=YOUR_TENANT_ID
AZURE_CLIENT_ID=YOUR_CLIENT_ID
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET
EMAIL_FROM=core-assessment@dataforgetechnologies.com
```

**Replace:**
- `YOUR_TENANT_ID` — From Entra ID (Directory ID)
- `YOUR_CLIENT_ID` — From App Registration (Application ID)
- `YOUR_CLIENT_SECRET` — From App Registration (secret value)

**Verify:**
- `EMAIL_FROM` matches the shared mailbox you created in Step 1
- `.env.local` is in `.gitignore` (it already is in this repo)

**Provider selection is automatic.** `src/lib/auth/email.ts` looks at all four of these values at request time. If any are unset or still at the `.env.example` placeholders, it falls back to `DevConsoleSender`, which logs the OTP to stdout and `data/audit/otp/` instead of sending email. That keeps the OTP flow exercisable without real credentials.

---

## Step 4: Email Service (already implemented)

The email service lives at [`src/lib/auth/email.ts`](../src/lib/auth/email.ts). It exposes two implementations of the `EmailSender` interface and a factory:

- **`GraphSender`** — production path. Uses `@azure/msal-node` `ConfidentialClientApplication` (authority `https://login.microsoftonline.com/{AZURE_TENANT_ID}`, scope `https://graph.microsoft.com/.default`) to acquire a token, then `POST https://graph.microsoft.com/v1.0/users/{EMAIL_FROM}/sendMail` to deliver the OTP. Subject/body are localized (EN/ES) based on the requesting session language.
- **`DevConsoleSender`** — fallback. Writes the OTP to stdout and appends to `data/audit/otp/{email}.log`. Selected automatically when any of `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, or `EMAIL_FROM` is unset / placeholder.
- **`getEmailSender()`** — detects which to return.

The API route [`src/app/api/auth/request-otp/route.ts`](../src/app/api/auth/request-otp/route.ts) consumes the sender. MSAL caches tokens in memory and refreshes on expiry — no manual token management needed.

---

## Step 5: Test Email Sending

### Quick test via the API

With the dev server running and `AUTH_BYPASS=false` in `.env.local`:

```bash
curl -sS -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@dataforgetechnologies.com","language":"en"}' | jq
```

**Expected (real Graph credentials present):** `{"ok":true,"expires_at":"..."}` and the email arrives in your inbox.
**Expected (fallback):** Same JSON response, but the OTP code is printed to the dev-server console and appended to `data/audit/otp/you_at_dataforgetechnologies.com.log`.

### Full login flow

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Enter your email on the login screen → click Sign in
4. Retrieve the OTP (inbox, or dev console / `data/audit/otp/`)
5. Enter the OTP on the verify screen → you land on `/assess` (or `/dashboard` if admin)

The full OTP lifecycle is also exercised by `npm run smoke:auth`, which disables `AUTH_BYPASS` and hits the underlying functions directly (issue, consume, expire, reuse, single-use, JWT round-trip, session revoke).

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
2. Check spelling in `.env.local` — `EMAIL_FROM` must match exactly
3. New shared mailboxes may take a few minutes to provision — wait and retry

### Error: "InvalidAuthenticationToken"

Token issue:
1. Verify `AZURE_TENANT_ID` is correct
2. Verify `AZURE_CLIENT_ID` is correct
3. Verify `AZURE_CLIENT_SECRET` hasn't expired
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
3. Verify `AUTH_BYPASS` is `false` in `.env.local` (with `true`, the OTP request endpoint is bypassed entirely — login is auto-approved)
4. Verify all four of `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `EMAIL_FROM` are set to real values (any missing → `DevConsoleSender` fallback and no mail is sent)
5. Check Next.js server logs for Graph API errors

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
