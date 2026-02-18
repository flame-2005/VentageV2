export const capitalize = (str = "") =>
  str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const value = email.trim();

  // basic structure check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(value);
}
