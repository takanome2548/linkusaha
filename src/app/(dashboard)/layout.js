
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
  Eye,
  CreditCard,
  Store,
  TrendingUp,
  UsersRound,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions/auth';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Ambil role pengguna
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isPlatformAdmin = ['admin', 'super_admin'].includes(
    profile?.role
  );

  const isSuperAdmin = profile?.role === 'super_admin';

  // Ambil data usaha hanya untuk pengguna biasa
  let business = null;

  if (!isPlatformAdmin) {
    const { data } = await supabase
      .from('businesses')
      .select('slug, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    business = data;
  }

  // MENU PEMILIK USAHA
  const businessNavigation = [
    {
      href: '/dashboard',
      label: 'Ringkasan',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/pratinjau',
      label: 'Pratinjau',
      icon: Eye,
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
      href: '/dashboard/langganan',
      label: 'Langganan',
      icon: CreditCard,
    },
    {
      href: '/dashboard/profil',
      label: 'Akun saya',
      icon: UserRound,
    },
  ];

  // MENU ADMIN PLATFORM
  const adminNavigation = [
    {
      href: '/dashboard/admin',
      label: 'Statistik Admin',
      icon: TrendingUp,
    },
    {
      href: '/dashboard/admin/bisnis',
      label: 'Manajemen Bisnis',
      icon: Store,
    },
    {
  href: '/dashboard/admin/pembayaran',
  label: 'Langganan & Pembayaran',
  icon: CreditCard,
},
{
  href: '/dashboard/admin/pengguna',
  label: 'Manajemen Pengguna',
  icon: UsersRound,
},
  ];

  // Pilih navigasi berdasarkan role
  const navigation = isPlatformAdmin
    ? adminNavigation
    : businessNavigation;

  return (
    <div className="dashboard-shell">

      {/* SIDEBAR DESKTOP */}
      <aside className="sidebar">

        {/* BRAND */}
        <Link href="/" className="brand dashboard-brand">
          link<span>usaha</span>
        </Link>

        {isPlatformAdmin ? (
          <>
            {/* ADMIN SIDEBAR */}
            <div className="dashboard-nav-label">
              ADMIN PLATFORM
            </div>

            <nav
              className="dashboard-sidebar-nav"
              aria-label="Navigasi admin"
            >
              {adminNavigation.map(({ href, label, icon: Icon }) => (
                <Link
                  className="nav-link dashboard-admin-link"
                  href={href}
                  key={href}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            {/* IDENTITAS ADMIN */}
            <div
              className="dashboard-nav-label"
              style={{ marginTop: 25 }}
            >
              AKUN ADMIN
            </div>

            <div
              style={{
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--muted, #64748b)',
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                <ShieldCheck size={16} />
                <strong>
                  {isSuperAdmin
                    ? 'Super Administrator'
                    : 'Administrator'}
                </strong>
              </div>
              <div style={{ overflowWrap: 'anywhere' }}>
                {user.email}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* SIDEBAR PEMILIK USAHA */}
            <div className="dashboard-nav-label">
              MENU USAHA
            </div>

            <nav
              className="dashboard-sidebar-nav"
              aria-label="Navigasi usaha"
            >
              {businessNavigation.map(({ href, label, icon: Icon }) => (
                <Link
                  className="nav-link"
                  href={href}
                  key={href}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            {/* LIHAT WEBSITE */}
            {business?.slug && (
              <>
                <div
                  className="dashboard-nav-label"
                  style={{ marginTop: 25 }}
                >
                  WEBSITE USAHA
                </div>

                <nav className="dashboard-sidebar-nav">
                  <Link
                    className="nav-link dashboard-external-link"
                    href={`/${business.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={18} />
                    <span>Lihat website</span>
                  </Link>
                </nav>
              </>
            )}

            {/* EMAIL PEMILIK */}
            <div
              className="dashboard-user-email"
              style={{
                padding: '10px 12px',
                overflowWrap: 'anywhere',
              }}
            >
              {user.email}
            </div>
          </>
        )}

        {/* LOGOUT */}
        <div className="side-bottom dashboard-account-bottom">
          <form action={signOut}>
            <button
              type="submit"
              className="dashboard-logout"
            >
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

          {!isPlatformAdmin && business?.slug && (
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

      {/* KONTEN HALAMAN */}
      <main className="dash-main">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className="dashboard-mobile-nav"
        aria-label="Navigasi dashboard"
      >
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            className="dashboard-mobile-nav-item"
            key={href}
          >
            <Icon size={21} strokeWidth={1.9} />
            <span>{isPlatformAdmin ? 'Admin' : label}</span>
          </Link>
        ))}
      </nav>

    </div>
  );
}
