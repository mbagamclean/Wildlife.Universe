export const CEO_EMAIL = 'mclean@wildlifeuniverse.org';

export function isCEO(user) {
  return !!user && user.role === 'ceo';
}
