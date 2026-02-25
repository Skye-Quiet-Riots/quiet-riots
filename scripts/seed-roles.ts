/**
 * Seed administrator and setup_guide roles for known users.
 *
 * Usage:
 *   # Against staging (via .env.local):
 *   bash scripts/with-staging-env.sh scripts/seed-roles.ts
 *
 *   # Against production:
 *   set -a && source /tmp/vercel-production-env && set +a && npx tsx scripts/seed-roles.ts
 *
 * Idempotent — safe to run multiple times. Uses INSERT OR IGNORE.
 */

async function main() {
  const { requireRemoteDb, printDbBanner } = await import('./db-safety');
  requireRemoteDb();
  printDbBanner();

  const { getDb } = await import('../src/lib/db');
  const db = getDb();

  // Administrator: Simon Darling (+447974766838)
  const adminPhone = '+447974766838';
  const adminResult = await db.execute({
    sql: 'SELECT id, name FROM users WHERE phone = ?',
    args: [adminPhone],
  });

  if (adminResult.rows.length === 0) {
    console.log(`⚠️  No user found with phone ${adminPhone} — skipping admin role`);
  } else {
    const adminUser = adminResult.rows[0] as unknown as { id: string; name: string };
    console.log(`Found admin user: ${adminUser.name} (${adminUser.id})`);

    // Assign administrator role
    const { generateId } = await import('../src/lib/uuid');
    await db.execute({
      sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, assigned_by)
            VALUES (?, ?, 'administrator', NULL)`,
      args: [generateId(), adminUser.id],
    });
    console.log(`✅ Administrator role assigned to ${adminUser.name}`);

    // Also assign setup_guide role (admins should be able to do guide work too)
    await db.execute({
      sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, assigned_by)
            VALUES (?, ?, 'setup_guide', NULL)`,
      args: [generateId(), adminUser.id],
    });
    console.log(`✅ Setup Guide role assigned to ${adminUser.name}`);
  }

  // Verify current roles
  const roles = await db.execute(
    'SELECT ur.role, u.name, u.phone FROM user_roles ur JOIN users u ON u.id = ur.user_id',
  );
  console.log('\nCurrent roles:');
  for (const row of roles.rows) {
    console.log(`  ${row.role}: ${row.name} (${row.phone})`);
  }

  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
