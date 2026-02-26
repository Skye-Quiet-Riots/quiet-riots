'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface RoleEntry {
  id: string;
  user_id: string;
  role: string;
  assigned_by: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

const ASSIGNABLE_ROLES = [
  'share_guide',
  'compliance_guide',
  'treasury_guide',
  'setup_guide',
  'administrator',
];

export function TeamPermissions() {
  const t = useTranslations('Team');
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assign form
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      const res = await fetch('/api/roles/team');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.data?.roles ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignUserId || !assignRole) return;
    setAssigning(true);
    setError('');

    try {
      const res = await fetch('/api/roles/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: assignUserId, role: assignRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to assign role');
        return;
      }

      setAssignUserId('');
      setAssignRole('');
      await fetchRoles();
    } catch {
      setError('Network error');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(userId: string, role: string) {
    setError('');
    try {
      const res = await fetch('/api/roles/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to remove role');
        return;
      }

      await fetchRoles();
    } catch {
      setError('Network error');
    }
  }

  const roleLabels: Record<string, string> = {
    share_guide: t('roleShareGuide'),
    compliance_guide: t('roleComplianceGuide'),
    treasury_guide: t('roleTreasuryGuide'),
    setup_guide: t('roleSetupGuide'),
    administrator: t('roleAdmin'),
  };

  if (loading) {
    return <div className="text-sm text-zinc-500">{t('noRoles')}</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Assign role form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('addRole')}
        </h3>
        <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">{t('mutualExclusive')}</p>
        <form onSubmit={handleAssign} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <select
            value={assignRole}
            onChange={(e) => setAssignRole(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">{t('selectRole')}</option>
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role] || role}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={assigning || !assignUserId || !assignRole}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {assigning ? t('assigning') : t('assign')}
          </button>
        </form>
      </div>

      {/* Existing roles */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Users with Roles
        </h3>
        {roles.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noRoles')}</p>
        ) : (
          <div className="space-y-2">
            {roles.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">
                    {entry.user_name || entry.user_email || entry.user_id}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {roleLabels[entry.role] || entry.role} ·{' '}
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(entry.user_id, entry.role)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  {t('removeRole')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
