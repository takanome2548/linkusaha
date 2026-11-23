import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StorefrontClient } from '@/components/storefront/storefront-client';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }) {
  const { slug } = await params; const supabase = await createClient();
  const { data: business } = await supabase.from('business_storefronts').select('name,description').eq('slug',slug).maybeSingle();
  if (!business) return { title:'Website tidak ditemukan' };
  const canonical = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${slug}`;
  return { title:business.name, description:business.description || `Lihat informasi dan produk ${business.name} di LinkUsaha.`, alternates:{canonical}, openGraph:{title:business.name,description:business.description || `Website resmi ${business.name}`,url:canonical,type:'website'} };
}
export default async function BusinessStorefront({ params }) {
  const { slug } = await params; const supabase = await createClient();
  const { data: business } = await supabase.from('business_storefronts').select('*').eq('slug',slug).maybeSingle();
  if (!business) notFound();
  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').eq('business_id',business.id).eq('is_active',true).order('sort_order').order('created_at'),
    supabase.from('business_settings').select('cart_enabled').eq('business_id',business.id).maybeSingle(),
  ]);
  const publicUrl = path => path ? supabase.storage.from('business-assets').getPublicUrl(path).data.publicUrl : null;
  const safeBusiness = { ...business, cover_url:publicUrl(business.cover_path), logo_url:publicUrl(business.logo_path) };
  const safeProducts = (products || []).map(product=>({...product,image_url:publicUrl(product.image_path)}));
  return <StorefrontClient business={safeBusiness} products={safeProducts} cartEnabled={Boolean(settings?.cart_enabled)}/>;
}
