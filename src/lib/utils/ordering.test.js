import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCart, buildCartMessage, buildSingleProductMessage } from './ordering.js';
import { formatRupiah, normalizeWhatsApp, slugify, isSafeHttpUrl, isReservedSlug, isValidImageSignature } from './format.js';

test('cart total uses catalog price and selected quantity', () => {
  assert.equal(calculateCart([{ price: 22000, quantity: 2 }, { price: 10000, quantity: 1 }]), 54000);
});

test('cart quantity is kept within a positive safe range', () => {
  assert.equal(calculateCart([{ price: 5000, quantity: -4 }]), 5000);
  assert.equal(calculateCart([{ price: 5000, quantity: 150 }]), 495000);
});

test('cart WhatsApp message contains item, estimate, customer and note', () => {
  const message = buildCartMessage({ businessName: 'Dapur Nusa', items: [{ name: 'Nasi Ayam', price: 22000, quantity: 2 }], customerName: 'Budi', note: 'Sambal dipisah' });
  assert.match(message, /Dapur Nusa/);
  assert.match(message, /Nasi Ayam x2/);
  assert.match(message, /Estimasi Total: Rp 44\.000/);
  assert.match(message, /Nama: Budi/);
  assert.match(message, /Sambal dipisah/);
});

test('single product message uses the displayed product price', () => {
  assert.match(buildSingleProductMessage({ name: 'Roti', price: 12000 }), /Roti.*Rp 12\.000/);
});

test('WhatsApp number normalization handles Indonesian prefixes', () => {
  assert.equal(normalizeWhatsApp('081234567890'), '6281234567890');
  assert.equal(normalizeWhatsApp('+62 812-3456-7890'), '6281234567890');
});

test('slug and URL validation reject unsafe or reserved values', () => {
  assert.equal(slugify('Dapur Nusa!'), 'dapur-nusa');
  assert.equal(isReservedSlug('dashboard'), true);
  assert.equal(isSafeHttpUrl('https://maps.google.com'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
});

test('image upload validates file signatures, not only client MIME', () => {
  assert.equal(isValidImageSignature(Buffer.from([0xff,0xd8,0xff,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]), 'image/jpeg'), true);
  assert.equal(isValidImageSignature(Buffer.from('not really a png'), 'image/png'), false);
  assert.equal(isValidImageSignature(Buffer.from('RIFF0000WEBP'), 'image/webp'), true);
});

test('currency display uses Indonesian rupiah format', () => {
  assert.equal(formatRupiah(44000), 'Rp 44.000');
});
