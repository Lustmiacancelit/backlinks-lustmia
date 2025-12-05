// lib/email/sendEmail.ts
import { Resend } from "resend";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL; // e.g. "reports@lustmia.com"

let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[sendEmail] RESEND_API_KEY is missing – emails will not actually be sent; only logged."
  );
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const { to, subject, html, text } = options;

  // Local/dev fallback: no API key => just log and pretend we failed gracefully
  if (!resend || !resendFromEmail) {
    console.log("[sendEmail stub] Email would be sent:", {
      from: resendFromEmail ?? "(missing FROM)",
      to,
      subject,
      text,
      htmlSnippet: html?.slice(0, 200),
    });

    return {
      ok: false,
      error: "RESEND_API_KEY or RESEND_FROM_EMAIL not configured",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[sendEmail] Resend error:", error);
      return {
        ok: false,
        error: error.message ?? "Unknown Resend error",
      };
    }

    return {
      ok: true,
      id: data?.id,
    };
  } catch (err: any) {
    console.error("[sendEmail] Unexpected error:", err);
    return {
      ok: false,
      error: err?.message ?? "Unknown error",
    };
  }
}
