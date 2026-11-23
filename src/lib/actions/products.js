'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { isValidImageSignature } from '@/lib/utils/format';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MIME_EXT = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
async function ownedBusiness(supabase, userId) {
  const { data } = await supabase.from('businesses').select('id,slug').eq('owner_id', userId).single();
  return data;
}
export async function saveProduct(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const business = await ownedBusiness(supabase, user.id);
  if (!business) redirect('/dashboard');
  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const price = Number(formData.get('price'));
  if (!name || name.length > 120 || !Number.isSafeInteger(price) || price < 0 || price > 1000000000000) redirect('/dashboard/produk?error=Nama produk dan harga harus valid (maksimal Rp1 triliun).');
  const active = formData.get('is_active') === 'on';
  const available = formData.get('is_available') === 'on';
  const sortOrder = Number(formData.get('sort_order') || 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) redirect('/dashboard/produk?error=Urutan produk tidak valid.');
  let imagePath;
  let oldImagePath = null;
  if (id) {
    const { data: existingProduct } = await supabase.from('products').select('id,image_path').eq('id',id).eq('business_id',business.id).maybeSingle();
    if (!existingProduct) redirect('/dashboard/produk?error=Produk tidak ditemukan atau bukan milik akun ini.');
    oldImagePath = existingProduct.image_path;
  }
  const file = formData.get('image');
  if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE || !MIME_EXT[file.type]) redirect('/dashboard/produk?error=Foto harus JPG, PNG, atau WebP maksimal 5 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isValidImageSignature(bytes,file.type)) redirect('/dashboard/produk?error=Format isi gambar tidak valid.');
    const path = `${business.id}/products/${randomUUID()}.${MIME_EXT[file.type]}`;
    const { error: uploadError } = await supabase.storage.from('business-assets').upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) redirect(`/dashboard/produk?error=${encodeURIComponent(uploadError.message)}`);
    imagePath = path;
  }
  const payload = { business_id: business.id, name, description, price, is_active: active, is_available: available, sort_order: sortOrder, updated_at: new Date().toISOString(), ...(imagePath ? { image_path: imagePath } : {}) };
  const result = id
    ? await supabase.from('products').update(payload).eq('id', id).eq('business_id', business.id).select('id').maybeSingle()
    : await supabase.from('products').insert(payload).select('id').single();
  if (result.error || !result.data) redirect(`/dashboard/produk?error=${encodeURIComponent(result.error?.message || 'Produk tidak ditemukan atau bukan milik akun ini.')}`);
  if (imagePath && oldImagePath && oldImagePath !== imagePath) await supabase.storage.from('business-assets').remove([oldImagePath]);
  revalidatePath('/dashboard/produk'); revalidatePath(`/${business.slug}`);
  redirect('/dashboard/produk?message=Produk berhasil disimpan.');
}
export async function deleteProduct(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const business = await ownedBusiness(supabase, user.id);
  if (!business) redirect('/dashboard');
  const id = String(formData.get('id') || '');
  const { data: product } = await supabase.from('products').select('id,image_path').eq('id', id).eq('business_id', business.id).single();
  if (!product) redirect('/dashboard/produk?error=Produk tidak ditemukan.');
  const { error } = await supabase.from('products').delete().eq('id', id).eq('business_id', business.id);
  if (error) redirect(`/dashboard/produk?error=${encodeURIComponent(error.message)}`);
  if (product.image_path) await supabase.storage.from('business-assets').remove([product.image_path]);
  revalidatePath('/dashboard/produk'); revalidatePath(`/${business.slug}`);
  redirect('/dashboard/produk?message=Produk berhasil dihapus.');
}
