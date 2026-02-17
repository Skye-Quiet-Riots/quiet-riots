import { getDb } from '@/lib/db';

export async function seedTestData() {
  const db = getDb();

  // 3 issues across 2 categories
  await db.execute({
    sql: `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      1,
      'Rail Cancellations',
      'Transport',
      'Train cancellations across the network',
      2847,
      3,
      340,
    ],
  });
  await db.execute({
    sql: `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [2, 'Broadband Speed', 'Telecoms', 'Slow internet speeds', 4112, 5, 520],
  });
  await db.execute({
    sql: `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [3, 'Flight Delays', 'Transport', 'Airport delays and cancellations', 12340, 28, 890],
  });

  // 2 organisations (with new columns)
  await db.execute({
    sql: `INSERT INTO organisations (id, name, category, logo_emoji, description, sector, country, regulator, ombudsman, website)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      1,
      'Southern Rail',
      'Transport',
      '🚂',
      'UK rail operator',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.southernrailway.com',
    ],
  });
  await db.execute({
    sql: `INSERT INTO organisations (id, name, category, logo_emoji, description, sector, country, regulator, ombudsman, website)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      2,
      'BT',
      'Telecoms',
      '📞',
      'UK broadband provider',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.bt.com',
    ],
  });

  // Pivot data (issue <-> org links with Pareto ranking)
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: [1, 1, 2847, 1],
  });
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: [1, 2, 500, 2],
  });
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: [2, 2, 2345, 1],
  });
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: [3, 1, 890, 1],
  });

  // Synonyms
  await db.execute({
    sql: `INSERT INTO synonyms (issue_id, term) VALUES (?, ?)`,
    args: [1, 'train cancellations'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (issue_id, term) VALUES (?, ?)`,
    args: [1, 'cancelled trains'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (issue_id, term) VALUES (?, ?)`,
    args: [2, 'slow internet'],
  });

  // 2 users
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [1, 'Sarah K.', 'sarah@example.com', null, '10min', 'writing,organising'],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [2, 'Marcio R.', 'marcio@example.com', '+5511999999999', '1hr+', 'languages,media'],
  });

  // User-issue memberships
  await db.execute({
    sql: `INSERT INTO user_issues (user_id, issue_id) VALUES (?, ?)`,
    args: [1, 1],
  });
  await db.execute({
    sql: `INSERT INTO user_issues (user_id, issue_id) VALUES (?, ?)`,
    args: [2, 1],
  });

  // Actions (covering all 3 types and various time/skill combos)
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      1,
      1,
      'Write to Regulator',
      'Send a formal complaint',
      'action',
      '10min',
      'writing',
      'https://example.com',
      'Rail Ombudsman',
    ],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [2, 1, 'Sign petition', 'Join the petition', 'action', '1min', '', null, null],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [3, 1, 'Brainstorm solutions', 'Join the brainstorm', 'idea', '10min', '', null, null],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      4,
      1,
      'Welcome new members',
      'Help newcomers get started',
      'together',
      '1min',
      'organising',
      null,
      null,
    ],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      5,
      2,
      'Speed test evidence',
      'Document your speeds',
      'action',
      '1min',
      'tech',
      'https://speedtest.net',
      'Speedtest',
    ],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      6,
      1,
      'Film your platform',
      'Document overcrowding',
      'action',
      '10min',
      'media',
      null,
      null,
    ],
  });

  // Community health
  await db.execute({
    sql: `INSERT INTO community_health (issue_id, needs_met, membership, influence, connection) VALUES (?, ?, ?, ?, ?)`,
    args: [1, 82, 71, 68, 75],
  });
  await db.execute({
    sql: `INSERT INTO community_health (issue_id, needs_met, membership, influence, connection) VALUES (?, ?, ?, ?, ?)`,
    args: [2, 79, 73, 70, 74],
  });

  // Expert profiles
  await db.execute({
    sql: `INSERT INTO expert_profiles (issue_id, name, role, speciality, achievement, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [1, 'Dr. Patel', 'Rail Rights Expert', 'Legal guidance', '12 years experience', '⚖️'],
  });
  await db.execute({
    sql: `INSERT INTO expert_profiles (issue_id, name, role, speciality, achievement, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [1, 'Yuki T.', 'Media Lead', 'Video campaigns', 'Running evidence campaign', '📸'],
  });

  // Feed posts
  await db.execute({
    sql: `INSERT INTO feed (id, issue_id, user_id, content, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [1, 1, 1, 'Just got my refund!', 24, '2026-02-15 08:30:00'],
  });
  await db.execute({
    sql: `INSERT INTO feed (id, issue_id, user_id, content, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [2, 1, 2, 'Same problem in Portugal', 18, '2026-02-15 07:00:00'],
  });

  // Country breakdown
  await db.execute({
    sql: `INSERT INTO country_breakdown (issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?)`,
    args: [1, 'GB', 'United Kingdom', 2134],
  });
  await db.execute({
    sql: `INSERT INTO country_breakdown (issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?)`,
    args: [1, 'FR', 'France', 412],
  });
  await db.execute({
    sql: `INSERT INTO country_breakdown (issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?)`,
    args: [2, 'GB', 'United Kingdom', 3201],
  });
  await db.execute({
    sql: `INSERT INTO country_breakdown (issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?)`,
    args: [2, 'US', 'United States', 412],
  });

  // Seasonal patterns
  await db.execute({
    sql: `INSERT INTO seasonal_patterns (issue_id, peak_months, description) VALUES (?, ?, ?)`,
    args: [1, '[11,12,1,2]', 'Train cancellations worse in winter weather'],
  });
  await db.execute({
    sql: `INSERT INTO seasonal_patterns (issue_id, peak_months, description) VALUES (?, ?, ?)`,
    args: [3, '[6,7,8]', 'Flight delays peak during summer holiday season'],
  });

  // Issue relations
  await db.execute({
    sql: `INSERT INTO issue_relations (child_id, parent_id, relation_type) VALUES (?, ?, ?)`,
    args: [1, 2, 'related_to'],
  });
}
