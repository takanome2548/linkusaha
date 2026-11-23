
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Settings,
  UserRound,
  ExternalLink,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions/auth';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from('businesses')
      .select('slug, name')
      .eq('owner_id', user.id)
      .maybeSingle(),

    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const isPlatformAdmin = ['admin', 'super_admin'].includes(profile?.role);

  const navigation = [
    {
      href: '/dashboard',
      label: 'Beranda',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/produk',
      label: 'Produk',
      icon: Package,
    },
    {
      href: '/dashboard/pengaturan',
      label: 'Pengaturan',
      icon: Settings,
    },
    {
      href: '/dashboard/profil',
      label: 'Akun',
      icon: UserRound,
    },
  ];

  return (
    <div className="dashboard-shell">
      {/* SIDEBAR DESKTOP */}
      <aside className="sidebar">
        <Link href="/" className="brand dashboard-brand">
          link<span>usaha</span>
        </Link>

        <div className="dashboard-nav-label">MENU UTAMA</div>

        <nav className="dashboard-sidebar-nav" aria-label="Navigasi utama">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className="nav-link" href={href} key={href}>
              <Icon size={18} />
              <span>{label === 'Beranda' ? 'Ringkasan' : label === 'Akun' ? 'Akun saya' : label}</span>
            </Link>
          ))}

          {isPlatformAdmin && (
            <Link className="nav-link dashboard-admin-link" href="/dashboard/admin">
              <ShieldCheck size={18} />
              <span>Admin platform</span>
            </Link>
          )}

          {business?.slug && (
            <Link
              className="nav-link dashboard-external-link"
              href={`/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={18} />
              <span>Lihat website</span>
            </Link>
          )}
        </nav>

        <div className="side-bottom dashboard-account-bottom">
          <div className="dashboard-user-email">{user.email}</div>

          <form action={signOut}>
            <button type="submit" className="dashboard-logout">
              <LogOut size={16} />
              Keluar akun
            </button>
          </form>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="dashboard-mobile-header">
        <Link href="/" className="brand dashboard-brand">
          link<span>usaha</span>
        </Link>

        <div className="dashboard-mobile-header-actions">
          {business?.slug && (
            <Link
              href={`/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-mobile-website"
              aria-label="Lihat website usaha"
            >
              <ExternalLink size={19} />
            </Link>
          )}

          {isPlatformAdmin && (
            <Link
              href="/dashboard/admin"
              className="dashboard-mobile-admin"
              aria-label="Admin platform"
            >
              <ShieldCheck size={19} />
            </Link>
          )}

          <form action={signOut}>
            <button
              type="submit"
              className="dashboard-mobile-logout"
              aria-label="Keluar akun"
            >
              <LogOut size={19} />
            </button>
          </form>
        </div>
      </header>

      {/* HALAMAN */}
      <main className="dash-main">{children}</main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="dashboard-mobile-nav" aria-label="Navigasi dashboard">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link href={href} className="dashboard-mobile-nav-item" key={href}>
            <Icon size={21} strokeWidth={1.9} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
