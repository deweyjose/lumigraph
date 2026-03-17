import nodemailer from "nodemailer";

/**
 * Single place this app sends mail. All outbound email (magic link, password reset, etc.)
 * must go through sendMail() in this file — do not send mail from anywhere else.
 */

/**
 * Get a nodemailer transport using EMAIL_SERVER (e.g. smtp://user:pass@host:587)
 * and EMAIL_FROM. Returns null if not configured.
 */
function getTransport() {
  const server = process.env.EMAIL_SERVER;
  const from = process.env.EMAIL_FROM;
  if (!server || !from) return null;
  try {
    return nodemailer.createTransport(server);
  } catch {
    return null;
  }
}

export type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function resolveRecipient(to: string): string {
  const override = process.env.EMAIL_TO_OVERRIDE?.trim();
  if (!override) return to;
  if (override !== to) {
    console.warn(
      `[auth-email] Overriding outbound recipient ${to} -> ${override} for testing.`
    );
  }
  return override;
}

/**
 * Send an email. Uses EMAIL_SERVER and EMAIL_FROM. Returns true if sent, false if not configured or send failed.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM;
  if (!transport || !from) {
    console.warn(
      "[auth-email] Email delivery skipped because EMAIL_SERVER and/or EMAIL_FROM is not configured."
    );
    return false;
  }
  try {
    await transport.sendMail({
      from,
      to: resolveRecipient(options.to),
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text,
    });
    return true;
  } catch (error) {
    console.error("[auth-email] Failed to send email", error);
    return false;
  }
}
