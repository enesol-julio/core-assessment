# Microsoft Entra ID App Registration Setup

**Purpose:** Register an application in Microsoft Entra ID for Microsoft Graph API email access (OTP delivery)
**Project:** CORE Assessment Platform
**Version:** v1.1
**Updated:** April 2026 — env var names aligned with the shipping implementation (`AZURE_*` + `EMAIL_FROM`).

---

## Overview

This creates an Entra ID application that can send emails via Microsoft Graph API using its own credentials (client credentials flow) — no user login required. The CORE Assessment platform uses this to send OTP codes for passwordless authentication.

> **Note:** Microsoft renamed "Azure Active Directory" to "Microsoft Entra ID" in 2023. Some Azure Portal pages may still show the old name during the transition. The functionality is identical.

---

## Prerequisites

- Microsoft Entra ID admin access (Global Administrator or Application Administrator)
- Access to Azure Portal: https://portal.azure.com
- Your organization uses Microsoft 365 (DataForgeTechnologies.com)

---

## Step 1: Create App Registration

1. Go to **Azure Portal**: https://portal.azure.com

2. Navigate to: **Microsoft Entra ID** → **App registrations**
   > (If you see "Azure Active Directory" instead, it's the same thing)

3. Click **+ New registration**

4. Fill in:
   - **Name:** `CORE Assessment Email`
   - **Supported account types:** `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI:** Leave blank (not needed for client credentials)

5. Click **Register**

6. **Save these values** (you'll need them for `.env.local`):
   - **Application (client) ID:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Directory (tenant) ID:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## Step 2: Create Client Secret

1. In your App Registration, go to: **Certificates & secrets**

2. Click **+ New client secret**

3. Fill in:
   - **Description:** `CORE Assessment Production`
   - **Expires:** Choose appropriate (recommend 12 or 24 months)

4. Click **Add**

5. **IMPORTANT: Copy the secret VALUE immediately!**
   - It's only shown once
   - Copy the **Value** column, NOT the Secret ID
   - Store securely (password manager, etc.)

---

## Step 3: Add API Permissions

1. In your App Registration, go to: **API permissions**

2. Click **+ Add a permission**

3. Select: **Microsoft Graph**

4. Select: **Application permissions** (NOT Delegated)

5. Search for and select: **Mail.Send**

6. Click **Add permissions**

7. **Grant Admin Consent:**
   - Click **Grant admin consent for DataForgeTechnologies**
   - Click **Yes** to confirm
   - Verify green checkmark appears next to `Mail.Send`

> **Scope:** With tenant-wide `Mail.Send` (Application permission), the app can send email as any mailbox in your tenant. This is acceptable for internal tools. If you later want to restrict the app to only send from specific mailboxes, you can configure an [Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access) in Exchange Online.

---

## Step 4: Verify Configuration

Your App Registration should now show:

### Overview Tab
| Field | Value |
|-------|-------|
| Application (client) ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| Directory (tenant) ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### API Permissions Tab
| Permission | Type | Status |
|------------|------|--------|
| Mail.Send | Application | ✅ Granted |

### Certificates & secrets Tab
| Description | Expires | Value |
|-------------|---------|-------|
| CORE Assessment Production | [Date] | (hidden after creation) |

---

## Step 5: Collect Values for `.env.local`

You need these three values for the CORE Assessment `.env.local` file:

| Env Variable | Where to Find |
|--------------|---------------|
| `AZURE_TENANT_ID` | App Registration → Overview → **Directory (tenant) ID** |
| `AZURE_CLIENT_ID` | App Registration → Overview → **Application (client) ID** |
| `AZURE_CLIENT_SECRET` | The value you copied in Step 2 |
| `EMAIL_FROM` | The shared-mailbox address the app will send from (configured in [M365_GRAPH_SETUP.md](M365_GRAPH_SETUP.md)) |

> The env var names above match what `src/lib/auth/email.ts` reads at runtime. Earlier drafts of this doc used a `GRAPH_*` prefix — the shipping code uses `AZURE_*` + `EMAIL_FROM`. If you see the old names anywhere, they're stale.

---

## Common Issues

### "Insufficient privileges to complete the operation"

You need admin rights:
- Global Administrator, or
- Application Administrator role

### Permission shows "Not granted"

Click **Grant admin consent** button — requires admin privileges.

### "AADSTS7000215: Invalid client secret"

- Secret may have expired
- You may have copied the Secret ID instead of Value
- Create a new secret and update `.env.local`

### "AADSTS700016: Application not found"

- Client ID is wrong
- App may have been deleted
- Check you're in the correct Entra ID tenant

---

## Security Recommendations

### 1. Set Secret Expiration Reminders

When creating secrets:
1. Note the expiration date
2. Set calendar reminder 2 weeks before expiration
3. Rotate secret before it expires

### 2. Document Who Has Access

Keep record of:
- Who created the app registration
- Who has the client secret
- When secret was last rotated

### 3. Monitor App Activity

Periodically check: **Microsoft Entra ID** → **App registrations** → **[Your App]** → **Sign-in logs**

### 4. Limit Permissions

Only `Mail.Send` is needed — don't add extra permissions.

---

## Quick Reference

### Portal Navigation

```
Azure Portal
└── Microsoft Entra ID
    └── App registrations
        └── [CORE Assessment Email]
            ├── Overview (IDs)
            ├── Certificates & secrets (client secret)
            └── API permissions (Mail.Send)
```

### Required Values Summary

```
AZURE_TENANT_ID:     [Directory (tenant) ID from Overview]
AZURE_CLIENT_ID:     [Application (client) ID from Overview]
AZURE_CLIENT_SECRET: [Value from Certificates & secrets]
EMAIL_FROM:          [Shared mailbox from M365_GRAPH_SETUP.md]
```

### Permission Required

```
Microsoft Graph → Application → Mail.Send
```

---

## Next Steps

After completing this setup:
1. Go to **[M365_GRAPH_SETUP.md](M365_GRAPH_SETUP.md)**
2. Follow instructions to create a sender mailbox and configure the Next.js application

---

**App Registration Complete!**
