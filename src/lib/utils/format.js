export function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
}
export function normalizeWhatsApp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}
export function whatsappUrl(phone, message) {
  const normalized = normalizeWhatsApp(phone);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : '#';
}
export function slugify(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
export function isSafeHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; }
}

export const RESERVED_SLUGS = new Set(['login','register','dashboard','api','auth','pricing','about','contact','faq','reset-password','forgot-password','sitemap.xml','robots.txt']);
export function isReservedSlug(value) { return RESERVED_SLUGS.has(String(value || '').toLowerCase()); }
export function isValidImageSignature(buffer, mime) {
  if (!buffer || buffer.length < 12) return false;
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
  if (mime === 'image/webp') return String.fromCharCode(...bytes.subarray(0,4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8,12)) === 'WEBP';
  return false;
}
