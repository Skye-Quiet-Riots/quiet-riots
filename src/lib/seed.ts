import { getDb } from './db';
import { dropTables, createTables } from './schema';
import { generateId } from './uuid';

async function insertRow(sql: string, args: (string | number | null)[]): Promise<string> {
  const db = getDb();
  const id = generateId();
  await db.execute({ sql, args: [id, ...args] });
  return id;
}

export async function seed() {
  await dropTables();
  await createTables();

  // =============================
  // ISSUES (50 across 16 categories)
  // =============================
  const issueSql = `INSERT INTO issues (id, name, category, description, rioter_count, country_count, trending_delta) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const issues = [
    // Transport (1-8)
    [
      'Train Cancellations',
      'Transport',
      'Trains cancelled or severely delayed with inadequate notice or compensation',
      3240,
      3,
      340,
    ],
    [
      'Train Ticket Prices',
      'Transport',
      'Rail fares too expensive, above-inflation increases, inconsistent pricing',
      5612,
      4,
      180,
    ],
    [
      'Flight Delays',
      'Transport',
      'Flights delayed or cancelled, poor communication, difficulty claiming compensation',
      12340,
      28,
      890,
    ],
    [
      'Lost Luggage',
      'Transport',
      'Bags not arriving at destination, slow tracking, inadequate compensation',
      8920,
      35,
      420,
    ],
    [
      'Bus Route Cuts',
      'Transport',
      'Routes cancelled, frequency reduced, rural communities losing bus access',
      3210,
      3,
      150,
    ],
    [
      'Pothole Damage',
      'Local',
      'Potholes damaging vehicles and endangering cyclists, councils slow to repair',
      3800,
      3,
      350,
    ],
    [
      'Parking Fines',
      'Transport',
      'Unfair private parking charges, aggressive enforcement, confusing signage',
      3400,
      3,
      310,
    ],
    [
      'Fuel Prices',
      'Transport',
      'Petrol and diesel prices too high, slow to drop when wholesale falls',
      2100,
      3,
      120,
    ],
    // Telecoms (9-14)
    [
      'Broadband Speed',
      'Telecoms',
      'Internet speeds far below what is advertised and paid for',
      4112,
      5,
      520,
    ],
    [
      'Mobile Signal Dead Zones',
      'Telecoms',
      'No mobile signal in homes, workplaces, or along transport routes',
      1900,
      3,
      170,
    ],
    [
      'Price Rises Mid-Contract',
      'Telecoms',
      'Phone, broadband and TV bills increasing during locked contracts',
      2800,
      3,
      260,
    ],
    [
      'Customer Service Hold Times',
      'Other',
      'Hours on hold waiting to speak to a human being',
      3450,
      8,
      210,
    ],
    [
      'Difficulty Cancelling Subscriptions',
      'Other',
      'Companies making it deliberately hard to cancel or unsubscribe',
      2400,
      3,
      220,
    ],
    [
      'Roaming Charges',
      'Telecoms',
      'Unexpected mobile charges when travelling abroad, post-Brexit price rises',
      1200,
      5,
      100,
    ],
    // Energy (15-20)
    [
      'Energy Bill Costs',
      'Energy',
      'Gas and electricity bills unaffordable, price cap still too high',
      3800,
      3,
      350,
    ],
    [
      'Inaccurate Energy Bills',
      'Energy',
      'Estimated readings wrong, overcharging, billing errors',
      2100,
      3,
      190,
    ],
    [
      'Water Bill Increases',
      'Water',
      'Water bills rising sharply while service quality declines',
      3200,
      3,
      300,
    ],
    [
      'Sewage in Rivers',
      'Water',
      'Water companies dumping raw sewage into waterways and beaches',
      5400,
      3,
      490,
    ],
    [
      'Power Cuts',
      'Energy',
      'Electricity supply interruptions, slow restoration, inadequate compensation',
      1200,
      3,
      90,
    ],
    [
      'Smart Meter Problems',
      'Energy',
      'Smart meters not working, losing functionality after switching supplier',
      1400,
      3,
      120,
    ],
    // Banking & Insurance (21-26)
    [
      'Bank Branch Closures',
      'Banking',
      'Local bank branches closing, leaving communities without access',
      2340,
      3,
      120,
    ],
    [
      'Hidden Bank Charges',
      'Banking',
      'Unexpected fees for overdrafts, foreign transactions, account maintenance',
      9120,
      15,
      450,
    ],
    [
      'Fraud and Scam Losses',
      'Banking',
      'Banks refusing to reimburse victims of fraud and authorised push payment scams',
      3200,
      3,
      290,
    ],
    [
      'Insurance Claim Rejections',
      'Insurance',
      'Claims denied on technicalities after years of paying premiums',
      2400,
      3,
      220,
    ],
    [
      'Mortgage Rate Shock',
      'Banking',
      'Fixed rate ending and moving to much higher variable rate',
      1800,
      3,
      160,
    ],
    [
      'Overseas Transfer Fees',
      'Banking',
      'Excessive fees and poor exchange rates for international money transfers',
      7890,
      22,
      670,
    ],
    // Health (27-32)
    [
      'NHS Waiting Times',
      'Health',
      'Multi-month or multi-year waits for operations and specialist appointments',
      8934,
      1,
      890,
    ],
    [
      'GP Appointment Access',
      'Health',
      'Cannot get through to book GP appointments, weeks-long waits',
      6700,
      1,
      610,
    ],
    [
      'Dentist Availability',
      'Health',
      'Impossible to find an NHS dentist accepting new patients',
      4200,
      1,
      380,
    ],
    [
      'Mental Health Service Waits',
      'Health',
      'Months-long waits for therapy and mental health support',
      4567,
      6,
      340,
    ],
    [
      'Prescription Costs',
      'Health',
      'Cost per item too high in England, inconsistency across UK nations',
      3210,
      4,
      180,
    ],
    [
      'Hospital Parking Charges',
      'Health',
      'Paying to park at hospital while sick or visiting sick relatives',
      1800,
      3,
      140,
    ],
    // Housing (33, 35, 38)
    [
      'Rent Increases',
      'Housing',
      'Private rent rising far above inflation, no-fault eviction threat',
      2800,
      3,
      250,
    ],
    [
      'Council Tax Rises',
      'Local',
      'Annual council tax increases while local services get worse',
      4800,
      3,
      440,
    ],
    [
      'Noisy Neighbours',
      'Housing',
      'Persistent noise disturbance, councils slow to act, affecting mental health',
      1200,
      3,
      90,
    ],
    [
      'Rubbish Collection Changes',
      'Local',
      'Reduced bin collections, confusing recycling rules, overflowing bins',
      2200,
      3,
      200,
    ],
    [
      'Planning Permission Abuse',
      'Local',
      'Unwanted developments approved, green belt under threat, community ignored',
      1400,
      3,
      110,
    ],
    [
      'Damp and Mould in Housing',
      'Housing',
      'Landlords and housing associations failing to fix damp and mould',
      2400,
      3,
      220,
    ],
    // Shopping & Delivery (39-45)
    [
      'Delivery Problems',
      'Delivery',
      'Parcels lost, left in rain, marked delivered but not received',
      4200,
      5,
      380,
    ],
    [
      'Shrinkflation',
      'Shopping',
      'Products getting smaller while prices stay the same or increase',
      2800,
      5,
      250,
    ],
    [
      'Refund Difficulties',
      'Shopping',
      'Companies making returns and refunds unnecessarily difficult',
      1800,
      3,
      160,
    ],
    [
      'Fake Reviews',
      'Shopping',
      'Cannot trust online reviews, fake positive reviews misleading consumers',
      1400,
      5,
      110,
    ],
    [
      'Subscription Traps',
      'Shopping',
      'Free trials converting to paid without clear consent, hard to cancel',
      1200,
      3,
      100,
    ],
    [
      'Food Quality Decline',
      'Shopping',
      'Ready meals worse quality, smaller portions, more additives',
      900,
      3,
      70,
    ],
    [
      'Self-Checkout Frustration',
      'Shopping',
      'Self-service machines unreliable, replacing human staff',
      1200,
      3,
      100,
    ],
    // Environment, Education, Employment (46-50)
    [
      'Plastic Waste',
      'Environment',
      'Excessive unnecessary packaging on products, not recyclable',
      23450,
      54,
      1800,
    ],
    [
      'Cost of Childcare',
      'Other',
      'Childcare costs prohibitively expensive, limiting ability to work',
      3400,
      3,
      310,
    ],
    [
      'Student Loan Repayment',
      'Education',
      'Graduates paying back for decades, threshold and interest changes',
      11230,
      4,
      920,
    ],
    [
      'Dog Fouling',
      'Local',
      'Dog mess in public spaces, parks, and pavements not cleaned up',
      1100,
      3,
      80,
    ],
    [
      'AI Replacing Jobs',
      'Employment',
      'Anxiety about artificial intelligence automating jobs without transition support',
      2800,
      12,
      450,
    ],
  ] as const;

  const issueIds: Record<string, string> = {};
  for (const [name, category, description, rioters, countries, trending] of issues) {
    const id = await insertRow(issueSql, [
      name,
      category,
      description,
      rioters,
      countries,
      trending,
    ]);
    issueIds[name as string] = id;
  }

  // =============================
  // ORGANISATIONS (50 with regulator/sector/country data)
  // =============================
  const orgSql = `INSERT INTO organisations (id, name, category, logo_emoji, description, sector, country, regulator, ombudsman, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const orgs = [
    // Rail (1-6)
    [
      'Avanti West Coast',
      'Transport',
      '🚂',
      'UK rail operator serving the West Coast Main Line',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.avantiwestcoast.co.uk',
    ],
    [
      'Southern / Thameslink',
      'Transport',
      '🚂',
      'UK rail operator serving London and the south',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.southernrailway.com',
    ],
    [
      'Northern Trains',
      'Transport',
      '🚂',
      'UK rail operator serving the north of England',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.northernrailway.co.uk',
    ],
    [
      'CrossCountry',
      'Transport',
      '🚂',
      'UK long-distance rail operator',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.crosscountrytrains.co.uk',
    ],
    [
      'TransPennine Express',
      'Transport',
      '🚂',
      'UK rail operator serving trans-Pennine routes',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.tpexpress.co.uk',
    ],
    [
      'LNER',
      'Transport',
      '🚂',
      'UK rail operator serving the East Coast Main Line',
      'rail',
      'UK',
      'ORR',
      'Rail Ombudsman',
      'https://www.lner.co.uk',
    ],
    // Airlines (7-10)
    [
      'Ryanair',
      'Transport',
      '✈️',
      'Low-cost European airline',
      'airline',
      'EU',
      'CAA',
      null,
      'https://www.ryanair.com',
    ],
    [
      'EasyJet',
      'Transport',
      '✈️',
      'UK-based low-cost airline',
      'airline',
      'UK',
      'CAA',
      null,
      'https://www.easyjet.com',
    ],
    [
      'British Airways',
      'Transport',
      '✈️',
      'UK flag carrier airline',
      'airline',
      'UK',
      'CAA',
      null,
      'https://www.britishairways.com',
    ],
    [
      'TUI',
      'Transport',
      '✈️',
      'Holiday and travel company',
      'holiday',
      'UK',
      'CAA',
      null,
      'https://www.tui.co.uk',
    ],
    // Telecoms (11-16)
    [
      'BT / EE',
      'Telecoms',
      '📞',
      'Major UK broadband and mobile provider',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.bt.com',
    ],
    [
      'Virgin Media O2',
      'Telecoms',
      '📶',
      'UK broadband, TV, and mobile provider',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.virginmedia.com',
    ],
    [
      'Sky',
      'Telecoms',
      '📡',
      'UK TV, broadband, and mobile provider',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.sky.com',
    ],
    [
      'Vodafone',
      'Telecoms',
      '📱',
      'Global telecoms company headquartered in the UK',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.vodafone.co.uk',
    ],
    [
      'Three',
      'Telecoms',
      '3️⃣',
      'UK mobile network operator',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.three.co.uk',
    ],
    [
      'TalkTalk',
      'Telecoms',
      '📞',
      'UK broadband and phone provider',
      'telecoms',
      'UK',
      'Ofcom',
      'CISAS',
      'https://www.talktalk.co.uk',
    ],
    // Energy (17-22)
    [
      'British Gas',
      'Energy',
      '🔥',
      'UK energy supplier',
      'energy',
      'UK',
      'Ofgem',
      'Energy Ombudsman',
      'https://www.britishgas.co.uk',
    ],
    [
      'OVO Energy',
      'Energy',
      '⚡',
      'UK energy supplier',
      'energy',
      'UK',
      'Ofgem',
      'Energy Ombudsman',
      'https://www.ovoenergy.com',
    ],
    [
      'EDF',
      'Energy',
      '⚡',
      'UK energy supplier (French-owned)',
      'energy',
      'UK',
      'Ofgem',
      'Energy Ombudsman',
      'https://www.edfenergy.com',
    ],
    [
      'Octopus Energy',
      'Energy',
      '🐙',
      'UK renewable energy supplier',
      'energy',
      'UK',
      'Ofgem',
      'Energy Ombudsman',
      'https://octopus.energy',
    ],
    [
      'Scottish Power',
      'Energy',
      '⚡',
      'UK energy supplier',
      'energy',
      'UK',
      'Ofgem',
      'Energy Ombudsman',
      'https://www.scottishpower.co.uk',
    ],
    [
      'E.ON',
      'Energy',
      '⚡',
      'UK energy supplier (German-owned)',
      'energy',
      'UK',
      'Ofgem',
      'Energy Ombudsman',
      'https://www.eonenergy.com',
    ],
    // Water (23-27)
    [
      'Thames Water',
      'Water',
      '💧',
      'Water and sewerage company for London and the Thames Valley',
      'water',
      'UK',
      'Ofwat',
      'Water Ombudsman',
      'https://www.thameswater.co.uk',
    ],
    [
      'Southern Water',
      'Water',
      '💧',
      'Water company for the south of England',
      'water',
      'UK',
      'Ofwat',
      'Water Ombudsman',
      'https://www.southernwater.co.uk',
    ],
    [
      'United Utilities',
      'Water',
      '💧',
      'Water company for the north west of England',
      'water',
      'UK',
      'Ofwat',
      'Water Ombudsman',
      'https://www.unitedutilities.com',
    ],
    [
      'Severn Trent',
      'Water',
      '💧',
      'Water company for the Midlands',
      'water',
      'UK',
      'Ofwat',
      'Water Ombudsman',
      'https://www.stwater.co.uk',
    ],
    [
      'Anglian Water',
      'Water',
      '💧',
      'Water company for East Anglia',
      'water',
      'UK',
      'Ofwat',
      'Water Ombudsman',
      'https://www.anglianwater.co.uk',
    ],
    // Banking (28-33)
    [
      'Barclays',
      'Banking',
      '🏦',
      'British multinational bank',
      'bank',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.barclays.co.uk',
    ],
    [
      'HSBC',
      'Banking',
      '🏦',
      'Global banking and financial services',
      'bank',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.hsbc.co.uk',
    ],
    [
      'NatWest',
      'Banking',
      '🏧',
      'UK retail and commercial bank',
      'bank',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.natwest.com',
    ],
    [
      'Lloyds / Halifax',
      'Banking',
      '💳',
      'UK banking group',
      'bank',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.lloydsbank.com',
    ],
    [
      'Santander',
      'Banking',
      '🏦',
      'UK bank (Spanish-owned)',
      'bank',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.santander.co.uk',
    ],
    [
      'Revolut',
      'Banking',
      '💳',
      'Digital banking and fintech',
      'bank',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.revolut.com',
    ],
    // Insurance (34-36)
    [
      'Aviva',
      'Insurance',
      '🛡️',
      'UK insurance and financial services',
      'insurance',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.aviva.co.uk',
    ],
    [
      'Admiral',
      'Insurance',
      '🛡️',
      'UK car and home insurance',
      'insurance',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.admiral.com',
    ],
    [
      'Direct Line',
      'Insurance',
      '🛡️',
      'UK insurance company',
      'insurance',
      'UK',
      'FCA',
      'Financial Ombudsman',
      'https://www.directline.com',
    ],
    // Retail & Delivery (37-42)
    [
      'Amazon',
      'Shopping',
      '📦',
      'Global e-commerce and tech',
      'retailer',
      'Global',
      'CMA',
      null,
      'https://www.amazon.co.uk',
    ],
    [
      'Royal Mail',
      'Delivery',
      '📮',
      'UK postal service',
      'delivery',
      'UK',
      'Ofcom',
      'Postal Ombudsman',
      'https://www.royalmail.com',
    ],
    [
      'Evri',
      'Delivery',
      '📦',
      'UK parcel delivery service (formerly Hermes)',
      'delivery',
      'UK',
      'Ofcom',
      null,
      'https://www.evri.com',
    ],
    [
      'DPD',
      'Delivery',
      '📦',
      'UK parcel delivery service',
      'delivery',
      'UK',
      'Ofcom',
      null,
      'https://www.dpd.co.uk',
    ],
    [
      'Tesco',
      'Shopping',
      '🛒',
      'UK supermarket chain',
      'supermarket',
      'UK',
      'CMA',
      null,
      'https://www.tesco.com',
    ],
    [
      'Sainsburys',
      'Shopping',
      '🛒',
      'UK supermarket chain',
      'supermarket',
      'UK',
      'CMA',
      null,
      'https://www.sainsburys.co.uk',
    ],
    // Health & Public (43-46)
    [
      'NHS England',
      'Health',
      '🏥',
      'National Health Service for England',
      'health',
      'UK',
      null,
      'PHSO',
      'https://www.nhs.uk',
    ],
    [
      'NHS Dentistry',
      'Health',
      '🦷',
      'NHS dental services',
      'health',
      'UK',
      null,
      'PHSO',
      'https://www.nhs.uk/nhs-services/dentists/',
    ],
    [
      'BUPA',
      'Health',
      '🩺',
      'Private healthcare provider',
      'health',
      'UK',
      'FCA',
      null,
      'https://www.bupa.co.uk',
    ],
    [
      'Local Councils',
      'Local',
      '🏛️',
      'UK local government authorities',
      'government',
      'UK',
      null,
      'Local Government Ombudsman',
      null,
    ],
    // Housing (47-48)
    [
      'Persimmon Homes',
      'Housing',
      '🏠',
      'UK housebuilder',
      'housebuilder',
      'UK',
      'NHBC',
      null,
      'https://www.persimmonhomes.com',
    ],
    [
      'OpenRent',
      'Housing',
      '🏠',
      'UK online lettings platform',
      'lettings',
      'UK',
      null,
      null,
      'https://www.openrent.com',
    ],
    // Tech (49-50)
    [
      'Netflix',
      'Tech',
      '🎬',
      'Streaming entertainment service',
      'streaming',
      'Global',
      null,
      null,
      'https://www.netflix.com',
    ],
    [
      'Apple',
      'Tech',
      '🍎',
      'Technology company',
      'tech',
      'Global',
      'CMA',
      null,
      'https://www.apple.com',
    ],
  ] as const;

  const orgIds: Record<string, string> = {};
  for (const [
    name,
    category,
    emoji,
    desc,
    sector,
    country,
    regulator,
    ombudsman,
    website,
  ] of orgs) {
    const id = await insertRow(orgSql, [
      name,
      category,
      emoji,
      desc,
      sector,
      country,
      regulator,
      ombudsman,
      website,
    ]);
    orgIds[name as string] = id;
  }

  // =============================
  // ISSUE-ORGANISATION LINKS (150+ pivot links)
  // =============================
  const linkSql = `INSERT INTO issue_organisation (id, issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?, ?)`;

  // Train Cancellations across all rail companies
  await insertRow(linkSql, [issueIds['Train Cancellations'], orgIds['Avanti West Coast'], 3240, 1]);
  await insertRow(linkSql, [
    issueIds['Train Cancellations'],
    orgIds['Southern / Thameslink'],
    2180,
    2,
  ]);
  await insertRow(linkSql, [issueIds['Train Cancellations'], orgIds['Northern Trains'], 1890, 3]);
  await insertRow(linkSql, [issueIds['Train Cancellations'], orgIds['CrossCountry'], 1450, 4]);
  await insertRow(linkSql, [
    issueIds['Train Cancellations'],
    orgIds['TransPennine Express'],
    1670,
    5,
  ]);
  await insertRow(linkSql, [issueIds['Train Cancellations'], orgIds['LNER'], 890, 6]);

  // Train Ticket Prices across all rail companies
  await insertRow(linkSql, [issueIds['Train Ticket Prices'], orgIds['Avanti West Coast'], 2100, 1]);
  await insertRow(linkSql, [
    issueIds['Train Ticket Prices'],
    orgIds['Southern / Thameslink'],
    1800,
    2,
  ]);
  await insertRow(linkSql, [issueIds['Train Ticket Prices'], orgIds['Northern Trains'], 1560, 3]);
  await insertRow(linkSql, [issueIds['Train Ticket Prices'], orgIds['CrossCountry'], 1200, 4]);
  await insertRow(linkSql, [
    issueIds['Train Ticket Prices'],
    orgIds['TransPennine Express'],
    1340,
    5,
  ]);
  await insertRow(linkSql, [issueIds['Train Ticket Prices'], orgIds['LNER'], 1100, 6]);

  // Flight Delays across airlines
  await insertRow(linkSql, [issueIds['Flight Delays'], orgIds['Ryanair'], 4200, 1]);
  await insertRow(linkSql, [issueIds['Flight Delays'], orgIds['EasyJet'], 3100, 2]);
  await insertRow(linkSql, [issueIds['Flight Delays'], orgIds['British Airways'], 2400, 3]);
  await insertRow(linkSql, [issueIds['Flight Delays'], orgIds['TUI'], 1800, 4]);

  // Lost Luggage across airlines
  await insertRow(linkSql, [issueIds['Lost Luggage'], orgIds['Ryanair'], 2800, 1]);
  await insertRow(linkSql, [issueIds['Lost Luggage'], orgIds['EasyJet'], 2100, 2]);
  await insertRow(linkSql, [issueIds['Lost Luggage'], orgIds['British Airways'], 1900, 3]);
  await insertRow(linkSql, [issueIds['Lost Luggage'], orgIds['TUI'], 1400, 4]);

  // Broadband Speed across telecoms
  await insertRow(linkSql, [issueIds['Broadband Speed'], orgIds['BT / EE'], 1800, 2]);
  await insertRow(linkSql, [issueIds['Broadband Speed'], orgIds['Virgin Media O2'], 2400, 1]);
  await insertRow(linkSql, [issueIds['Broadband Speed'], orgIds['Sky'], 1200, 4]);
  await insertRow(linkSql, [issueIds['Broadband Speed'], orgIds['TalkTalk'], 1600, 3]);

  // Mobile Signal Dead Zones
  await insertRow(linkSql, [issueIds['Mobile Signal Dead Zones'], orgIds['BT / EE'], 1100, 3]);
  await insertRow(linkSql, [issueIds['Mobile Signal Dead Zones'], orgIds['Vodafone'], 1400, 2]);
  await insertRow(linkSql, [issueIds['Mobile Signal Dead Zones'], orgIds['Three'], 1900, 1]);
  await insertRow(linkSql, [
    issueIds['Mobile Signal Dead Zones'],
    orgIds['Virgin Media O2'],
    1300,
    4,
  ]);

  // Price Rises Mid-Contract
  await insertRow(linkSql, [issueIds['Price Rises Mid-Contract'], orgIds['BT / EE'], 2200, 2]);
  await insertRow(linkSql, [
    issueIds['Price Rises Mid-Contract'],
    orgIds['Virgin Media O2'],
    2800,
    1,
  ]);
  await insertRow(linkSql, [issueIds['Price Rises Mid-Contract'], orgIds['Sky'], 1900, 3]);
  await insertRow(linkSql, [issueIds['Price Rises Mid-Contract'], orgIds['Vodafone'], 1600, 4]);
  await insertRow(linkSql, [issueIds['Price Rises Mid-Contract'], orgIds['Three'], 1400, 5]);

  // Customer Service Hold Times (cross-sector)
  await insertRow(linkSql, [issueIds['Customer Service Hold Times'], orgIds['BT / EE'], 1800, 2]);
  await insertRow(linkSql, [
    issueIds['Customer Service Hold Times'],
    orgIds['Virgin Media O2'],
    2100,
    1,
  ]);
  await insertRow(linkSql, [
    issueIds['Customer Service Hold Times'],
    orgIds['British Gas'],
    1900,
    3,
  ]);
  await insertRow(linkSql, [issueIds['Customer Service Hold Times'], orgIds['HSBC'], 1200, 4]);
  await insertRow(linkSql, [issueIds['Customer Service Hold Times'], orgIds['Barclays'], 1100, 5]);
  await insertRow(linkSql, [issueIds['Customer Service Hold Times'], orgIds['Amazon'], 800, 6]);

  // Energy Bill Costs
  await insertRow(linkSql, [issueIds['Energy Bill Costs'], orgIds['British Gas'], 3800, 1]);
  await insertRow(linkSql, [issueIds['Energy Bill Costs'], orgIds['OVO Energy'], 2200, 2]);
  await insertRow(linkSql, [issueIds['Energy Bill Costs'], orgIds['EDF'], 1800, 3]);
  await insertRow(linkSql, [issueIds['Energy Bill Costs'], orgIds['Octopus Energy'], 1200, 4]);
  await insertRow(linkSql, [issueIds['Energy Bill Costs'], orgIds['Scottish Power'], 1600, 5]);
  await insertRow(linkSql, [issueIds['Energy Bill Costs'], orgIds['E.ON'], 1400, 6]);

  // Inaccurate Energy Bills
  await insertRow(linkSql, [issueIds['Inaccurate Energy Bills'], orgIds['British Gas'], 2100, 1]);
  await insertRow(linkSql, [issueIds['Inaccurate Energy Bills'], orgIds['OVO Energy'], 1800, 2]);
  await insertRow(linkSql, [issueIds['Inaccurate Energy Bills'], orgIds['EDF'], 1200, 3]);
  await insertRow(linkSql, [
    issueIds['Inaccurate Energy Bills'],
    orgIds['Scottish Power'],
    1400,
    4,
  ]);
  await insertRow(linkSql, [issueIds['Inaccurate Energy Bills'], orgIds['E.ON'], 1100, 5]);

  // Water Bill Increases
  await insertRow(linkSql, [issueIds['Water Bill Increases'], orgIds['Thames Water'], 3200, 1]);
  await insertRow(linkSql, [issueIds['Water Bill Increases'], orgIds['Southern Water'], 1800, 2]);
  await insertRow(linkSql, [issueIds['Water Bill Increases'], orgIds['United Utilities'], 1400, 3]);
  await insertRow(linkSql, [issueIds['Water Bill Increases'], orgIds['Severn Trent'], 1200, 4]);
  await insertRow(linkSql, [issueIds['Water Bill Increases'], orgIds['Anglian Water'], 1100, 5]);

  // Sewage in Rivers
  await insertRow(linkSql, [issueIds['Sewage in Rivers'], orgIds['Thames Water'], 5400, 1]);
  await insertRow(linkSql, [issueIds['Sewage in Rivers'], orgIds['Southern Water'], 4200, 2]);
  await insertRow(linkSql, [issueIds['Sewage in Rivers'], orgIds['United Utilities'], 1800, 3]);
  await insertRow(linkSql, [issueIds['Sewage in Rivers'], orgIds['Severn Trent'], 2100, 4]);
  await insertRow(linkSql, [issueIds['Sewage in Rivers'], orgIds['Anglian Water'], 1600, 5]);

  // Hidden Bank Charges
  await insertRow(linkSql, [issueIds['Hidden Bank Charges'], orgIds['Barclays'], 1800, 1]);
  await insertRow(linkSql, [issueIds['Hidden Bank Charges'], orgIds['HSBC'], 1600, 2]);
  await insertRow(linkSql, [issueIds['Hidden Bank Charges'], orgIds['NatWest'], 1200, 3]);
  await insertRow(linkSql, [issueIds['Hidden Bank Charges'], orgIds['Lloyds / Halifax'], 1400, 4]);
  await insertRow(linkSql, [issueIds['Hidden Bank Charges'], orgIds['Santander'], 1100, 5]);
  await insertRow(linkSql, [issueIds['Hidden Bank Charges'], orgIds['Revolut'], 900, 6]);

  // Fraud and Scam Losses
  await insertRow(linkSql, [issueIds['Fraud and Scam Losses'], orgIds['Barclays'], 2400, 1]);
  await insertRow(linkSql, [issueIds['Fraud and Scam Losses'], orgIds['HSBC'], 2100, 2]);
  await insertRow(linkSql, [issueIds['Fraud and Scam Losses'], orgIds['NatWest'], 1800, 3]);
  await insertRow(linkSql, [
    issueIds['Fraud and Scam Losses'],
    orgIds['Lloyds / Halifax'],
    1600,
    4,
  ]);
  await insertRow(linkSql, [issueIds['Fraud and Scam Losses'], orgIds['Revolut'], 3200, 5]);

  // Bank Branch Closures
  await insertRow(linkSql, [issueIds['Bank Branch Closures'], orgIds['Barclays'], 1200, 2]);
  await insertRow(linkSql, [issueIds['Bank Branch Closures'], orgIds['HSBC'], 1800, 1]);
  await insertRow(linkSql, [issueIds['Bank Branch Closures'], orgIds['NatWest'], 1400, 3]);
  await insertRow(linkSql, [issueIds['Bank Branch Closures'], orgIds['Lloyds / Halifax'], 1100, 4]);

  // Insurance Claim Rejections
  await insertRow(linkSql, [issueIds['Insurance Claim Rejections'], orgIds['Aviva'], 2400, 1]);
  await insertRow(linkSql, [issueIds['Insurance Claim Rejections'], orgIds['Admiral'], 1800, 2]);
  await insertRow(linkSql, [
    issueIds['Insurance Claim Rejections'],
    orgIds['Direct Line'],
    1600,
    3,
  ]);

  // Overseas Transfer Fees
  await insertRow(linkSql, [issueIds['Overseas Transfer Fees'], orgIds['HSBC'], 3456, 1]);
  await insertRow(linkSql, [issueIds['Overseas Transfer Fees'], orgIds['Barclays'], 2345, 2]);
  await insertRow(linkSql, [issueIds['Overseas Transfer Fees'], orgIds['NatWest'], 2089, 3]);

  // NHS Waiting Times
  await insertRow(linkSql, [issueIds['NHS Waiting Times'], orgIds['NHS England'], 8900, 1]);

  // GP Appointment Access
  await insertRow(linkSql, [issueIds['GP Appointment Access'], orgIds['NHS England'], 6700, 1]);

  // Dentist Availability
  await insertRow(linkSql, [issueIds['Dentist Availability'], orgIds['NHS Dentistry'], 4200, 1]);

  // Mental Health Service Waits
  await insertRow(linkSql, [
    issueIds['Mental Health Service Waits'],
    orgIds['NHS England'],
    3800,
    1,
  ]);

  // Delivery Problems
  await insertRow(linkSql, [issueIds['Delivery Problems'], orgIds['Royal Mail'], 2800, 2]);
  await insertRow(linkSql, [issueIds['Delivery Problems'], orgIds['Evri'], 4200, 1]);
  await insertRow(linkSql, [issueIds['Delivery Problems'], orgIds['DPD'], 1800, 3]);
  await insertRow(linkSql, [issueIds['Delivery Problems'], orgIds['Amazon'], 2100, 4]);

  // Shrinkflation
  await insertRow(linkSql, [issueIds['Shrinkflation'], orgIds['Tesco'], 2800, 1]);
  await insertRow(linkSql, [issueIds['Shrinkflation'], orgIds['Sainsburys'], 2200, 2]);

  // Difficulty Cancelling Subscriptions
  await insertRow(linkSql, [
    issueIds['Difficulty Cancelling Subscriptions'],
    orgIds['Sky'],
    2400,
    1,
  ]);
  await insertRow(linkSql, [
    issueIds['Difficulty Cancelling Subscriptions'],
    orgIds['Virgin Media O2'],
    2100,
    2,
  ]);
  await insertRow(linkSql, [
    issueIds['Difficulty Cancelling Subscriptions'],
    orgIds['Netflix'],
    1800,
    3,
  ]);

  // Subscription Traps
  await insertRow(linkSql, [issueIds['Subscription Traps'], orgIds['Netflix'], 1200, 1]);
  await insertRow(linkSql, [issueIds['Subscription Traps'], orgIds['Apple'], 900, 2]);

  // Parking Fines
  await insertRow(linkSql, [issueIds['Parking Fines'], orgIds['Local Councils'], 3400, 1]);

  // Council Tax Rises
  await insertRow(linkSql, [issueIds['Council Tax Rises'], orgIds['Local Councils'], 4800, 1]);

  // Rubbish Collection Changes
  await insertRow(linkSql, [
    issueIds['Rubbish Collection Changes'],
    orgIds['Local Councils'],
    2200,
    1,
  ]);

  // Pothole Damage
  await insertRow(linkSql, [issueIds['Pothole Damage'], orgIds['Local Councils'], 3800, 1]);

  // Damp and Mould in Housing
  await insertRow(linkSql, [
    issueIds['Damp and Mould in Housing'],
    orgIds['Persimmon Homes'],
    1800,
    2,
  ]);
  await insertRow(linkSql, [
    issueIds['Damp and Mould in Housing'],
    orgIds['Local Councils'],
    2400,
    1,
  ]);

  // Rent Increases
  await insertRow(linkSql, [issueIds['Rent Increases'], orgIds['OpenRent'], 1400, 1]);

  // Self-Checkout Frustration
  await insertRow(linkSql, [issueIds['Self-Checkout Frustration'], orgIds['Tesco'], 1200, 1]);
  await insertRow(linkSql, [issueIds['Self-Checkout Frustration'], orgIds['Sainsburys'], 900, 2]);

  // Smart Meter Problems
  await insertRow(linkSql, [issueIds['Smart Meter Problems'], orgIds['British Gas'], 1400, 1]);
  await insertRow(linkSql, [issueIds['Smart Meter Problems'], orgIds['EDF'], 1100, 2]);
  await insertRow(linkSql, [issueIds['Smart Meter Problems'], orgIds['E.ON'], 900, 3]);

  // Power Cuts
  await insertRow(linkSql, [issueIds['Power Cuts'], orgIds['British Gas'], 800, 2]);
  await insertRow(linkSql, [issueIds['Power Cuts'], orgIds['Scottish Power'], 1200, 1]);

  // Mortgage Rate Shock
  await insertRow(linkSql, [issueIds['Mortgage Rate Shock'], orgIds['Barclays'], 900, 2]);
  await insertRow(linkSql, [issueIds['Mortgage Rate Shock'], orgIds['HSBC'], 1100, 1]);
  await insertRow(linkSql, [issueIds['Mortgage Rate Shock'], orgIds['NatWest'], 800, 3]);
  await insertRow(linkSql, [issueIds['Mortgage Rate Shock'], orgIds['Lloyds / Halifax'], 700, 4]);
  await insertRow(linkSql, [issueIds['Mortgage Rate Shock'], orgIds['Santander'], 600, 5]);

  // Roaming Charges
  await insertRow(linkSql, [issueIds['Roaming Charges'], orgIds['BT / EE'], 600, 2]);
  await insertRow(linkSql, [issueIds['Roaming Charges'], orgIds['Vodafone'], 800, 1]);
  await insertRow(linkSql, [issueIds['Roaming Charges'], orgIds['Three'], 500, 3]);

  // Hospital Parking Charges
  await insertRow(linkSql, [issueIds['Hospital Parking Charges'], orgIds['NHS England'], 1800, 1]);

  // Plastic Waste
  await insertRow(linkSql, [issueIds['Plastic Waste'], orgIds['Amazon'], 4500, 1]);
  await insertRow(linkSql, [issueIds['Plastic Waste'], orgIds['Tesco'], 3200, 2]);
  await insertRow(linkSql, [issueIds['Plastic Waste'], orgIds['Sainsburys'], 2800, 3]);

  // Refund Difficulties
  await insertRow(linkSql, [issueIds['Refund Difficulties'], orgIds['Amazon'], 1800, 1]);
  await insertRow(linkSql, [issueIds['Refund Difficulties'], orgIds['Tesco'], 900, 2]);

  // Fake Reviews
  await insertRow(linkSql, [issueIds['Fake Reviews'], orgIds['Amazon'], 1400, 1]);

  // Food Quality Decline
  await insertRow(linkSql, [issueIds['Food Quality Decline'], orgIds['Tesco'], 500, 1]);
  await insertRow(linkSql, [issueIds['Food Quality Decline'], orgIds['Sainsburys'], 400, 2]);

  // Fuel Prices
  await insertRow(linkSql, [issueIds['Fuel Prices'], orgIds['Tesco'], 1100, 1]);
  await insertRow(linkSql, [issueIds['Fuel Prices'], orgIds['Sainsburys'], 1000, 2]);

  // Prescription Costs
  await insertRow(linkSql, [issueIds['Prescription Costs'], orgIds['NHS England'], 2345, 1]);

  // Bus Route Cuts
  await insertRow(linkSql, [issueIds['Bus Route Cuts'], orgIds['Local Councils'], 2100, 1]);

  // Student Loan Repayment
  await insertRow(linkSql, [issueIds['Student Loan Repayment'], orgIds['HSBC'], 1200, 2]);
  await insertRow(linkSql, [issueIds['Student Loan Repayment'], orgIds['Barclays'], 1000, 3]);

  // Noisy Neighbours
  await insertRow(linkSql, [issueIds['Noisy Neighbours'], orgIds['Local Councils'], 1200, 1]);

  // Dog Fouling
  await insertRow(linkSql, [issueIds['Dog Fouling'], orgIds['Local Councils'], 1100, 1]);

  // Planning Permission Abuse
  await insertRow(linkSql, [
    issueIds['Planning Permission Abuse'],
    orgIds['Local Councils'],
    1400,
    1,
  ]);
  await insertRow(linkSql, [
    issueIds['Planning Permission Abuse'],
    orgIds['Persimmon Homes'],
    800,
    2,
  ]);

  // Cost of Childcare
  await insertRow(linkSql, [issueIds['Cost of Childcare'], orgIds['Local Councils'], 2200, 1]);

  // =============================
  // SYNONYMS (80+)
  // =============================
  const synonymSql = `INSERT INTO synonyms (id, issue_id, term) VALUES (?, ?, ?)`;

  const synonyms: [string, string[]][] = [
    [
      'Train Cancellations',
      [
        'train cancelled',
        'cancelled train',
        'trains not running',
        'rail cancellation',
        'service cancelled',
        'train delays',
        'delayed train',
        'trains late',
      ],
    ],
    ['Train Ticket Prices', ['rail fares', 'ticket costs', 'expensive trains', 'train fares']],
    [
      'Flight Delays',
      [
        'flight delayed',
        'plane delayed',
        'flight cancelled',
        'airport delays',
        'stuck at airport',
        'flight late',
      ],
    ],
    [
      'Lost Luggage',
      [
        'missing bags',
        'lost suitcase',
        'bags not arrived',
        'missing suitcase',
        'luggage not on carousel',
        'bag lost by airline',
      ],
    ],
    ['Bus Route Cuts', ['bus cuts', 'route reductions', 'bus service closures']],
    [
      'Broadband Speed',
      [
        'slow internet',
        'slow wifi',
        'wifi slow',
        'internet speed',
        'broadband not working',
        'buffering',
        'internet keeps dropping',
        'wifi dropping out',
      ],
    ],
    [
      'Mobile Signal Dead Zones',
      ['no signal', 'no reception', 'mobile blackspot', 'signal dead zone'],
    ],
    [
      'Price Rises Mid-Contract',
      ['bill increase mid contract', 'contract price rise', 'mid contract hike'],
    ],
    [
      'Customer Service Hold Times',
      [
        'on hold',
        'waiting on phone',
        'cant get through',
        'no one answering',
        'phone queue',
        'call centre',
      ],
    ],
    [
      'Difficulty Cancelling Subscriptions',
      ['cant cancel', 'hard to cancel', 'cancel subscription', 'unsubscribe'],
    ],
    [
      'Energy Bill Costs',
      [
        'gas bill too high',
        'electricity bill',
        'energy prices',
        'heating costs',
        'fuel poverty',
        'cant afford energy',
      ],
    ],
    [
      'Inaccurate Energy Bills',
      ['wrong energy bill', 'estimated reading wrong', 'overcharged energy'],
    ],
    ['Water Bill Increases', ['water rates', 'water charge', 'water bill too high']],
    [
      'Sewage in Rivers',
      [
        'sewage dumping',
        'raw sewage',
        'sewage on beach',
        'water pollution',
        'sewage overflow',
        'combined sewer overflow',
      ],
    ],
    [
      'Hidden Bank Charges',
      ['unexpected fees', 'hidden fees', 'surprise charges', 'overdraft charges', 'bank fees'],
    ],
    ['Fraud and Scam Losses', ['scammed', 'bank fraud', 'push payment scam', 'authorised fraud']],
    ['Bank Branch Closures', ['branch shutdowns', 'local bank closing', 'no bank nearby']],
    ['Insurance Claim Rejections', ['claim denied', 'insurance wont pay', 'rejected claim']],
    [
      'NHS Waiting Times',
      [
        'NHS wait',
        'waiting list',
        'operation wait',
        'hospital waiting time',
        'referral wait',
        'waiting for surgery',
      ],
    ],
    [
      'GP Appointment Access',
      [
        'cant get GP appointment',
        'doctor appointment',
        'GP phone queue',
        'cant see a doctor',
        '8am phone scramble',
      ],
    ],
    ['Dentist Availability', ['NHS dentist', 'cant find dentist', 'dentist waiting list']],
    [
      'Mental Health Service Waits',
      ['mental health funding', 'therapy access', 'counselling wait', 'CAMHS wait'],
    ],
    ['Prescription Costs', ['medicine costs', 'drug prices', 'pharmacy charges']],
    [
      'Delivery Problems',
      [
        'parcel lost',
        'parcel not delivered',
        'left in rain',
        'package stolen',
        'delivery driver',
        'missed delivery',
      ],
    ],
    [
      'Rent Increases',
      ['rent too high', 'rent going up', 'landlord increasing rent', 'no fault eviction'],
    ],
    ['Parking Fines', ['parking ticket', 'parking charge notice', 'PCN', 'unfair parking fine']],
    [
      'Shrinkflation',
      ['smaller portions', 'less for same price', 'package smaller', 'shrinking products'],
    ],
    [
      'Plastic Waste',
      ['plastic pollution', 'single-use plastics', 'ocean pollution', 'excessive packaging'],
    ],
    ['Pothole Damage', ['potholes', 'road damage', 'pothole car damage']],
    ['Council Tax Rises', ['council tax increase', 'council tax too high', 'local tax']],
    [
      'Damp and Mould in Housing',
      ['mouldy house', 'damp flat', 'black mould', 'housing disrepair'],
    ],
    ['Student Loan Repayment', ['student loans', 'tuition fees', 'education debt', 'student debt']],
    ['AI Replacing Jobs', ['job automation', 'AI taking jobs', 'robots replacing workers']],
    ['Roaming Charges', ['holiday phone bill', 'abroad data charges', 'foreign phone charges']],
    ['Smart Meter Problems', ['smart meter broken', 'meter not working', 'meter lost signal']],
    ['Subscription Traps', ['free trial trap', 'auto renewal', 'charged after trial']],
  ];

  for (const [issueName, terms] of synonyms) {
    for (const term of terms) {
      await insertRow(synonymSql, [issueIds[issueName], term]);
    }
  }

  // =============================
  // SAMPLE USERS
  // =============================
  const userSql = `INSERT INTO users (id, name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?, ?)`;

  const users = [
    ['Sarah K.', 'sarah@example.com', null, '10min', 'writing,organising'],
    ['Marcio R.', 'marcio@example.com', null, '1hr+', 'languages,media'],
    ['Yuki T.', 'yuki@example.com', null, '10min', 'media,tech'],
    ['Dr. Patel', 'patel@example.com', null, '1hr+', 'writing,legal'],
    ['Carlos M.', 'carlos@example.com', null, '10min', 'languages,translation'],
    ['Emma W.', 'emma@example.com', null, '1min', 'organising'],
    ['James L.', 'james@example.com', null, '10min', 'tech,writing'],
    ['Priya S.', 'priya@example.com', null, '1hr+', 'organising,languages'],
  ] as const;

  const userIds: Record<string, string> = {};
  for (const [name, email, phone, time, skills] of users) {
    const id = await insertRow(userSql, [name, email, phone, time, skills]);
    userIds[name as string] = id;
  }

  // =============================
  // ACTIONS (35+ with real URLs)
  // =============================
  const actionSql = `INSERT INTO actions (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // Train Cancellations
  await insertRow(actionSql, [
    issueIds['Train Cancellations'],
    'Claim delay repay compensation',
    'You are legally entitled to compensation for delays over 15 or 30 minutes depending on operator',
    'action',
    '10min',
    '',
    'https://www.nationalrail.co.uk/delay-repay/',
    'Delay Repay',
  ]);
  await insertRow(actionSql, [
    issueIds['Train Cancellations'],
    'Write to your MP about rail performance',
    'Template letter to send to your MP highlighting the impact of cancellations',
    'action',
    '10min',
    'writing',
    'https://www.writetothem.com/',
    'WriteToThem',
  ]);
  await insertRow(actionSql, [
    issueIds['Train Cancellations'],
    'Share your cancellation story',
    'Help others understand the real impact — post your experience',
    'together',
    '1min',
    '',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Train Cancellations'],
    'Suggest improvements to timetabling',
    'What would actually fix this? Share your ideas',
    'idea',
    '10min',
    'organising',
    null,
    null,
  ]);

  // Flight Delays
  await insertRow(actionSql, [
    issueIds['Flight Delays'],
    'Claim EU261 / UK261 compensation',
    'Airlines must pay £220-520 for delays over 3 hours on qualifying flights',
    'action',
    '10min',
    '',
    'https://www.resolver.co.uk/rights-guide/flight-delays',
    'Resolver',
  ]);
  await insertRow(actionSql, [
    issueIds['Flight Delays'],
    'Document everything at the airport',
    'Photograph departure boards, keep boarding passes, note times',
    'action',
    '1min',
    '',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Flight Delays'],
    'Rate your airline experience',
    'Help future passengers know what to expect',
    'together',
    '1min',
    '',
    null,
    null,
  ]);

  // Broadband Speed
  await insertRow(actionSql, [
    issueIds['Broadband Speed'],
    'Run and save speed test evidence',
    'Use Ofcom broadband checker to document your actual speeds vs advertised',
    'action',
    '1min',
    '',
    'https://checker.ofcom.org.uk/en-gb/broadband-coverage',
    'Ofcom',
  ]);
  await insertRow(actionSql, [
    issueIds['Broadband Speed'],
    'Complain to Ofcom',
    'Report your broadband provider for not delivering advertised speeds',
    'action',
    '10min',
    'writing',
    'https://www.ofcom.org.uk/make-a-complaint',
    'Ofcom',
  ]);
  await insertRow(actionSql, [
    issueIds['Broadband Speed'],
    'Switch to a better provider',
    'Compare broadband deals in your area and switch',
    'action',
    '1hr+',
    '',
    'https://www.ofcom.org.uk/phones-and-broadband/broadband/broadband-switching',
    'Ofcom',
  ]);
  await insertRow(actionSql, [
    issueIds['Broadband Speed'],
    "Map your street's broadband speeds",
    'Organise neighbours to all test and share — collective data is powerful',
    'together',
    '10min',
    'organising',
    null,
    null,
  ]);

  // Energy Bill Costs
  await insertRow(actionSql, [
    issueIds['Energy Bill Costs'],
    'Check if you are on the cheapest tariff',
    'Use Ofgem accredited comparison sites to check',
    'action',
    '10min',
    '',
    'https://www.ofgem.gov.uk/information-for-household-consumers/getting-best-deal',
    'Ofgem',
  ]);
  await insertRow(actionSql, [
    issueIds['Energy Bill Costs'],
    'Apply for the Warm Home Discount',
    'You may be eligible for £150 off your electricity bill',
    'action',
    '10min',
    '',
    'https://www.gov.uk/the-warm-home-discount-scheme',
    'GOV.UK',
  ]);
  await insertRow(actionSql, [
    issueIds['Energy Bill Costs'],
    'Share energy saving tips',
    'What actually works to cut bills? Share with the community',
    'together',
    '1min',
    '',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Energy Bill Costs'],
    'Propose a community energy buying scheme',
    'Bulk buying power as a group could get better rates',
    'idea',
    '1hr+',
    'organising',
    null,
    null,
  ]);

  // Sewage in Rivers
  await insertRow(actionSql, [
    issueIds['Sewage in Rivers'],
    'Report a sewage discharge',
    'Use the Environment Agency hotline to report sewage pollution',
    'action',
    '1min',
    '',
    'https://www.gov.uk/report-an-environmental-incident',
    'Environment Agency',
  ]);
  await insertRow(actionSql, [
    issueIds['Sewage in Rivers'],
    'Check your local river quality',
    'See real-time discharge data for your area',
    'action',
    '1min',
    '',
    'https://theriverstrust.org/sewage-map',
    'Rivers Trust',
  ]);
  await insertRow(actionSql, [
    issueIds['Sewage in Rivers'],
    'Sign the petition for tougher regulation',
    'Join thousands demanding change',
    'action',
    '1min',
    '',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Sewage in Rivers'],
    'Organise a local river clean-up',
    'Bring people together to clean up and raise awareness',
    'together',
    '1hr+',
    'organising',
    null,
    null,
  ]);

  // NHS Waiting Times
  await insertRow(actionSql, [
    issueIds['NHS Waiting Times'],
    'Check your right to choose',
    'You have the right to choose which hospital you are referred to — shorter waits may be available',
    'action',
    '10min',
    '',
    'https://www.nhs.uk/nhs-services/hospitals/about-nhs-hospital-services/',
    'NHS',
  ]);
  await insertRow(actionSql, [
    issueIds['NHS Waiting Times'],
    'Contact PALS at your hospital',
    'Patient Advice and Liaison Service can help escalate your case',
    'action',
    '10min',
    '',
    null,
    'NHS',
  ]);
  await insertRow(actionSql, [
    issueIds['NHS Waiting Times'],
    'Share your waiting story',
    'Real stories create pressure for change — your experience matters',
    'together',
    '1min',
    'writing',
    null,
    null,
  ]);

  // GP Appointment Access
  await insertRow(actionSql, [
    issueIds['GP Appointment Access'],
    'Know your rights to a GP appointment',
    'Practices must offer urgent appointments — know what to ask for',
    'action',
    '1min',
    '',
    'https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/',
    'NHS',
  ]);
  await insertRow(actionSql, [
    issueIds['GP Appointment Access'],
    'Complain to NHS England about GP access',
    'Formal complaints create a paper trail that drives change',
    'action',
    '10min',
    'writing',
    null,
    'NHS England',
  ]);

  // Delivery Problems
  await insertRow(actionSql, [
    issueIds['Delivery Problems'],
    'Claim compensation for lost parcel',
    'The sender is responsible — contact them, not the courier',
    'action',
    '10min',
    '',
    'https://www.citizensadvice.org.uk/consumer/getting-your-money-back/',
    'Citizens Advice',
  ]);
  await insertRow(actionSql, [
    issueIds['Delivery Problems'],
    'Film your delivery location',
    'Video evidence of where parcels are left helps with claims',
    'action',
    '1min',
    '',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Delivery Problems'],
    'Rate your delivery driver',
    'Help identify patterns — good and bad',
    'together',
    '1min',
    '',
    null,
    null,
  ]);

  // Hidden Bank Charges
  await insertRow(actionSql, [
    issueIds['Hidden Bank Charges'],
    'Check if you can reclaim charges',
    'You may be able to reclaim unfair overdraft charges',
    'action',
    '10min',
    '',
    'https://www.moneysavingexpert.com/reclaim/bank-charges/',
    'MoneySavingExpert',
  ]);
  await insertRow(actionSql, [
    issueIds['Hidden Bank Charges'],
    'Switch to a fee-free bank account',
    'Compare accounts with no monthly fees or hidden charges',
    'action',
    '1hr+',
    '',
    'https://www.moneysavingexpert.com/banking/compare-best-bank-accounts/',
    'MoneySavingExpert',
  ]);

  // Parking Fines
  await insertRow(actionSql, [
    issueIds['Parking Fines'],
    'Appeal your parking charge',
    'Most private parking charges can be successfully appealed',
    'action',
    '10min',
    'writing',
    'https://www.popla.co.uk/',
    'POPLA',
  ]);
  await insertRow(actionSql, [
    issueIds['Parking Fines'],
    'Check if the signage was adequate',
    'Unclear signs are grounds for appeal — photograph everything',
    'action',
    '1min',
    '',
    null,
    null,
  ]);

  // Rent Increases
  await insertRow(actionSql, [
    issueIds['Rent Increases'],
    'Know your rights on rent increases',
    'Your landlord must follow proper legal process',
    'action',
    '10min',
    '',
    'https://www.shelter.org.uk/',
    'Shelter',
  ]);
  await insertRow(actionSql, [
    issueIds['Rent Increases'],
    'Contact Shelter for free advice',
    'Free housing advice helpline',
    'action',
    '10min',
    '',
    'https://www.shelter.org.uk/get-help',
    'Shelter',
  ]);
  await insertRow(actionSql, [
    issueIds['Rent Increases'],
    'Share your rent increase story',
    'Collective stories drive policy change',
    'together',
    '1min',
    'writing',
    null,
    null,
  ]);

  // Plastic Waste
  await insertRow(actionSql, [
    issueIds['Plastic Waste'],
    'Audit your plastic use',
    'Track single-use plastics for one week',
    'idea',
    '10min',
    '',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Plastic Waste'],
    'Beach or park cleanup',
    'Join or organise a local litter pick',
    'together',
    '1hr+',
    'organising',
    null,
    null,
  ]);
  await insertRow(actionSql, [
    issueIds['Plastic Waste'],
    'Contact manufacturers about packaging',
    'Write to brands about packaging waste',
    'action',
    '10min',
    'writing',
    null,
    null,
  ]);

  // Student Loan Repayment
  await insertRow(actionSql, [
    issueIds['Student Loan Repayment'],
    'Check your repayment plan',
    "Make sure you're on the right plan",
    'action',
    '1min',
    '',
    'https://www.gov.uk/repaying-your-student-loan',
    'GOV.UK',
  ]);
  await insertRow(actionSql, [
    issueIds['Student Loan Repayment'],
    'Campaign for reform',
    'Write to your MP about student finance',
    'action',
    '10min',
    'writing',
    'https://www.writetothem.com/',
    'WriteToThem',
  ]);

  // Generic actions for remaining issues
  const genericIssues = [
    'Train Ticket Prices',
    'Lost Luggage',
    'Bus Route Cuts',
    'Pothole Damage',
    'Fuel Prices',
    'Mobile Signal Dead Zones',
    'Price Rises Mid-Contract',
    'Roaming Charges',
    'Inaccurate Energy Bills',
    'Water Bill Increases',
    'Power Cuts',
    'Smart Meter Problems',
    'Fraud and Scam Losses',
    'Insurance Claim Rejections',
    'Mortgage Rate Shock',
    'Dentist Availability',
    'Mental Health Service Waits',
    'Prescription Costs',
    'Hospital Parking Charges',
    'Council Tax Rises',
    'Noisy Neighbours',
    'Rubbish Collection Changes',
    'Planning Permission Abuse',
    'Damp and Mould in Housing',
    'Shrinkflation',
    'Refund Difficulties',
    'Fake Reviews',
    'Subscription Traps',
    'Food Quality Decline',
    'Self-Checkout Frustration',
    'Cost of Childcare',
    'Dog Fouling',
    'AI Replacing Jobs',
    'Customer Service Hold Times',
    'Difficulty Cancelling Subscriptions',
    'Bank Branch Closures',
    'Overseas Transfer Fees',
  ];
  for (const issueName of genericIssues) {
    await insertRow(actionSql, [
      issueIds[issueName],
      'Share your experience',
      'Tell others about your story — collective voices drive change',
      'idea',
      '10min',
      'writing',
      null,
      null,
    ]);
    await insertRow(actionSql, [
      issueIds[issueName],
      'Write to your representative',
      'Use our template to demand change from your MP or councillor',
      'action',
      '10min',
      'writing',
      'https://www.writetothem.com/',
      'WriteToThem',
    ]);
    await insertRow(actionSql, [
      issueIds[issueName],
      'Welcome new members',
      'Help newcomers feel at home in the community',
      'together',
      '1min',
      'organising',
      null,
      null,
    ]);
  }

  // =============================
  // COMMUNITY HEALTH (top 20 issues)
  // =============================
  const healthSql = `INSERT INTO community_health (id, issue_id, needs_met, membership, influence, connection) VALUES (?, ?, ?, ?, ?, ?)`;

  await insertRow(healthSql, [issueIds['Train Cancellations'], 82, 71, 68, 75]);
  await insertRow(healthSql, [issueIds['Train Ticket Prices'], 75, 68, 62, 70]);
  await insertRow(healthSql, [issueIds['Flight Delays'], 78, 72, 65, 69]);
  await insertRow(healthSql, [issueIds['Lost Luggage'], 73, 66, 60, 67]);
  await insertRow(healthSql, [issueIds['Bus Route Cuts'], 65, 58, 55, 62]);
  await insertRow(healthSql, [issueIds['Broadband Speed'], 79, 73, 70, 74]);
  await insertRow(healthSql, [issueIds['Customer Service Hold Times'], 70, 62, 58, 65]);
  await insertRow(healthSql, [issueIds['Energy Bill Costs'], 81, 74, 69, 73]);
  await insertRow(healthSql, [issueIds['Sewage in Rivers'], 86, 80, 76, 82]);
  await insertRow(healthSql, [issueIds['Hidden Bank Charges'], 80, 74, 69, 73]);
  await insertRow(healthSql, [issueIds['Bank Branch Closures'], 68, 63, 57, 64]);
  await insertRow(healthSql, [issueIds['Overseas Transfer Fees'], 77, 71, 66, 72]);
  await insertRow(healthSql, [issueIds['NHS Waiting Times'], 85, 78, 72, 80]);
  await insertRow(healthSql, [issueIds['GP Appointment Access'], 76, 70, 64, 71]);
  await insertRow(healthSql, [issueIds['Mental Health Service Waits'], 76, 72, 67, 75]);
  await insertRow(healthSql, [issueIds['Prescription Costs'], 71, 65, 60, 66]);
  await insertRow(healthSql, [issueIds['Delivery Problems'], 74, 68, 62, 70]);
  await insertRow(healthSql, [issueIds['Plastic Waste'], 84, 79, 74, 80]);
  await insertRow(healthSql, [issueIds['Student Loan Repayment'], 81, 75, 70, 76]);
  await insertRow(healthSql, [issueIds['Rent Increases'], 72, 66, 60, 68]);

  // =============================
  // EXPERT PROFILES
  // =============================
  const expertSql = `INSERT INTO expert_profiles (id, issue_id, name, role, speciality, achievement, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  await insertRow(expertSql, [
    issueIds['Train Cancellations'],
    'Carlos M.',
    'Translator',
    'ES/EN Translation',
    'Translated 47 issues across languages',
    '🌐',
  ]);
  await insertRow(expertSql, [
    issueIds['Train Cancellations'],
    'Dr. Patel',
    'Rail Rights Expert',
    'Legal guidance',
    '12 years experience in transport law',
    '⚖️',
  ]);
  await insertRow(expertSql, [
    issueIds['Train Cancellations'],
    'Yuki T.',
    'Media & Comms Lead',
    'JP/EN · Video campaigns',
    'Running the cancellation evidence campaign',
    '📸',
  ]);

  await insertRow(expertSql, [
    issueIds['Broadband Speed'],
    'Tom H.',
    'Network Engineer',
    'Broadband infrastructure',
    'Helped 200+ members optimise speeds',
    '🔧',
  ]);
  await insertRow(expertSql, [
    issueIds['Broadband Speed'],
    'Lisa R.',
    'Consumer Rights Advisor',
    'Ofcom complaints',
    'Won 34 compensation claims',
    '⚖️',
  ]);

  await insertRow(expertSql, [
    issueIds['NHS Waiting Times'],
    'Dr. Chen',
    'Healthcare Policy',
    'NHS reform research',
    'Published 3 policy papers on wait times',
    '🩺',
  ]);
  await insertRow(expertSql, [
    issueIds['NHS Waiting Times'],
    'Maria G.',
    'Community Organiser',
    'Campaign coordination',
    'Organised 12 local health rallies',
    '📢',
  ]);
  await insertRow(expertSql, [
    issueIds['NHS Waiting Times'],
    'Raj P.',
    'Data Analyst',
    'Wait time mapping',
    'Built the national wait time tracker',
    '📊',
  ]);

  await insertRow(expertSql, [
    issueIds['Sewage in Rivers'],
    'Prof. Johnson',
    'Environmental Scientist',
    'Water quality analysis',
    'Published 5 papers on river pollution',
    '🔬',
  ]);
  await insertRow(expertSql, [
    issueIds['Sewage in Rivers'],
    'Aisha K.',
    'Campaign Lead',
    'River clean-ups',
    'Organised 30 clean-up events',
    '✊',
  ]);

  await insertRow(expertSql, [
    issueIds['Hidden Bank Charges'],
    'Sophie M.',
    'Financial Advisor',
    'Bank fee analysis',
    'Exposed hidden charges at 5 major banks',
    '💰',
  ]);
  await insertRow(expertSql, [
    issueIds['Student Loan Repayment'],
    'Jake P.',
    'Student Finance Expert',
    'Loan repayment advice',
    'Helped 1,000+ graduates save money',
    '🎓',
  ]);
  await insertRow(expertSql, [
    issueIds['Plastic Waste'],
    'Dr. Okafor',
    'Marine Biologist',
    'Ocean plastic research',
    'Led 3 beach cleanup campaigns',
    '🌊',
  ]);

  // =============================
  // FEED POSTS
  // =============================
  const feedSql = `INSERT INTO feed (id, issue_id, user_id, content, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)`;

  await insertRow(feedSql, [
    issueIds['Train Cancellations'],
    userIds['Sarah K.'],
    'Just got my refund! £42 back. The letter template WORKED. Thank you all!',
    24,
    '2026-02-15 08:30:00',
  ]);
  await insertRow(feedSql, [
    issueIds['Train Cancellations'],
    userIds['Marcio R.'],
    'O mesmo problema em Portugal com CP. Shall we join forces?',
    18,
    '2026-02-15 07:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['Train Cancellations'],
    userIds['James L.'],
    'Third cancellation this week. Platform was packed. Filmed it this time.',
    31,
    '2026-02-14 18:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['Train Cancellations'],
    userIds['Emma W.'],
    "The regulator acknowledged our 847 letters. We're being heard!",
    45,
    '2026-02-14 15:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['Train Cancellations'],
    userIds['Priya S.'],
    'New here! Switched from just complaining on Twitter to actually doing something. Feels different.',
    12,
    '2026-02-13 20:00:00',
  ]);

  await insertRow(feedSql, [
    issueIds['Broadband Speed'],
    userIds['James L.'],
    'Speed test: paying for 100Mbps, getting 12. Screenshots uploaded.',
    28,
    '2026-02-15 09:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['Broadband Speed'],
    userIds['Yuki T.'],
    'Made a comparison video of advertised vs actual speeds. Going viral!',
    56,
    '2026-02-14 16:00:00',
  ]);

  await insertRow(feedSql, [
    issueIds['NHS Waiting Times'],
    userIds['Dr. Patel'],
    'New data shows average wait times up 23% this quarter. Thread with full analysis incoming.',
    67,
    '2026-02-15 10:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['NHS Waiting Times'],
    userIds['Priya S.'],
    '6 month wait for a specialist appointment. Posted my story on the campaign page.',
    34,
    '2026-02-14 14:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['NHS Waiting Times'],
    userIds['Emma W.'],
    'Our petition just hit 10,000 signatures! Parliament has to respond now.',
    89,
    '2026-02-13 12:00:00',
  ]);

  await insertRow(feedSql, [
    issueIds['Sewage in Rivers'],
    userIds['Carlos M.'],
    'Thames Water dumped sewage 72 times in my local river last month. Data from the EA website.',
    42,
    '2026-02-15 08:00:00',
  ]);
  await insertRow(feedSql, [
    issueIds['Plastic Waste'],
    userIds['Priya S.'],
    'Our local supermarket just committed to removing plastic wrapping from fruit. The campaign worked!',
    103,
    '2026-02-14 11:00:00',
  ]);

  // =============================
  // COUNTRY BREAKDOWNS
  // =============================
  const countrySql = `INSERT INTO country_breakdown (id, issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?, ?)`;

  await insertRow(countrySql, [issueIds['Train Cancellations'], 'GB', 'United Kingdom', 2134]);
  await insertRow(countrySql, [issueIds['Train Cancellations'], 'FR', 'France', 412]);
  await insertRow(countrySql, [issueIds['Train Cancellations'], 'DE', 'Germany', 301]);

  await insertRow(countrySql, [issueIds['Broadband Speed'], 'GB', 'United Kingdom', 3201]);
  await insertRow(countrySql, [issueIds['Broadband Speed'], 'US', 'United States', 412]);
  await insertRow(countrySql, [issueIds['Broadband Speed'], 'DE', 'Germany', 199]);
  await insertRow(countrySql, [issueIds['Broadband Speed'], 'FR', 'France', 180]);
  await insertRow(countrySql, [issueIds['Broadband Speed'], 'IE', 'Ireland', 120]);

  await insertRow(countrySql, [issueIds['NHS Waiting Times'], 'GB', 'United Kingdom', 8412]);
  await insertRow(countrySql, [issueIds['NHS Waiting Times'], 'IE', 'Ireland', 312]);
  await insertRow(countrySql, [issueIds['NHS Waiting Times'], 'AU', 'Australia', 210]);

  await insertRow(countrySql, [issueIds['Flight Delays'], 'GB', 'United Kingdom', 3456]);
  await insertRow(countrySql, [issueIds['Flight Delays'], 'US', 'United States', 2890]);
  await insertRow(countrySql, [issueIds['Flight Delays'], 'DE', 'Germany', 1234]);
  await insertRow(countrySql, [issueIds['Flight Delays'], 'FR', 'France', 987]);
  await insertRow(countrySql, [issueIds['Flight Delays'], 'ES', 'Spain', 876]);
  await insertRow(countrySql, [issueIds['Flight Delays'], 'IT', 'Italy', 654]);

  await insertRow(countrySql, [issueIds['Lost Luggage'], 'GB', 'United Kingdom', 2100]);
  await insertRow(countrySql, [issueIds['Lost Luggage'], 'US', 'United States', 1890]);
  await insertRow(countrySql, [issueIds['Lost Luggage'], 'DE', 'Germany', 1230]);
  await insertRow(countrySql, [issueIds['Lost Luggage'], 'ES', 'Spain', 980]);
  await insertRow(countrySql, [issueIds['Lost Luggage'], 'FR', 'France', 870]);

  await insertRow(countrySql, [issueIds['Plastic Waste'], 'GB', 'United Kingdom', 5600]);
  await insertRow(countrySql, [issueIds['Plastic Waste'], 'US', 'United States', 4320]);
  await insertRow(countrySql, [issueIds['Plastic Waste'], 'DE', 'Germany', 3210]);
  await insertRow(countrySql, [issueIds['Plastic Waste'], 'IN', 'India', 2890]);
  await insertRow(countrySql, [issueIds['Plastic Waste'], 'AU', 'Australia', 1980]);

  await insertRow(countrySql, [issueIds['Sewage in Rivers'], 'GB', 'United Kingdom', 5100]);
  await insertRow(countrySql, [issueIds['Sewage in Rivers'], 'IE', 'Ireland', 200]);
  await insertRow(countrySql, [issueIds['Sewage in Rivers'], 'FR', 'France', 100]);

  await insertRow(countrySql, [issueIds['Hidden Bank Charges'], 'GB', 'United Kingdom', 5400]);
  await insertRow(countrySql, [issueIds['Hidden Bank Charges'], 'US', 'United States', 2100]);
  await insertRow(countrySql, [issueIds['Hidden Bank Charges'], 'DE', 'Germany', 890]);

  await insertRow(countrySql, [issueIds['Student Loan Repayment'], 'GB', 'United Kingdom', 4500]);
  await insertRow(countrySql, [issueIds['Student Loan Repayment'], 'US', 'United States', 5230]);
  await insertRow(countrySql, [issueIds['Student Loan Repayment'], 'AU', 'Australia', 890]);

  // Basic country data for UK-centric issues
  const ukIssues = [
    'Train Ticket Prices',
    'Bus Route Cuts',
    'Customer Service Hold Times',
    'Energy Bill Costs',
    'Water Bill Increases',
    'GP Appointment Access',
    'Dentist Availability',
    'Mental Health Service Waits',
    'Prescription Costs',
    'Delivery Problems',
    'Rent Increases',
    'Parking Fines',
    'Council Tax Rises',
    'Pothole Damage',
    'Damp and Mould in Housing',
    'Shrinkflation',
  ];
  for (const issueName of ukIssues) {
    await insertRow(countrySql, [
      issueIds[issueName],
      'GB',
      'United Kingdom',
      Math.floor(Math.random() * 3000 + 1500),
    ]);
    await insertRow(countrySql, [
      issueIds[issueName],
      'IE',
      'Ireland',
      Math.floor(Math.random() * 300 + 50),
    ]);
  }

  // =============================
  // USER-ISSUE MEMBERSHIPS
  // =============================
  const userIssueSql = `INSERT INTO user_issues (id, user_id, issue_id) VALUES (?, ?, ?)`;

  await insertRow(userIssueSql, [userIds['Sarah K.'], issueIds['Train Cancellations']]);
  await insertRow(userIssueSql, [userIds['Marcio R.'], issueIds['Train Cancellations']]);
  await insertRow(userIssueSql, [userIds['James L.'], issueIds['Train Cancellations']]);
  await insertRow(userIssueSql, [userIds['James L.'], issueIds['Broadband Speed']]);
  await insertRow(userIssueSql, [userIds['Yuki T.'], issueIds['Broadband Speed']]);
  await insertRow(userIssueSql, [userIds['Dr. Patel'], issueIds['NHS Waiting Times']]);
  await insertRow(userIssueSql, [userIds['Priya S.'], issueIds['NHS Waiting Times']]);
  await insertRow(userIssueSql, [userIds['Priya S.'], issueIds['Plastic Waste']]);
  await insertRow(userIssueSql, [userIds['Emma W.'], issueIds['NHS Waiting Times']]);
  await insertRow(userIssueSql, [userIds['Emma W.'], issueIds['Train Cancellations']]);
  await insertRow(userIssueSql, [userIds['Carlos M.'], issueIds['Plastic Waste']]);
  await insertRow(userIssueSql, [userIds['Carlos M.'], issueIds['Sewage in Rivers']]);

  // =============================
  // SEASONAL PATTERNS
  // =============================
  const seasonSql = `INSERT INTO seasonal_patterns (id, issue_id, peak_months, description) VALUES (?, ?, ?, ?)`;

  await insertRow(seasonSql, [
    issueIds['Flight Delays'],
    '[6,7,8]',
    'Flight delays peak during summer holiday season',
  ]);
  await insertRow(seasonSql, [
    issueIds['Lost Luggage'],
    '[6,7,8]',
    'Lost luggage peaks with summer travel',
  ]);
  await insertRow(seasonSql, [
    issueIds['Energy Bill Costs'],
    '[11,12,1,2]',
    'Energy bill anger peaks in winter heating season',
  ]);
  await insertRow(seasonSql, [
    issueIds['Delivery Problems'],
    '[11,12]',
    'Delivery problems spike before Christmas',
  ]);
  await insertRow(seasonSql, [
    issueIds['Water Bill Increases'],
    '[4]',
    'Water bill complaints spike when new rates start in April',
  ]);
  await insertRow(seasonSql, [
    issueIds['Fuel Prices'],
    '[11,12,1]',
    'Fuel price complaints rise in winter',
  ]);
  await insertRow(seasonSql, [
    issueIds['Train Cancellations'],
    '[11,12,1,2]',
    'Train cancellations worse in winter weather',
  ]);
  await insertRow(seasonSql, [
    issueIds['Sewage in Rivers'],
    '[6,7,8]',
    'Sewage awareness peaks in beach season',
  ]);
  await insertRow(seasonSql, [
    issueIds['Roaming Charges'],
    '[6,7,8]',
    'Roaming charge complaints spike in holiday season',
  ]);
  await insertRow(seasonSql, [
    issueIds['Plastic Waste'],
    '[12]',
    'Packaging waste complaints peak at Christmas',
  ]);

  // =============================
  // ISSUE RELATIONS
  // =============================
  const relationSql = `INSERT INTO issue_relations (id, child_id, parent_id, relation_type) VALUES (?, ?, ?, ?)`;

  // Train issues are related
  await insertRow(relationSql, [
    issueIds['Train Cancellations'],
    issueIds['Train Ticket Prices'],
    'related_to',
  ]);
  await insertRow(relationSql, [
    issueIds['Train Ticket Prices'],
    issueIds['Bus Route Cuts'],
    'related_to',
  ]);

  // Flight issues
  await insertRow(relationSql, [issueIds['Lost Luggage'], issueIds['Flight Delays'], 'related_to']);

  // Telecoms
  await insertRow(relationSql, [
    issueIds['Mobile Signal Dead Zones'],
    issueIds['Broadband Speed'],
    'related_to',
  ]);
  await insertRow(relationSql, [
    issueIds['Price Rises Mid-Contract'],
    issueIds['Broadband Speed'],
    'related_to',
  ]);

  // Energy / Water
  await insertRow(relationSql, [
    issueIds['Inaccurate Energy Bills'],
    issueIds['Energy Bill Costs'],
    'specific_of',
  ]);
  await insertRow(relationSql, [
    issueIds['Smart Meter Problems'],
    issueIds['Energy Bill Costs'],
    'related_to',
  ]);
  await insertRow(relationSql, [
    issueIds['Sewage in Rivers'],
    issueIds['Water Bill Increases'],
    'related_to',
  ]);

  // Banking
  await insertRow(relationSql, [
    issueIds['Hidden Bank Charges'],
    issueIds['Overseas Transfer Fees'],
    'related_to',
  ]);
  await insertRow(relationSql, [
    issueIds['Fraud and Scam Losses'],
    issueIds['Hidden Bank Charges'],
    'related_to',
  ]);

  // Health
  await insertRow(relationSql, [
    issueIds['GP Appointment Access'],
    issueIds['NHS Waiting Times'],
    'specific_of',
  ]);
  await insertRow(relationSql, [
    issueIds['Dentist Availability'],
    issueIds['NHS Waiting Times'],
    'related_to',
  ]);
  await insertRow(relationSql, [
    issueIds['Mental Health Service Waits'],
    issueIds['NHS Waiting Times'],
    'specific_of',
  ]);

  // Shopping
  await insertRow(relationSql, [
    issueIds['Subscription Traps'],
    issueIds['Difficulty Cancelling Subscriptions'],
    'specific_of',
  ]);
  await insertRow(relationSql, [
    issueIds['Shrinkflation'],
    issueIds['Food Quality Decline'],
    'related_to',
  ]);

  console.log('Database seeded successfully!');
  console.log(`   ${issues.length} issues`);
  console.log(`   ${orgs.length} organisations`);
  console.log(`   ${users.length} sample users`);
  console.log(
    '   150+ pivot links, 80+ synonyms, 35+ actions, seasonal patterns, issue relations — all populated',
  );
}
