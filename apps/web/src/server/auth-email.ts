export function isEmailAuthConfigured(): boolean {
  return Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
}

export function getEmailAuthUnavailableMessage(): string {
  return "Email sign-in and password reset require EMAIL_SERVER and EMAIL_FROM to be configured.";
}
