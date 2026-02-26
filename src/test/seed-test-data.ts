import { getDb } from '@/lib/db';

export async function seedTestData() {
  const db = getDb();

  // 3 issues across 2 categories
  await db.execute({
    sql: `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'issue-rail',
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
    args: ['issue-broadband', 'Broadband Speed', 'Telecoms', 'Slow internet speeds', 4112, 5, 520],
  });
  await db.execute({
    sql: `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'issue-flights',
      'Flight Delays',
      'Transport',
      'Airport delays and cancellations',
      12340,
      28,
      890,
    ],
  });

  // 2 organisations (with new columns)
  await db.execute({
    sql: `INSERT INTO organisations (id, name, category, logo_emoji, description, sector, country, regulator, ombudsman, website)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'org-southern',
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
      'org-bt',
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
    args: ['issue-rail', 'org-southern', 2847, 1],
  });
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: ['issue-rail', 'org-bt', 500, 2],
  });
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: ['issue-broadband', 'org-bt', 2345, 1],
  });
  await db.execute({
    sql: `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`,
    args: ['issue-flights', 'org-southern', 890, 1],
  });

  // Synonyms
  await db.execute({
    sql: `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`,
    args: ['syn-001', 'issue-rail', 'train cancellations'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`,
    args: ['syn-002', 'issue-rail', 'cancelled trains'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`,
    args: ['syn-003', 'issue-broadband', 'slow internet'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`,
    args: ['syn-004', 'issue-rail', 'train cancelled'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`,
    args: ['syn-005', 'issue-rail', 'rail delays'],
  });
  await db.execute({
    sql: `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`,
    args: ['syn-006', 'issue-flights', 'flight cancelled'],
  });

  // 2 users
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      'user-sarah',
      'Sarah K.',
      'sarah@example.com',
      '+447700900001',
      '10min',
      'writing,organising',
    ],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      'user-marcio',
      'Marcio R.',
      'marcio@example.com',
      '+5511999999999',
      '1hr+',
      'languages,media',
    ],
  });

  // User-issue memberships
  await db.execute({
    sql: `INSERT INTO user_issues (user_id, issue_id) VALUES (?, ?)`,
    args: ['user-sarah', 'issue-rail'],
  });
  await db.execute({
    sql: `INSERT INTO user_issues (user_id, issue_id) VALUES (?, ?)`,
    args: ['user-marcio', 'issue-rail'],
  });

  // Actions (covering all 3 types and various time/skill combos)
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'action-001',
      'issue-rail',
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
    args: [
      'action-002',
      'issue-rail',
      'Sign petition',
      'Join the petition',
      'action',
      '1min',
      '',
      null,
      null,
    ],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'action-003',
      'issue-rail',
      'Brainstorm solutions',
      'Join the brainstorm',
      'idea',
      '10min',
      '',
      null,
      null,
    ],
  });
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'action-004',
      'issue-rail',
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
      'action-005',
      'issue-broadband',
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
      'action-006',
      'issue-rail',
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
    sql: `INSERT INTO community_health (id, issue_id, needs_met, membership, influence, connection) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['health-001', 'issue-rail', 82, 71, 68, 75],
  });
  await db.execute({
    sql: `INSERT INTO community_health (id, issue_id, needs_met, membership, influence, connection) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['health-002', 'issue-broadband', 79, 73, 70, 74],
  });

  // Expert profiles
  await db.execute({
    sql: `INSERT INTO expert_profiles (id, issue_id, name, role, speciality, achievement, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'expert-001',
      'issue-rail',
      'Dr. Patel',
      'Rail Rights Expert',
      'Legal guidance',
      '12 years experience',
      '⚖️',
    ],
  });
  await db.execute({
    sql: `INSERT INTO expert_profiles (id, issue_id, name, role, speciality, achievement, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'expert-002',
      'issue-rail',
      'Yuki T.',
      'Media Lead',
      'Video campaigns',
      'Running evidence campaign',
      '📸',
    ],
  });

  // Feed posts
  await db.execute({
    sql: `INSERT INTO feed (id, issue_id, user_id, content, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      'feed-001',
      'issue-rail',
      'user-sarah',
      'Just got my refund!',
      24,
      '2026-02-15 08:30:00',
    ],
  });
  await db.execute({
    sql: `INSERT INTO feed (id, issue_id, user_id, content, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      'feed-002',
      'issue-rail',
      'user-marcio',
      'Same problem in Portugal',
      18,
      '2026-02-15 07:00:00',
    ],
  });

  // Country breakdown
  await db.execute({
    sql: `INSERT INTO country_breakdown (id, issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?, ?)`,
    args: ['country-001', 'issue-rail', 'GB', 'United Kingdom', 2134],
  });
  await db.execute({
    sql: `INSERT INTO country_breakdown (id, issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?, ?)`,
    args: ['country-002', 'issue-rail', 'FR', 'France', 412],
  });
  await db.execute({
    sql: `INSERT INTO country_breakdown (id, issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?, ?)`,
    args: ['country-003', 'issue-broadband', 'GB', 'United Kingdom', 3201],
  });
  await db.execute({
    sql: `INSERT INTO country_breakdown (id, issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?, ?)`,
    args: ['country-004', 'issue-broadband', 'US', 'United States', 412],
  });

  // Seasonal patterns
  await db.execute({
    sql: `INSERT INTO seasonal_patterns (issue_id, peak_months, description) VALUES (?, ?, ?)`,
    args: ['issue-rail', '[11,12,1,2]', 'Train cancellations worse in winter weather'],
  });
  await db.execute({
    sql: `INSERT INTO seasonal_patterns (issue_id, peak_months, description) VALUES (?, ?, ?)`,
    args: ['issue-flights', '[6,7,8]', 'Flight delays peak during summer holiday season'],
  });

  // Issue relations
  await db.execute({
    sql: `INSERT INTO issue_relations (child_id, parent_id, relation_type) VALUES (?, ?, ?)`,
    args: ['issue-rail', 'issue-broadband', 'related_to'],
  });

  // Riot Reels
  await db.execute({
    sql: `INSERT INTO riot_reels (id, issue_id, youtube_url, youtube_video_id, title, thumbnail_url, caption, source, status, upvotes, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'reel-001',
      'issue-rail',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'dQw4w9WgXcQ',
      'British Rail — We Are Getting There (1987)',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      'They were not, in fact, getting there',
      'curated',
      'approved',
      42,
      156,
    ],
  });
  await db.execute({
    sql: `INSERT INTO riot_reels (id, issue_id, youtube_url, youtube_video_id, title, thumbnail_url, caption, source, status, upvotes, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'reel-002',
      'issue-rail',
      'https://www.youtube.com/watch?v=abc123test1',
      'abc123test1',
      'Platform announcement bingo',
      'https://img.youtube.com/vi/abc123test1/hqdefault.jpg',
      'We apologise for the delay to your delay',
      'community',
      'approved',
      18,
      89,
    ],
  });
  await db.execute({
    sql: `INSERT INTO riot_reels (id, issue_id, youtube_url, youtube_video_id, title, thumbnail_url, caption, source, status, upvotes, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'reel-003',
      'issue-broadband',
      'https://www.youtube.com/watch?v=xyz789test1',
      'xyz789test1',
      'Dial-up internet sound — 10 hours',
      'https://img.youtube.com/vi/xyz789test1/hqdefault.jpg',
      'The shared pain of a generation',
      'curated',
      'featured',
      67,
      234,
    ],
  });
  await db.execute({
    sql: `INSERT INTO riot_reels (id, issue_id, youtube_url, youtube_video_id, title, thumbnail_url, caption, source, status, upvotes, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'reel-004',
      'issue-rail',
      'https://www.youtube.com/watch?v=pending00001',
      'pending00001',
      'Pending reel that should not appear',
      'https://img.youtube.com/vi/pending00001/hqdefault.jpg',
      'This should not be visible',
      'community',
      'pending',
      0,
      0,
    ],
  });

  // Reel votes
  await db.execute({
    sql: `INSERT INTO reel_votes (reel_id, user_id) VALUES (?, ?)`,
    args: ['reel-001', 'user-sarah'],
  });

  // Action Initiatives
  await db.execute({
    sql: `INSERT INTO action_initiatives (id, issue_id, title, description, target_pence, committed_pence, supporter_count, recipient, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'camp-water-test',
      'issue-rail',
      'Rail Legal Review',
      'Fund independent legal review',
      100000,
      31000,
      155,
      'Transport Focus',
      'active',
    ],
  });
  await db.execute({
    sql: `INSERT INTO action_initiatives (id, issue_id, title, description, target_pence, committed_pence, supporter_count, recipient, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'camp-funded',
      'issue-broadband',
      'Speed Map App',
      'Community speed mapping app',
      50000,
      50000,
      250,
      'Open Rights Group',
      'goal_reached',
    ],
  });
  await db.execute({
    sql: `INSERT INTO action_initiatives (id, issue_id, title, description, target_pence, committed_pence, supporter_count, recipient, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'camp-almost-funded',
      'issue-rail',
      'Season Ticket Toolkit',
      'Help commuters claim refunds',
      10000,
      9950,
      50,
      'Transport Salaried Staffs',
      'active',
    ],
  });

  // Category assistants (2 pairs for testing)
  await db.execute({
    sql: `INSERT INTO category_assistants (id, category, agent_name, agent_icon, agent_quote, agent_bio, agent_gradient_start, agent_gradient_end, human_name, human_icon, human_quote, human_bio, human_gradient_start, human_gradient_end, goal, focus, focus_detail, profile_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'asst-transport',
      'transport',
      'Jett',
      '🛩️',
      'Once helped a rioter file 6 refund claims during a single delayed journey.',
      'Tracks cancellation patterns and handles refund paperwork.',
      '#8b5cf6',
      '#7c3aed',
      'Bex',
      '👩🏻',
      'Watching Avanti scramble when 400 of us tweeted at the same time.',
      'Regular commuter from Manchester.',
      '#3b82f6',
      '#1d4ed8',
      'Help rioters hold UK transport companies to account.',
      'Avanti West Coast cancellation patterns',
      'Building a dataset of cancellations for the ORR.',
      '/assistants/transport',
    ],
  });
  await db.execute({
    sql: `INSERT INTO category_assistants (id, category, agent_name, agent_icon, agent_quote, agent_bio, agent_gradient_start, agent_gradient_end, human_name, human_icon, human_quote, human_bio, human_gradient_start, human_gradient_end, goal, focus, focus_detail, profile_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'asst-telecoms',
      'telecoms',
      'Pulse',
      '💜',
      'Ran speed tests for 200 rioters. Average was 18 Mbps.',
      'Analyses broadband speeds and compiles provider comparison data.',
      '#a855f7',
      '#7c3aed',
      'Jin',
      '🧑🏻',
      'A whole street switched broadband together.',
      'Tech-savvy Londoner who got fed up paying for broadband speeds.',
      '#06b6d4',
      '#0891b2',
      'Help rioters get the broadband and mobile service they pay for.',
      'Mid-contract price rises',
      'Collecting evidence from rioters hit by CPI+ increases.',
      '/assistants/telecoms',
    ],
  });

  // Assistant activity (3 entries)
  await db.execute({
    sql: `INSERT INTO assistant_activity (id, category, assistant_type, activity_type, description, stat_value, stat_label, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'act-001',
      'transport',
      'agent',
      'reviewed_actions',
      'Reviewed 12 new actions this week — 8 approved and now live',
      12,
      'actions',
      '2026-02-22 10:00:00',
    ],
  });
  await db.execute({
    sql: `INSERT INTO assistant_activity (id, category, assistant_type, activity_type, description, stat_value, stat_label, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'act-002',
      'transport',
      'human',
      'connected_rioters',
      'Connected 15 rioters on the Manchester–London corridor',
      15,
      'rioters',
      '2026-02-21 14:00:00',
    ],
  });
  await db.execute({
    sql: `INSERT INTO assistant_activity (id, category, assistant_type, activity_type, description, stat_value, stat_label, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'act-003',
      'telecoms',
      'agent',
      'compiled_data',
      'Compiled speed test data from 200 rioters for Ofcom submission',
      200,
      'rioters',
      '2026-02-20 09:00:00',
    ],
  });

  // Per-riot assistant copy on test issues
  await db.execute({
    sql: `UPDATE issues SET agent_helps = ?, human_helps = ?, agent_focus = ?, human_focus = ? WHERE id = ?`,
    args: [
      'Tracks cancellation patterns by route and time',
      'Connects rioters on the same routes',
      'Analysing Avanti West Coast cancellation data',
      'Linking up rioters on the Manchester–London corridor',
      'issue-rail',
    ],
  });
  await db.execute({
    sql: `UPDATE issues SET agent_helps = ?, human_helps = ?, agent_focus = ?, human_focus = ? WHERE id = ?`,
    args: [
      'Runs speed test analysis and helps build Ofcom complaints',
      'Shares which providers deliver on their promises',
      'Speed test data from 200 rioters shows average 18 Mbps on 65 Mbps plans',
      'Organised a street-level broadband switch in Hackney',
      'issue-broadband',
    ],
  });

  // Evidence
  await db.execute({
    sql: `INSERT INTO evidence (id, issue_id, org_id, user_id, content, media_type, photo_urls, video_url, external_urls, live, likes, comments_count, shares, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'ev-001',
      'issue-rail',
      'org-southern',
      'user-sarah',
      'Platform 4 at Manchester Piccadilly. 17:42 to Leeds cancelled.',
      'text',
      '[]',
      null,
      '[]',
      0,
      10,
      1,
      2,
      '2026-02-22 17:45:00',
    ],
  });
  await db.execute({
    sql: `INSERT INTO evidence (id, issue_id, org_id, user_id, content, media_type, photo_urls, video_url, external_urls, live, likes, comments_count, shares, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'ev-002',
      'issue-rail',
      'org-southern',
      'user-marcio',
      'LIVE from Sheffield station. Platform packed.',
      'live_stream',
      '[]',
      null,
      '[]',
      1,
      5,
      0,
      1,
      '2026-02-24 07:30:00',
    ],
  });
  await db.execute({
    sql: `INSERT INTO evidence (id, issue_id, org_id, user_id, content, media_type, photo_urls, video_url, external_urls, live, likes, comments_count, shares, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'ev-003',
      'issue-rail',
      null,
      'user-sarah',
      'Departure board showing 5 cancellations.',
      'photo',
      '["https://placehold.co/800x600/dc2626/fff?text=Departure+Board"]',
      null,
      '[]',
      0,
      8,
      0,
      3,
      '2026-02-21 08:15:00',
    ],
  });

  // Evidence comments
  await db.execute({
    sql: `INSERT INTO evidence_comments (id, evidence_id, user_id, content, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['ev-comment-001', 'ev-001', 'user-marcio', 'Same problem here!', '2026-02-22 18:00:00'],
  });

  // Wallet for sarah with £5 balance
  await db.execute({
    sql: `INSERT INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['wallet-sarah', 'user-sarah', 500, 1000, 500],
  });
  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, description)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['wtx-topup-1', 'wallet-sarah', 'topup', 1000, 'Wallet top-up'],
  });
  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, action_initiative_id, issue_id, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'wtx-contrib-1',
      'wallet-sarah',
      'payment',
      500,
      'camp-water-test',
      'issue-rail',
      'Rail Legal Review',
    ],
  });

  // User with password (pre-hashed 'testPassword123' via SHA-256 + bcrypt 12 rounds)
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills, password_hash, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'user-with-password',
      'Pat W.',
      'pat@example.com',
      '+447700900077',
      '10min',
      'writing',
      '$2b$12$z8rPMziMeA54HtIxQ.mWteC4neFoW9rp.zxp0zTFaJdftbLcBURvW',
      1,
    ],
  });

  // Additional user for testing roles and suggestions
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      'user-admin',
      'Simon D.',
      'simon.darling@whatsapp.com',
      '+447974766838',
      '1hr+',
      'admin,strategy',
    ],
  });
  await db.execute({
    sql: `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['user-new', 'New User', 'newuser@example.com', '+447700900003', '10min', ''],
  });

  // User roles
  await db.execute({
    sql: `INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)`,
    args: ['role-sarah-guide', 'user-sarah', 'setup_guide', 'user-admin'],
  });
  await db.execute({
    sql: `INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)`,
    args: ['role-admin', 'user-admin', 'administrator', null],
  });

  // A pending issue (suggested but not yet approved)
  await db.execute({
    sql: `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta, status, first_rioter_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'issue-mobile-data',
      'Mobile Data Costs',
      'Telecoms',
      'Expensive mobile data plans',
      1,
      1,
      0,
      'pending_review',
      'user-new',
    ],
  });

  // Issue suggestions
  await db.execute({
    sql: `INSERT INTO issue_suggestions (id, suggested_by, original_text, suggested_name, suggested_type, category, description, status, issue_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'suggestion-mobile',
      'user-new',
      'mobile data is too expensive in the UK',
      'Mobile Data Costs',
      'issue',
      'Telecoms',
      'Expensive mobile data plans',
      'pending_review',
      'issue-mobile-data',
    ],
  });
  await db.execute({
    sql: `INSERT INTO issue_suggestions (id, suggested_by, original_text, suggested_name, suggested_type, category, description, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'suggestion-fasttrack',
      'user-marcio',
      'FastTrack Broadband never delivers what they promise',
      'FastTrack Broadband',
      'organisation',
      'Telecoms',
      'UK broadband ISP with reliability issues',
      'approved',
    ],
  });

  // Messages
  await db.execute({
    sql: `INSERT INTO messages (id, recipient_id, sender_name, type, subject, body, entity_type, entity_id, read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'msg-001',
      'user-sarah',
      null,
      'suggestion_received',
      'New suggestion: Mobile Data Costs',
      'A new Quiet Riot has been suggested in Telecoms category.',
      'issue_suggestion',
      'suggestion-mobile',
      0,
    ],
  });
  await db.execute({
    sql: `INSERT INTO messages (id, recipient_id, sender_name, type, subject, body, entity_type, entity_id, read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'msg-002',
      'user-new',
      'Sarah K. — Setup Guide',
      'suggestion_approved',
      'Thumbs Up 👍: Mobile Data Costs',
      'Your Quiet Riot suggestion has been approved!',
      'issue_suggestion',
      'suggestion-mobile',
      1,
    ],
  });
  await db.execute({
    sql: `INSERT INTO messages (id, recipient_id, sender_name, type, subject, body, read)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'msg-003',
      'user-marcio',
      null,
      'general',
      'Welcome to Quiet Riots',
      'Thanks for joining the movement!',
      0,
    ],
  });

  // Languages (needed for translations FK)
  await db.execute({
    sql: `INSERT INTO languages (code, name, native_name, direction) VALUES (?, ?, ?, ?)`,
    args: ['pl', 'Polish', 'Polski', 'ltr'],
  });
  await db.execute({
    sql: `INSERT INTO languages (code, name, native_name, direction) VALUES (?, ?, ?, ?)`,
    args: ['es', 'Spanish', 'Español', 'ltr'],
  });
  await db.execute({
    sql: `INSERT INTO languages (code, name, native_name, direction) VALUES (?, ?, ?, ?)`,
    args: ['en', 'English', 'English', 'ltr'],
  });

  // Translations — Polish (pl) for issues and organisations
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-001', 'issue', 'issue-rail', 'name', 'pl', 'Odwołania pociągów', 'machine'],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-002', 'issue', 'issue-broadband', 'name', 'pl', 'Szybkość internetu', 'machine'],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-003', 'issue', 'issue-flights', 'name', 'pl', 'Opóźnienia lotów', 'machine'],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'trans-004',
      'organisation',
      'org-southern',
      'name',
      'pl',
      'Kolej Południowa',
      'machine',
    ],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-005', 'organisation', 'org-bt', 'name', 'pl', 'BT Telekomunikacja', 'machine'],
  });

  // Translations — Spanish (es) for one issue
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-006', 'issue', 'issue-rail', 'name', 'es', 'Cancelaciones de trenes', 'machine'],
  });

  // Translated synonyms — Spanish (es) for synonym terms
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'trans-syn-001',
      'synonym',
      'syn-001',
      'term',
      'es',
      'cancelaciones de trenes',
      'machine',
    ],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-syn-002', 'synonym', 'syn-002', 'term', 'es', 'trenes cancelados', 'machine'],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-syn-003', 'synonym', 'syn-003', 'term', 'es', 'internet lento', 'machine'],
  });
  await db.execute({
    sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['trans-syn-006', 'synonym', 'syn-006', 'term', 'es', 'vuelo cancelado', 'machine'],
  });
}
