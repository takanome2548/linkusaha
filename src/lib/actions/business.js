
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  slugify,
  isSafeHttpUrl,
  isReservedSlug,
  isValidImageSignature,
} from '@/lib/utils/format';
import { randomUUID } from 'node:crypto';

const themes = [
  'ocean-blue',
  'fresh-green',
  'warm-orange',
  'soft-purple',
  'rose',
];

export async function saveBusiness(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: existing } = await supabase
    .from('businesses')
    .select('id, logo_path, cover_path')
    .eq('owner_id', user.id)
    .maybeSingle();

  const name = String(formData.get('name') || '').trim();
  const slug = slugify(formData.get('slug') || name);
  const whatsapp = String(formData.get('whatsapp_number') || '').replace(/\D/g, '');
  const theme = String(formData.get('theme') || 'ocean-blue');
  const maps = String(formData.get('google_maps_url') || '').trim();

  if (
    name.length < 2 ||
    slug.length < 3 ||
    isReservedSlug(slug)
  ) {
    redirect(
      '/dashboard?error=Nama usaha atau alamat website belum valid. Gunakan alamat website lain.'
    );
  }

  if (!/^(?:62|0|8)\d{8,14}$/.test(whatsapp)) {
    redirect('/dashboard?error=Masukkan nomor WhatsApp yang valid.');
  }

  if (!themes.includes(theme)) {
    redirect('/dashboard?error=Tema tidak valid.');
  }

  if (maps && !isSafeHttpUrl(maps)) {
    redirect(
      '/dashboard?error=Link Google Maps harus menggunakan http atau https.'
    );
  }

  const payload = {
    name,
    slug,
    category: String(formData.get('category') || 'Lainnya'),
    description: String(formData.get('description') || '').trim(),
    whatsapp_number: whatsapp,
    address: String(formData.get('address') || '').trim(),
    google_maps_url: maps || null,
    instagram_url: safeSocial(formData.get('instagram_url')),
    facebook_url: safeSocial(formData.get('facebook_url')),
    additional_contact:
      String(formData.get('additional_contact') || '').trim() || null,
    opening_hours: {
      display: String(formData.get('opening_hours') || '').trim(),
    },
    theme,
    updated_at: new Date().toISOString(),
  };

  const result = existing
    ? await supabase
        .from('businesses')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single()
    : await supabase
        .from('businesses')
        .insert({
          ...payload,
          owner_id: user.id,
        })
        .select('id')
        .single();

  if (result.error) {
    const message =
      result.error.code === '23505'
        ? 'Alamat website sudah digunakan. Coba nama lain.'
        : result.error.message;

    redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }

  const businessId = result.data.id;

  const imageFiles = [
    ['logo', 'logo_path'],
    ['cover', 'cover_path'],
  ];

  for (const [field, column] of imageFiles) {
    const file = formData.get(field);

    if (
      file &&
      typeof file.arrayBuffer === 'function' &&
      file.size > 0
    ) {
      const mime = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      }[file.type];

      if (!mime || file.size > 5 * 1024 * 1024) {
        redirect(
          '/dashboard/pengaturan?error=Logo dan sampul harus JPG, PNG, atau WebP maksimal 5 MB.'
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());

      if (!isValidImageSignature(bytes, file.type)) {
        redirect(
          '/dashboard/pengaturan?error=Format isi gambar tidak valid.'
        );
      }

      const path = `${businessId}/business/${field}-${randomUUID()}.${mime}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(path, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        redirect(
          `/dashboard/pengaturan?error=${encodeURIComponent(uploadError.message)}`
        );
      }

      const { error: updateError } = await supabase
        .from('businesses')
        .update({ [column]: path })
        .eq('id', businessId);

      if (updateError) {
        redirect(
          `/dashboard/pengaturan?error=${encodeURIComponent(updateError.message)}`
        );
      }

      const oldPath = existing?.[column];

      if (oldPath && oldPath !== path) {
        await supabase.storage
          .from('business-assets')
          .remove([oldPath]);
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/pengaturan');
  revalidatePath(`/${slug}`);

  redirect('/dashboard?message=Informasi usaha berhasil disimpan.');
}

function safeSocial(value) {
  const text = String(value || '').trim();

  if (!text) return null;

  return isSafeHttpUrl(text) ? text : null;
}

// PUBLIKASI WEBSITE
export async function updatePublication(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const status = String(formData.get('status') || '');

  if (!['draft', 'published', 'unpublished'].includes(status)) {
    redirect('/dashboard?error=Status publikasi tidak valid.');
  }

  // Pastikan bisnis merupakan milik pengguna.
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (businessError || !business) {
    redirect('/dashboard?error=Data bisnis tidak ditemukan.');
  }

  // Pemeriksaan langganan hanya diperlukan saat publikasi.
  if (status === 'published') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      redirect('/dashboard?error=Gagal memeriksa akun.');
    }

    const isSuperAdmin = profile?.role === 'super_admin';

    if (!isSuperAdmin) {
      const { data: subscription, error: subscriptionError } =
        await supabase
          .from('subscriptions')
          .select('status, expires_at')
          .eq('business_id', business.id)
          .maybeSingle();

      if (subscriptionError) {
        redirect('/dashboard?error=Gagal memeriksa langganan.');
      }

      const isSubscriptionActive =
        subscription?.status === 'active' &&
        subscription?.expires_at &&
        new Date(subscription.expires_at).getTime() > Date.now();

      if (!isSubscriptionActive) {
        redirect('/dashboard/langganan');
      }
    }
  }

  // Perbarui status publikasi.
  const { error } = await supabase
    .from('businesses')
    .update({
      publication_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', business.id)
    .eq('owner_id', user.id);

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath('/dashboard');
  revalidatePath(`/${business.slug}`);

  if (status === 'published') {
    redirect(
      '/dashboard?message=Website berhasil dipublikasikan.'
    );
  }

  if (status === 'unpublished') {
    redirect(
      '/dashboard?message=Website berhasil dinonaktifkan.'
    );
  }

  redirect(
    '/dashboard?message=Website berhasil diubah menjadi draft.'
  );
}

// PENGATURAN BISNIS
export async function saveBusinessSettings(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single();

  if (!business) redirect('/dashboard');

  const cartEnabled = formData.get('cart_enabled') === 'on';

  const { error } = await supabase
    .from('business_settings')
    .upsert(
      {
        business_id: business.id,
        cart_enabled: cartEnabled,
      },
      {
        onConflict: 'business_id',
      }
    );

  if (error) {
    redirect(
      `/dashboard/pengaturan?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath('/dashboard/pengaturan');
  revalidatePath(`/${business.slug}`);

  redirect(
    '/dashboard/pengaturan?message=Pengaturan berhasil disimpan.'
  );
}

// ADMIN: PUBLIKASI WEBSITE MILIK PENGGUNA
export async function adminUpdatePublication(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!['admin', 'super_admin'].includes(profile?.role)) {
    redirect('/dashboard');
  }

  const businessId = String(formData.get('business_id') || '');
  const status = String(formData.get('status') || '');

  if (
    !/^[0-9a-f-]{36}$/i.test(businessId) ||
    !['draft', 'published', 'unpublished'].includes(status)
  ) {
    redirect('/dashboard/admin?error=Permintaan tidak valid.');
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      publication_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  if (error) {
    redirect(
      `/dashboard/admin?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath('/dashboard/admin');

  redirect(
    '/dashboard/admin?message=Status website berhasil diperbarui.'
  );
}
