import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Package, Settings, UserRound, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions/auth';
export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: business }, { data: profile }] = await Promise.all([supabase.from('businesses').select('slug,name').eq('owner_id', user.id).maybeSingle(), supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()]);
  return <div className="dashboard-shell"><aside className="sidebar"><Link href="/" className="brand">link<span>usaha</span></Link><div style={{fontSize:11,fontWeight:800,color:'#9aa59e',letterSpacing:'.12em',margin:'25px 12px 5px'}}>MENU UTAMA</div><Link className="nav-link" href="/dashboard"><LayoutDashboard size={18}/> Ringkasan</Link><Link className="nav-link" href="/dashboard/produk"><Package size={18}/> Produk</Link><Link className="nav-link" href="/dashboard/pengaturan"><Settings size={18}/> Pengaturan</Link><Link className="nav-link" href="/dashboard/profil"><UserRound size={18}/> Akun saya</Link>{['admin','super_admin'].includes(profile?.role)&&<Link className="nav-link" href="/dashboard/admin"><Settings size={18}/> Admin platform</Link>}{business?.slug && <Link className="nav-link" href={`/${business.slug}`} target="_blank"><ExternalLink size={18}/> Lihat website</Link>}<div className="side-bottom" style={{marginTop:'auto',padding:'16px 12px',borderTop:'1px solid var(--line)'}}><div style={{fontSize:13,fontWeight:700,overflowWrap:'anywhere'}}>{user.email}</div><form action={signOut}><button type="submit" style={{border:0,background:'none',padding:'10px 0 0',color:'var(--muted)',cursor:'pointer'}}>Keluar akun</button></form></div></aside><main className="dash-main">{children}</main></div>;
}
