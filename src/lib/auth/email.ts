import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfidentialClientApplication, type Configuration } from "@azure/msal-node";

export type OtpEmailPayload = {
  to: string;
  code: string;
  expiresAt: Date;
  language: "en" | "es";
};

export interface EmailSender {
  sendOtp(payload: OtpEmailPayload): Promise<void>;
}

function isGraphConfigured(): boolean {
  const values = [
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET,
    process.env.EMAIL_FROM,
  ];
  return values.every((v) => v && !v.startsWith("REPLACE_WITH_"));
}

class DevConsoleSender implements EmailSender {
  async sendOtp(payload: OtpEmailPayload): Promise<void> {
    const line = `[dev-otp] to=${payload.to} code=${payload.code} expires=${payload.expiresAt.toISOString()} lang=${payload.language}`;
    console.log(line);
    const dir = join(process.cwd(), "data", "audit", "otp");
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${payload.to.replace(/[^a-z0-9@._-]/gi, "_")}.log`);
    await writeFile(file, `${new Date().toISOString()} ${line}\n`, { flag: "a" });
  }
}

class GraphSender implements EmailSender {
  private client: ConfidentialClientApplication;

  constructor() {
    const config: Configuration = {
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
      },
    };
    this.client = new ConfidentialClientApplication(config);
  }

  async sendOtp(payload: OtpEmailPayload): Promise<void> {
    const token = await this.client.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
    if (!token) throw new Error("failed to acquire Graph token");

    const from = process.env.EMAIL_FROM!;
    const subject = payload.language === "es" ? "Tu código CORE" : "Your CORE access code";
    const body =
      payload.language === "es"
        ? `Tu código es: ${payload.code}\n\nExpira el ${payload.expiresAt.toLocaleString("es-ES")}.`
        : `Your code is: ${payload.code}\n\nExpires at ${payload.expiresAt.toLocaleString("en-US")}.`;

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "Text", content: body },
          toRecipients: [{ emailAddress: { address: payload.to } }],
        },
        saveToSentItems: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`graph sendMail failed: ${res.status} ${text}`);
    }
  }
}

export function getEmailSender(): EmailSender {
  return isGraphConfigured() ? new GraphSender() : new DevConsoleSender();
}
