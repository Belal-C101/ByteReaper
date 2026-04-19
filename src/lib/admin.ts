export const ADMIN_EMAILS = ['belaltamerhegab@gmail.com'] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && (ADMIN_EMAILS as readonly string[]).includes(email);
}
