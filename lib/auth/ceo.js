export const CEO_EMAIL = 'ceo@wildlife.local';
export const CEO_PASSWORD = 'wildlife';

export function isCEO(user) {
  return !!user && user.role === 'ceo';
}
