import CategoryOG, { size, contentType, alt } from '@/app/[category]/opengraph-image';

export const runtime = 'nodejs';
export { size, contentType, alt };

export default function OG() {
  return CategoryOG({ params: { category: 'plants' } });
}
