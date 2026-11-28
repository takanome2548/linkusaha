
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Store,
  ShieldCheck,
  Search,
  UserRound,
  Mail,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Manajemen Pengguna',
};

const formatDate = (date) => {
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const roleInfo = (role) => {
  const roles = {
    user: {
      label: 'Pengguna',
      color: '#475569',
      background: '#f1f5f9',
    },
    admin: {
      label: 'Admin',
      color: '#1d4ed8',
      background: '#dbeafe',
    },
    super_admin: {
      label: 'Super Admin',
      color: '#7c3aed',
      background: '#ede9fe',
    },
  };

  return roles[role] || roles.user;
};

function RoleBadge({ role }) {
  const info = roleInfo(role);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: 20,
        background: info.background,
        color: info.color,
        fontSize: 12,
        fontWeight: 650,
        whiteSpace: 'nowrap',
      }}
    >
      {info.label}
    </span>
  );
}

const cardStyle = {
  background: 'var(--card, #ffffff)',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 14,
  padding: 20,
};

export default async function AdminUsersPage({ searchParams }) {
  const params = await searchParams;

  const q = (params?.q || '').trim().toLowerCase();
  const roleFilter = params?.role || 'all';

  // Verifikasi sesi pengguna
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Hanya admin platform yang boleh mengakses halaman ini
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!['admin', 'super_admin'].includes(currentProfile?.role)) {
    redirect('/dashboard');
  }

  // Supabase Admin Client hanya digunakan di server
  const adminSupabase = createAdminClient();

  const [
    { data: authResult, error: authError },
    { data: profiles, error: profileError },
    { data: businesses, error: businessError },
  ] = await Promise.all([
    adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),

    supabase
      .from('profiles')
      .select('id,full_name,role,created_at')
      .order('created_at', { ascending: false }),

    supabase
      .from('businesses')
      .select('id,owner_id,name,slug,logo_path')
      .order('created_at', { ascending: false }),
  ]);

  const authUsers = authResult?.users || [];
  const profileRows = profiles || [];
  const businessRows = businesses || [];

  // Peta profil pengguna
  const profileMap = new Map(
    profileRows.map((item) => [item.id, item])
  );

  // Peta bisnis berdasarkan pemilik.
  // Bisnis terbaru akan digunakan jika ada lebih dari satu.
  const businessMap = new Map();

  for (const business of businessRows) {
    if (businessMap.has(business.owner_id)) continue;

    const logoUrl = business.logo_path
      ? supabase.storage
          .from('business-assets')
          .getPublicUrl(business.logo_path).data.publicUrl
      : null;

    businessMap.set(business.owner_id, {
      ...business,
      logoUrl,
    });
  }

  // Gabungkan data autentikasi, profil, dan bisnis
  const users = authUsers.map((authUser) => {
    const profile = profileMap.get(authUser.id);
    const business = businessMap.get(authUser.id);

    return {
      id: authUser.id,
      email: authUser.email || '-',
      fullName: profile?.full_name || 'Belum mengisi nama',
      role: profile?.role || 'user',
      createdAt: authUser.created_at || profile?.created_at,
      business,
    };
  });

  const totalUsers = users.length;

  const regularUsers = users.filter(
    (item) => item.role === 'user'
  ).length;

  const adminUsers = users.filter(
    (item) => item.role === 'admin'
  ).length;

  const superAdminUsers = users.filter(
    (item) => item.role === 'super_admin'
  ).length;

  const businessOwners = new Set(
    businessRows.map((item) => item.owner_id)
  ).size;

  // Pencarian dan filter
  const filteredUsers = users.filter((item) => {
    const matchesSearch =
      !q ||
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.business?.name?.toLowerCase().includes(q) ||
      item.business?.slug?.toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'all' || item.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const inputStyle = {
    width: '100%',
    minWidth: 0,
    padding: '11px 13px',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: 9,
    background: 'var(--input, #ffffff)',
    color: 'var(--foreground, #111827)',
    fontSize: 13,
  };

  const stats = [
    {
      label: 'Total Pengguna',
      value: totalUsers,
      description: 'Akun terdaftar di platform',
      icon: Users,
      color: '#2563eb',
    },
    {
      label: 'Pemilik Usaha',
      value: businessOwners,
      description: 'Pengguna yang memiliki bisnis',
      icon: Store,
      color: '#059669',
    },
    {
      label: 'Administrator',
      value: adminUsers + superAdminUsers,
      description: 'Admin dan super admin',
      icon: ShieldCheck,
      color: '#7c3aed',
    },
    {
      label: 'Pengguna Biasa',
      value: regularUsers,
      description: 'Role pengguna',
      icon: UserRound,
      color: '#d97706',
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* HEADER */}
      <div>
        <Link
          href="/dashboard/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            color: 'var(--muted-foreground, #64748b)',
            fontSize: 13,
            textDecoration: 'none',
            marginBottom: 18,
          }}
        >
          <ArrowLeft size={16} />
          Kembali ke Admin Platform
        </Link>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 750,
            letterSpacing: '-0.7px',
            margin: 0,
          }}
        >
          Manajemen Pengguna
        </h1>

        <p
          style={{
            color: 'var(--muted-foreground, #64748b)',
            fontSize: 14,
            marginTop: 7,
            marginBottom: 0,
          }}
        >
          Kelola dan pantau akun pengguna yang terdaftar di LinkUsaha.
        </p>
      </div>

      {/* ERROR */}
      {(authError || profileError || businessError) && (
        <div
          style={{
            padding: 15,
            borderRadius: 10,
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: 13,
          }}
        >
          Sebagian data pengguna gagal dimuat.

          {authError && (
            <div style={{ marginTop: 5 }}>
              Gagal mengambil data autentikasi: {authError.message}
            </div>
          )}

          {profileError && (
            <div style={{ marginTop: 5 }}>
              Gagal mengambil profil: {profileError.message}
            </div>
          )}

          {businessError && (
            <div style={{ marginTop: 5 }}>
              Gagal mengambil bisnis: {businessError.message}
            </div>
          )}
        </div>
      )}

      {/* STATISTIK */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
        }}
      >
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    color: 'var(--muted-foreground, #64748b)',
                    fontSize: 13,
                  }}
                >
                  {item.label}
                </span>

                <Icon size={19} color={item.color} />
              </div>

              <div
                style={{
                  fontSize: 25,
                  fontWeight: 750,
                  marginTop: 15,
                }}
              >
                {item.value}
              </div>

              <div
                style={{
                  color: 'var(--muted-foreground, #64748b)',
                  fontSize: 12,
                  marginTop: 5,
                }}
              >
                {item.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* DAFTAR PENGGUNA */}
      <section
        style={{
          ...cardStyle,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: '1px solid var(--border, #e5e7eb)',
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            Daftar Pengguna
          </h2>

          <p
            style={{
              color: 'var(--muted-foreground, #64748b)',
              fontSize: 13,
              margin: '6px 0 0',
            }}
          >
            Informasi akun, hak akses, dan bisnis pengguna.
          </p>
        </div>

        {/* FILTER */}
        <form
          method="GET"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, 220px) auto',
            gap: 10,
            padding: 16,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: 12,
                color: '#94a3b8',
              }}
            />

            <input
              name="q"
              defaultValue={params?.q || ''}
              placeholder="Cari nama, email, atau bisnis..."
              style={{
                ...inputStyle,
                paddingLeft: 36,
              }}
            />
          </div>

          <select
            name="role"
            defaultValue={roleFilter}
            style={inputStyle}
          >
            <option value="all">Semua role</option>
            <option value="user">Pengguna</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 9,
              padding: '0 18px',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>

        {/* TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 850,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'transparent',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--border, #e5e7eb)',
                }}
              >
                {[
                  'Pengguna',
                  'Role',
                  'Bisnis',
                  'Bergabung',
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: '15px 16px',
                      fontSize: 11,
                      color: 'var(--muted-foreground, #64748b)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: '1px solid var(--border, #e5e7eb)',
                  }}
                >
                  <td style={{ padding: '15px 16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {/* AVATAR: LOGO BISNIS ATAU IKON DEFAULT */}
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#dbeafe',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {item.business?.logoUrl ? (
                          <img
                            src={item.business.logoUrl}
                            alt={`Logo ${item.business.name}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <UserRound
                            size={19}
                            strokeWidth={2}
                          />
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontWeight: 650,
                            fontSize: 13,
                          }}
                        >
                          {item.fullName}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            color: 'var(--muted-foreground, #64748b)',
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          <Mail size={12} />
                          {item.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '15px 16px' }}>
                    <RoleBadge role={item.role} />
                  </td>

                  <td style={{ padding: '15px 16px' }}>
                    {item.business ? (
                      <>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          {item.business.name}
                        </div>

                        <div
                          style={{
                            color: 'var(--muted-foreground, #64748b)',
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          /{item.business.slug}
                        </div>
                      </>
                    ) : (
                      <span
                        style={{
                          color: 'var(--muted-foreground, #64748b)',
                          fontSize: 12,
                        }}
                      >
                        Belum punya usaha
                      </span>
                    )}
                  </td>

                  <td
                    style={{
                      padding: '15px 16px',
                      fontSize: 12,
                      color: 'var(--muted-foreground, #64748b)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: 35,
                      color: 'var(--muted-foreground, #64748b)',
                      fontSize: 13,
                    }}
                  >
                    Tidak ada pengguna yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border, #e5e7eb)',
            fontSize: 12,
            color: 'var(--muted-foreground, #64748b)',
          }}
        >
          Menampilkan {filteredUsers.length} dari {totalUsers} pengguna.
          {totalUsers === 1000 && (
            <span>
              {' '}Data dibatasi hingga 1.000 akun pada tahap ini.
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
