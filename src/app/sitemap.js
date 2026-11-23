import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function sitemap(){
  const base=process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const supabase=await createClient();
  const {data}=await supabase.from('business_storefronts').select('slug,updated_at');
  return [{url:base,lastModified:new Date(),changeFrequency:'weekly',priority:1},...(data||[]).map(item=>({url:`${base}/${item.slug}`,lastModified:item.updated_at,changeFrequency:'weekly',priority:.7}))];
}
