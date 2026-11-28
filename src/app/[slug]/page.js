
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StorefrontClient } from '@/components/storefront/storefront-client';

export const dynamic = 'force-dynamic';

const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // View hanya menampilkan bisnis yang published
  // dan memiliki langganan aktif, kecuali super_admin.
  const { data: business, error } = await supabase
    .from('business_storefronts')
    .select('name,description')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !business) {
    return {
      title: 'Website tidak ditemukan',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonical = `${appUrl}/${slug}`;
  const description =
    business.description ||
    `Lihat informasi dan produk ${business.name} di LinkUsaha.`;

  return {
    title: business.name,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: business.name,
      description,
      url: canonical,
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BusinessStorefront({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Gerbang akses publik: published + langganan aktif.
  const { data: business, error: businessError } = await supabase
    .from('business_storefronts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (businessError || !business) {
    notFound();
  }

  const [
    { data: products, error: productsError },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at'),

    supabase
      .from('business_settings')
      .select('cart_enabled')
      .eq('business_id', business.id)
      .maybeSingle(),
  ]);

  if (productsError) {
    throw new Error('Gagal memuat produk website.');
  }

  const publicUrl = (path) =>
    path
      ? supabase.storage
          .from('business-assets')
          .getPublicUrl(path).data.publicUrl
      : null;

  const safeBusiness = {
    ...business,
    cover_url: publicUrl(business.cover_path),
    logo_url: publicUrl(business.logo_path),
  };

  const safeProducts = (products || []).map((product) => ({
    ...product,
    image_url: publicUrl(product.image_path),
  }));

  return (
    <StorefrontClient
      business={safeBusiness}
      products={safeProducts}
      cartEnabled={Boolean(settings?.cart_enabled)}
    />
  );
}
