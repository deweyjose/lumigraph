import nodemailer from "nodemailer";

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

/**
 * Send an email. Uses EMAIL_SERVER and EMAIL_FROM. Returns true if sent, false if not configured or send failed.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM;
  if (!transport || !from) return false;
  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text,
    });
    return true;
  } catch {
    return false;
  }
}
