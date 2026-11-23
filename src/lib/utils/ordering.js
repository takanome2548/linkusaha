import { formatRupiah } from './format.js';
export function calculateCart(items) {
  return items.reduce((sum, item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const quantity = Math.min(99, Math.max(1, Math.floor(Number(item.quantity) || 1)));
    return sum + price * quantity;
  }, 0);
}
export function buildCartMessage({ businessName, items, customerName, note }) {
  const lines = items.map((item, index) => `${index + 1}. ${item.name} x${item.quantity} = ${formatRupiah(item.price * item.quantity)}`);
  return [`Halo ${businessName}, saya ingin memesan:`, '', ...lines, '', `Estimasi Total: ${formatRupiah(calculateCart(items))}`, '', `Nama: ${customerName || '-'}`, `Catatan: ${note || '-'}`, '', 'Mohon konfirmasi ketersediaan dan total akhirnya.'].join('\n');
}
export function buildSingleProductMessage(product) {
  return `Halo, saya ingin memesan ${product.name} seharga ${formatRupiah(product.price)}. Apakah masih tersedia?`;
}
