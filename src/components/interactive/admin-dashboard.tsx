'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { StatBadge } from '@/components/data/stat-badge';
import type { User, UserRole, RoleType } from '@/types';

interface AdminDashboardProps {
  initialUsersWithRoles: { user: User; roles: UserRole[] }[];
  stats: { totalUsers: number; guideCount: number; adminCount: number };
}

export function AdminDashboard({ initialUsersWithRoles, stats }: AdminDashboardProps) {
  const t = useTranslations('Admin');
  const [usersWithRoles, setUsersWithRoles] = useState(initialUsersWithRoles);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data.users);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleRoleAction(userId: string, role: RoleType, action: 'assign' | 'remove') {
    setRoleLoading(`${userId}-${role}-${action}`);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role, action }),
      });
      if (res.ok) {
        // Refresh by re-fetching
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsersWithRoles(data.data.users_with_roles);
        }
      }
    } finally {
      setRoleLoading(null);
    }
  }

  function userHasRole(userId: string, role: RoleType): boolean {
    const entry = usersWithRoles.find((u) => u.user.id === userId);
    return entry ? entry.roles.some((r) => r.role === role) : false;
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge value={stats.totalUsers} label={t('totalUsers')} />
        <StatBadge value={stats.guideCount} label={t('setupGuides')} />
        <StatBadge value={stats.adminCount} label={t('administrators')} />
      </div>

      {/* User search */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{t('searchTitle')}</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {searching ? t('searching') : t('search')}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                  {user.phone && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {userHasRole(user.id, 'setup_guide') ? (
                    <button
                      onClick={() => handleRoleAction(user.id, 'setup_guide', 'remove')}
                      disabled={roleLoading !== null}
                      className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {t('removeGuide')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleAction(user.id, 'setup_guide', 'assign')}
                      disabled={roleLoading !== null}
                      className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {t('makeGuide')}
                    </button>
                  )}
                  {userHasRole(user.id, 'administrator') ? (
                    <button
                      onClick={() => handleRoleAction(user.id, 'administrator', 'remove')}
                      disabled={roleLoading !== null}
                      className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {t('removeAdmin')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleAction(user.id, 'administrator', 'assign')}
                      disabled={roleLoading !== null}
                      className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {t('makeAdmin')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users with roles */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{t('roleHolders')}</h2>
        {usersWithRoles.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noRoleHolders')}</p>
        ) : (
          <div className="space-y-2">
            {usersWithRoles.map(({ user, roles }) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                  <div className="mt-1 flex gap-1">
                    {roles.map((r) => (
                      <span
                        key={r.id}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.role === 'administrator'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}
                      >
                        {r.role === 'administrator' ? t('roleAdmin') : t('roleGuide')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {roles.some((r) => r.role === 'setup_guide') && (
                    <button
                      onClick={() => handleRoleAction(user.id, 'setup_guide', 'remove')}
                      disabled={roleLoading !== null}
                      className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {t('removeGuide')}
                    </button>
                  )}
                  {roles.some((r) => r.role === 'administrator') && (
                    <button
                      onClick={() => handleRoleAction(user.id, 'administrator', 'remove')}
                      disabled={roleLoading !== null}
                      className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {t('removeAdmin')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
