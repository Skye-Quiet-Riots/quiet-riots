import { getDb } from './db';
import { dropTables, createTables } from './schema';

export function seed() {
  dropTables();
  createTables();

  const db = getDb();

  // =============================
  // ISSUES (19 across 6 categories)
  // =============================
  const insertIssue = db.prepare(
    `INSERT INTO issues (name, category, description, rioter_count, country_count, trending_delta) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const issues = [
    // Transport (1-5)
    ['Rail Cancellations', 'Transport', 'Frequent train cancellations causing commuter misery', 2847, 3, 340],
    ['Train Ticket Prices', 'Transport', 'Rising rail fares outpacing inflation and wages', 5612, 4, 180],
    ['Flight Delays', 'Transport', 'Chronic flight delays and inadequate compensation', 12340, 28, 890],
    ['Lost Luggage', 'Transport', 'Airlines losing passenger baggage with slow resolution', 8920, 35, 420],
    ['Bus Route Cuts', 'Transport', 'Rural and suburban bus services being reduced or eliminated', 3210, 3, 150],
    // Telecoms (6-8)
    ['Broadband Speed', 'Telecoms', 'Internet speeds far below advertised rates', 4112, 5, 520],
    ['Mobile Data Costs', 'Telecoms', 'Excessive mobile data charges and hidden fees', 6780, 12, 340],
    ['Customer Service Hold Times', 'Telecoms', 'Unreasonable wait times when calling customer support', 3450, 8, 210],
    // Banking (9-11)
    ['Overseas Transfer Fees', 'Banking', 'Excessive fees for international money transfers', 7890, 22, 670],
    ['Hidden Charges', 'Banking', 'Undisclosed fees appearing on bank statements', 9120, 15, 450],
    ['Bank Branch Closures', 'Banking', 'Local bank branches closing, leaving communities without access', 2340, 3, 120],
    // Health (12-14)
    ['NHS Waiting Times', 'Health', 'Dangerously long waiting times for NHS appointments and treatments', 8934, 1, 890],
    ['Mental Health Services', 'Health', 'Inadequate funding and access to mental health support', 4567, 6, 340],
    ['Prescription Costs', 'Health', 'Rising costs of prescription medications', 3210, 4, 180],
    // Education (15-17)
    ['Outdated Teaching Methods', 'Education', 'Curricula failing to prepare students for modern challenges', 6780, 18, 560],
    ['Student Debt', 'Education', 'Crippling student loan burdens affecting life choices', 11230, 4, 920],
    ['School Funding', 'Education', 'Insufficient funding for schools and educational resources', 5340, 8, 310],
    // Environment (18-19)
    ['Climate Change', 'Environment', 'Insufficient action on climate change from governments and corporations', 45670, 82, 3400],
    ['Plastic Waste', 'Environment', 'Excessive single-use plastics polluting oceans and ecosystems', 23450, 54, 1800],
  ] as const;

  const issueIds: Record<string, number> = {};
  for (const [name, category, description, rioters, countries, trending] of issues) {
    const result = insertIssue.run(name, category, description, rioters, countries, trending);
    issueIds[name as string] = Number(result.lastInsertRowid);
  }

  // =============================
  // ORGANISATIONS (3 per category = 18)
  // =============================
  const insertOrg = db.prepare(
    `INSERT INTO organisations (name, category, logo_emoji, description) VALUES (?, ?, ?, ?)`
  );

  const orgs = [
    // Transport
    ['Southern Rail', 'Transport', '🚂', 'UK regional rail operator serving the south'],
    ['Deutsche Bahn', 'Transport', '🇩🇪', 'German national railway operator'],
    ['SNCF', 'Transport', '🇫🇷', 'French national railway company'],
    ['Trenitalia', 'Transport', '🇮🇹', 'Italian national rail operator'],
    ['Amtrak', 'Transport', '🇺🇸', 'US national passenger railroad'],
    // Telecoms
    ['BT', 'Telecoms', '📞', 'British Telecommunications, major UK broadband provider'],
    ['Vodafone', 'Telecoms', '📱', 'Global telecoms company headquartered in the UK'],
    ['Three', 'Telecoms', '3️⃣', 'UK mobile network operator'],
    // Banking
    ['HSBC', 'Banking', '🏦', 'Global banking and financial services'],
    ['Barclays', 'Banking', '💳', 'British multinational bank'],
    ['NatWest', 'Banking', '🏧', 'UK retail and commercial bank'],
    // Health
    ['NHS England', 'Health', '🏥', 'National Health Service for England'],
    ['NICE', 'Health', '📋', 'National Institute for Health and Care Excellence'],
    ['PHE', 'Health', '🩺', 'Public Health England'],
    // Education
    ['Department for Education', 'Education', '🎓', 'UK government department for education'],
    ['Ofsted', 'Education', '📊', 'Office for Standards in Education'],
    ['Student Loans Company', 'Education', '💰', 'UK student finance administrator'],
    // Environment
    ['DEFRA', 'Environment', '🌱', 'Department for Environment, Food & Rural Affairs'],
    ['Environment Agency', 'Environment', '🌍', 'UK environmental protection agency'],
    ['Forestry Commission', 'Environment', '🌲', 'UK government forestry department'],
  ] as const;

  const orgIds: Record<string, number> = {};
  for (const [name, category, emoji, desc] of orgs) {
    const result = insertOrg.run(name, category, emoji, desc);
    orgIds[name as string] = Number(result.lastInsertRowid);
  }

  // =============================
  // ISSUE-ORGANISATION LINKS (The Pivot data)
  // =============================
  const insertLink = db.prepare(
    `INSERT INTO issue_organisation (issue_id, organisation_id, rioter_count, rank) VALUES (?, ?, ?, ?)`
  );

  // Transport issues across transport orgs
  // Rail Cancellations
  insertLink.run(issueIds['Rail Cancellations'], orgIds['Southern Rail'], 2847, 1);
  insertLink.run(issueIds['Rail Cancellations'], orgIds['Deutsche Bahn'], 1203, 2);
  insertLink.run(issueIds['Rail Cancellations'], orgIds['SNCF'], 956, 3);
  insertLink.run(issueIds['Rail Cancellations'], orgIds['Trenitalia'], 734, 4);
  insertLink.run(issueIds['Rail Cancellations'], orgIds['Amtrak'], 612, 5);

  // Train Ticket Prices
  insertLink.run(issueIds['Train Ticket Prices'], orgIds['Southern Rail'], 1923, 2);
  insertLink.run(issueIds['Train Ticket Prices'], orgIds['Deutsche Bahn'], 1456, 3);
  insertLink.run(issueIds['Train Ticket Prices'], orgIds['SNCF'], 1102, 4);
  insertLink.run(issueIds['Train Ticket Prices'], orgIds['Trenitalia'], 678, 5);
  insertLink.run(issueIds['Train Ticket Prices'], orgIds['Amtrak'], 453, 6);

  // Flight Delays
  insertLink.run(issueIds['Flight Delays'], orgIds['Southern Rail'], 890, 4);
  insertLink.run(issueIds['Flight Delays'], orgIds['Deutsche Bahn'], 2340, 1);
  insertLink.run(issueIds['Flight Delays'], orgIds['SNCF'], 1567, 2);
  insertLink.run(issueIds['Flight Delays'], orgIds['Amtrak'], 1234, 3);

  // Lost Luggage
  insertLink.run(issueIds['Lost Luggage'], orgIds['Southern Rail'], 456, 5);
  insertLink.run(issueIds['Lost Luggage'], orgIds['Deutsche Bahn'], 1890, 1);
  insertLink.run(issueIds['Lost Luggage'], orgIds['SNCF'], 1234, 2);
  insertLink.run(issueIds['Lost Luggage'], orgIds['Trenitalia'], 987, 3);
  insertLink.run(issueIds['Lost Luggage'], orgIds['Amtrak'], 678, 4);

  // Bus Route Cuts
  insertLink.run(issueIds['Bus Route Cuts'], orgIds['Southern Rail'], 1456, 3);
  insertLink.run(issueIds['Bus Route Cuts'], orgIds['Deutsche Bahn'], 567, 5);
  insertLink.run(issueIds['Bus Route Cuts'], orgIds['Amtrak'], 890, 4);

  // Broadband Speed across telecoms
  insertLink.run(issueIds['Broadband Speed'], orgIds['BT'], 2345, 1);
  insertLink.run(issueIds['Broadband Speed'], orgIds['Vodafone'], 1234, 2);
  insertLink.run(issueIds['Broadband Speed'], orgIds['Three'], 533, 3);

  // Mobile Data Costs
  insertLink.run(issueIds['Mobile Data Costs'], orgIds['BT'], 1890, 2);
  insertLink.run(issueIds['Mobile Data Costs'], orgIds['Vodafone'], 2567, 1);
  insertLink.run(issueIds['Mobile Data Costs'], orgIds['Three'], 2323, 3);

  // Customer Service Hold Times
  insertLink.run(issueIds['Customer Service Hold Times'], orgIds['BT'], 1567, 1);
  insertLink.run(issueIds['Customer Service Hold Times'], orgIds['Vodafone'], 1023, 2);
  insertLink.run(issueIds['Customer Service Hold Times'], orgIds['Three'], 860, 3);

  // Banking issues
  insertLink.run(issueIds['Overseas Transfer Fees'], orgIds['HSBC'], 3456, 1);
  insertLink.run(issueIds['Overseas Transfer Fees'], orgIds['Barclays'], 2345, 2);
  insertLink.run(issueIds['Overseas Transfer Fees'], orgIds['NatWest'], 2089, 3);

  insertLink.run(issueIds['Hidden Charges'], orgIds['HSBC'], 4120, 1);
  insertLink.run(issueIds['Hidden Charges'], orgIds['Barclays'], 2890, 2);
  insertLink.run(issueIds['Hidden Charges'], orgIds['NatWest'], 2110, 3);

  insertLink.run(issueIds['Bank Branch Closures'], orgIds['HSBC'], 890, 1);
  insertLink.run(issueIds['Bank Branch Closures'], orgIds['Barclays'], 823, 2);
  insertLink.run(issueIds['Bank Branch Closures'], orgIds['NatWest'], 627, 3);

  // Health issues
  insertLink.run(issueIds['NHS Waiting Times'], orgIds['NHS England'], 8412, 1);
  insertLink.run(issueIds['NHS Waiting Times'], orgIds['NICE'], 312, 2);
  insertLink.run(issueIds['NHS Waiting Times'], orgIds['PHE'], 210, 3);

  insertLink.run(issueIds['Mental Health Services'], orgIds['NHS England'], 3456, 1);
  insertLink.run(issueIds['Mental Health Services'], orgIds['NICE'], 678, 2);
  insertLink.run(issueIds['Mental Health Services'], orgIds['PHE'], 433, 3);

  insertLink.run(issueIds['Prescription Costs'], orgIds['NHS England'], 2345, 1);
  insertLink.run(issueIds['Prescription Costs'], orgIds['NICE'], 534, 2);
  insertLink.run(issueIds['Prescription Costs'], orgIds['PHE'], 331, 3);

  // Education issues
  insertLink.run(issueIds['Outdated Teaching Methods'], orgIds['Department for Education'], 3456, 1);
  insertLink.run(issueIds['Outdated Teaching Methods'], orgIds['Ofsted'], 2134, 2);
  insertLink.run(issueIds['Outdated Teaching Methods'], orgIds['Student Loans Company'], 1190, 3);

  insertLink.run(issueIds['Student Debt'], orgIds['Department for Education'], 4567, 1);
  insertLink.run(issueIds['Student Debt'], orgIds['Student Loans Company'], 5123, 2);
  insertLink.run(issueIds['Student Debt'], orgIds['Ofsted'], 1540, 3);

  insertLink.run(issueIds['School Funding'], orgIds['Department for Education'], 2890, 1);
  insertLink.run(issueIds['School Funding'], orgIds['Ofsted'], 1567, 2);
  insertLink.run(issueIds['School Funding'], orgIds['Student Loans Company'], 883, 3);

  // Environment issues
  insertLink.run(issueIds['Climate Change'], orgIds['DEFRA'], 18900, 1);
  insertLink.run(issueIds['Climate Change'], orgIds['Environment Agency'], 15670, 2);
  insertLink.run(issueIds['Climate Change'], orgIds['Forestry Commission'], 11100, 3);

  insertLink.run(issueIds['Plastic Waste'], orgIds['DEFRA'], 10230, 1);
  insertLink.run(issueIds['Plastic Waste'], orgIds['Environment Agency'], 8450, 2);
  insertLink.run(issueIds['Plastic Waste'], orgIds['Forestry Commission'], 4770, 3);

  // =============================
  // SYNONYMS
  // =============================
  const insertSynonym = db.prepare(
    `INSERT INTO synonyms (issue_id, term) VALUES (?, ?)`
  );

  const synonyms: [string, string[]][] = [
    ['Rail Cancellations', ['train cancellations', 'cancelled trains', 'rail disruptions', 'service cancellations']],
    ['Train Ticket Prices', ['rail fares', 'ticket costs', 'expensive trains']],
    ['Flight Delays', ['delayed flights', 'airport delays', 'late flights']],
    ['Lost Luggage', ['missing bags', 'missing luggage', 'pérdida de equipaje', 'baggage loss']],
    ['Bus Route Cuts', ['bus cuts', 'route reductions', 'bus service closures']],
    ['Broadband Speed', ['slow internet', 'poor wifi', 'internet speed', 'slow broadband']],
    ['Mobile Data Costs', ['data charges', 'phone bills', 'mobile costs']],
    ['Customer Service Hold Times', ['hold times', 'waiting on phone', 'call centre wait']],
    ['Overseas Transfer Fees', ['international transfer costs', 'remittance fees', 'wire transfer charges']],
    ['Hidden Charges', ['unexpected fees', 'hidden fees', 'surprise charges']],
    ['Bank Branch Closures', ['branch shutdowns', 'local bank closing']],
    ['NHS Waiting Times', ['hospital wait', 'appointment delays', 'NHS delays', 'waiting list']],
    ['Mental Health Services', ['mental health funding', 'therapy access', 'counselling wait']],
    ['Prescription Costs', ['medicine costs', 'drug prices', 'pharmacy charges']],
    ['Outdated Teaching Methods', ['old curricula', 'outdated education', 'teaching reform']],
    ['Student Debt', ['student loans', 'tuition fees', 'education debt']],
    ['School Funding', ['education funding', 'school budgets', 'classroom resources']],
    ['Climate Change', ['global warming', 'climate crisis', 'climate emergency']],
    ['Plastic Waste', ['plastic pollution', 'single-use plastics', 'ocean pollution']],
  ];

  for (const [issueName, terms] of synonyms) {
    for (const term of terms) {
      insertSynonym.run(issueIds[issueName], term);
    }
  }

  // =============================
  // SAMPLE USERS
  // =============================
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, phone, time_available, skills) VALUES (?, ?, ?, ?, ?)`
  );

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

  const userIds: Record<string, number> = {};
  for (const [name, email, phone, time, skills] of users) {
    const result = insertUser.run(name, email, phone, time, skills);
    userIds[name as string] = Number(result.lastInsertRowid);
  }

  // =============================
  // ACTIONS (mix across issues)
  // =============================
  const insertAction = db.prepare(
    `INSERT INTO actions (issue_id, title, description, type, time_required, skills_needed, external_url, provider_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Rail Cancellations actions (matching the demo)
  insertAction.run(issueIds['Rail Cancellations'], 'Write to Transport Regulator', 'Send a formal complaint using our community template', 'action', '10min', 'writing', 'https://www.railombudsman.org', 'Rail Ombudsman');
  insertAction.run(issueIds['Rail Cancellations'], 'Claim your refund', 'Get compensation for delayed/cancelled trains', 'action', '1min', '', 'https://www.southernrailway.com/help-and-contact/delay-repay', 'Delay Repay');
  insertAction.run(issueIds['Rail Cancellations'], 'Sign the petition', 'Join 4,231 others demanding better service', 'action', '1min', '', 'https://petition.parliament.uk', 'UK Parliament Petitions');
  insertAction.run(issueIds['Rail Cancellations'], 'Film your platform', 'Document overcrowding and cancellation boards', 'action', '10min', 'media', null, null);
  insertAction.run(issueIds['Rail Cancellations'], 'Brainstorm solutions', 'Join the community brainstorm session', 'idea', '10min', '', null, null);
  insertAction.run(issueIds['Rail Cancellations'], 'Switch provider', 'Compare alternative routes and operators', 'action', '1min', '', 'https://www.thetrainline.com', 'Trainline');
  insertAction.run(issueIds['Rail Cancellations'], 'Welcome new members', 'Help newcomers feel at home in the community', 'together', '1min', 'organising', null, null);
  insertAction.run(issueIds['Rail Cancellations'], 'Celebrate wins', 'Recognise when progress is made', 'together', '1min', '', null, null);
  insertAction.run(issueIds['Rail Cancellations'], 'Share your experience', 'Tell others about your cancellation stories', 'idea', '10min', 'writing', null, null);

  // Broadband Speed actions
  insertAction.run(issueIds['Broadband Speed'], 'Speed test evidence', 'Document your actual vs advertised speeds', 'action', '1min', 'tech', 'https://www.speedtest.net', 'Speedtest');
  insertAction.run(issueIds['Broadband Speed'], 'Complain to Ofcom', 'File a formal complaint with the regulator', 'action', '10min', 'writing', 'https://www.ofcom.org.uk', 'Ofcom');
  insertAction.run(issueIds['Broadband Speed'], 'Switch provider', 'Compare broadband deals in your area', 'action', '10min', '', 'https://www.uswitch.com/broadband', 'uSwitch');
  insertAction.run(issueIds['Broadband Speed'], 'Share your speed data', 'Contribute your speed test results', 'idea', '1min', 'tech', null, null);
  insertAction.run(issueIds['Broadband Speed'], 'Community troubleshooting', 'Help others optimise their setup', 'together', '10min', 'tech', null, null);
  insertAction.run(issueIds['Broadband Speed'], 'Vote on priorities', 'Help decide which campaign to focus on', 'idea', '1min', '', null, null);

  // NHS Waiting Times actions
  insertAction.run(issueIds['NHS Waiting Times'], 'Write to your MP', 'Use our template to contact your representative', 'action', '10min', 'writing', 'https://www.writetothem.com', 'WriteToThem');
  insertAction.run(issueIds['NHS Waiting Times'], 'Sign the NHS petition', 'Join 12,000+ calling for more funding', 'action', '1min', '', 'https://petition.parliament.uk', 'UK Parliament Petitions');
  insertAction.run(issueIds['NHS Waiting Times'], 'Share your waiting story', 'Your experience helps build the case for change', 'idea', '10min', 'writing', null, null);
  insertAction.run(issueIds['NHS Waiting Times'], 'Attend virtual rally', 'Join the online campaign event this Saturday', 'together', '1hr+', 'organising', null, null);
  insertAction.run(issueIds['NHS Waiting Times'], 'Translate campaign materials', 'Help reach non-English speaking communities', 'together', '1hr+', 'languages', null, null);
  insertAction.run(issueIds['NHS Waiting Times'], 'Data collection drive', 'Help us map wait times across the country', 'idea', '10min', 'tech', null, null);

  // Hidden Charges actions
  insertAction.run(issueIds['Hidden Charges'], 'Report to FCA', 'File a complaint with the Financial Conduct Authority', 'action', '10min', 'writing', 'https://www.fca.org.uk', 'FCA');
  insertAction.run(issueIds['Hidden Charges'], 'Switch banks', 'Use the Current Account Switch Service', 'action', '10min', '', 'https://www.currentaccountswitch.co.uk', 'CASS');
  insertAction.run(issueIds['Hidden Charges'], 'Share your hidden fee story', 'Help others know what to watch out for', 'idea', '10min', 'writing', null, null);
  insertAction.run(issueIds['Hidden Charges'], 'Create fee comparison chart', 'Help the community compare bank charges', 'together', '1hr+', 'tech', null, null);

  // Climate Change actions
  insertAction.run(issueIds['Climate Change'], 'Write to your representative', 'Demand climate action from elected officials', 'action', '10min', 'writing', 'https://www.writetothem.com', 'WriteToThem');
  insertAction.run(issueIds['Climate Change'], 'Carbon footprint audit', 'Calculate and share your household footprint', 'idea', '10min', '', 'https://www.carbonfootprint.com', 'Carbon Footprint');
  insertAction.run(issueIds['Climate Change'], 'Join local climate group', 'Connect with activists in your area', 'together', '1hr+', 'organising', null, null);
  insertAction.run(issueIds['Climate Change'], 'Sign the climate petition', 'Join 1M+ calling for net zero by 2035', 'action', '1min', '', 'https://petition.parliament.uk', 'UK Parliament Petitions');
  insertAction.run(issueIds['Climate Change'], 'Switch to green energy', 'Compare renewable energy providers', 'action', '10min', '', 'https://www.uswitch.com/gas-electricity', 'uSwitch');
  insertAction.run(issueIds['Climate Change'], 'Organise community event', 'Plan a local awareness or action day', 'together', '1hr+', 'organising,media', null, null);

  // Student Debt actions
  insertAction.run(issueIds['Student Debt'], 'Check your repayment plan', 'Make sure you\'re on the right plan', 'action', '1min', '', 'https://www.gov.uk/repaying-your-student-loan', 'GOV.UK');
  insertAction.run(issueIds['Student Debt'], 'Campaign for reform', 'Write to your MP about student finance', 'action', '10min', 'writing', 'https://www.writetothem.com', 'WriteToThem');
  insertAction.run(issueIds['Student Debt'], 'Share financial tips', 'Help others manage their student debt', 'together', '10min', 'writing', null, null);
  insertAction.run(issueIds['Student Debt'], 'Brainstorm policy alternatives', 'What would a fairer system look like?', 'idea', '10min', '', null, null);

  // Plastic Waste actions
  insertAction.run(issueIds['Plastic Waste'], 'Audit your plastic use', 'Track single-use plastics for one week', 'idea', '10min', '', null, null);
  insertAction.run(issueIds['Plastic Waste'], 'Beach or park cleanup', 'Join or organise a local litter pick', 'together', '1hr+', 'organising', null, null);
  insertAction.run(issueIds['Plastic Waste'], 'Contact manufacturers', 'Write to brands about packaging waste', 'action', '10min', 'writing', null, null);
  insertAction.run(issueIds['Plastic Waste'], 'Support plastic ban petition', 'Sign the petition for single-use plastic legislation', 'action', '1min', '', 'https://petition.parliament.uk', 'UK Parliament Petitions');

  // Add basic actions for remaining issues
  const remainingIssues = ['Train Ticket Prices', 'Flight Delays', 'Lost Luggage', 'Bus Route Cuts', 'Mobile Data Costs', 'Customer Service Hold Times', 'Overseas Transfer Fees', 'Bank Branch Closures', 'Mental Health Services', 'Prescription Costs', 'Outdated Teaching Methods', 'School Funding'];
  for (const issueName of remainingIssues) {
    insertAction.run(issueIds[issueName], 'Share your experience', 'Tell others about your story', 'idea', '10min', 'writing', null, null);
    insertAction.run(issueIds[issueName], 'Write to your representative', 'Use our template to demand change', 'action', '10min', 'writing', 'https://www.writetothem.com', 'WriteToThem');
    insertAction.run(issueIds[issueName], 'Welcome new members', 'Help newcomers feel at home', 'together', '1min', 'organising', null, null);
    insertAction.run(issueIds[issueName], 'Vote on priorities', 'Help decide what to focus on next', 'idea', '1min', '', null, null);
  }

  // =============================
  // COMMUNITY HEALTH
  // =============================
  const insertHealth = db.prepare(
    `INSERT INTO community_health (issue_id, needs_met, membership, influence, connection) VALUES (?, ?, ?, ?, ?)`
  );

  // Scores from the demo and realistic data
  insertHealth.run(issueIds['Rail Cancellations'], 82, 71, 68, 75);
  insertHealth.run(issueIds['Train Ticket Prices'], 75, 68, 62, 70);
  insertHealth.run(issueIds['Flight Delays'], 78, 72, 65, 69);
  insertHealth.run(issueIds['Lost Luggage'], 73, 66, 60, 67);
  insertHealth.run(issueIds['Bus Route Cuts'], 65, 58, 55, 62);
  insertHealth.run(issueIds['Broadband Speed'], 79, 73, 70, 74);
  insertHealth.run(issueIds['Mobile Data Costs'], 74, 67, 63, 68);
  insertHealth.run(issueIds['Customer Service Hold Times'], 70, 62, 58, 65);
  insertHealth.run(issueIds['Overseas Transfer Fees'], 77, 71, 66, 72);
  insertHealth.run(issueIds['Hidden Charges'], 80, 74, 69, 73);
  insertHealth.run(issueIds['Bank Branch Closures'], 68, 63, 57, 64);
  insertHealth.run(issueIds['NHS Waiting Times'], 85, 78, 72, 80);
  insertHealth.run(issueIds['Mental Health Services'], 76, 72, 67, 75);
  insertHealth.run(issueIds['Prescription Costs'], 71, 65, 60, 66);
  insertHealth.run(issueIds['Outdated Teaching Methods'], 73, 68, 64, 69);
  insertHealth.run(issueIds['Student Debt'], 81, 75, 70, 76);
  insertHealth.run(issueIds['School Funding'], 72, 66, 62, 68);
  insertHealth.run(issueIds['Climate Change'], 88, 82, 78, 85);
  insertHealth.run(issueIds['Plastic Waste'], 84, 79, 74, 80);

  // =============================
  // EXPERT PROFILES
  // =============================
  const insertExpert = db.prepare(
    `INSERT INTO expert_profiles (issue_id, name, role, speciality, achievement, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?)`
  );

  // From the demo
  insertExpert.run(issueIds['Rail Cancellations'], 'Carlos M.', 'Translator', 'ES/EN Translation', 'Translated 47 issues across languages', '🌐');
  insertExpert.run(issueIds['Rail Cancellations'], 'Dr. Patel', 'Rail Rights Expert', 'Legal guidance', '12 years experience in transport law', '⚖️');
  insertExpert.run(issueIds['Rail Cancellations'], 'Yuki T.', 'Media & Comms Lead', 'JP/EN · Video campaigns', 'Running the cancellation evidence campaign', '📸');

  // Additional experts across issues
  insertExpert.run(issueIds['Broadband Speed'], 'Tom H.', 'Network Engineer', 'Broadband infrastructure', 'Helped 200+ members optimise speeds', '🔧');
  insertExpert.run(issueIds['Broadband Speed'], 'Lisa R.', 'Consumer Rights Advisor', 'Ofcom complaints', 'Won 34 compensation claims', '⚖️');

  insertExpert.run(issueIds['NHS Waiting Times'], 'Dr. Chen', 'Healthcare Policy', 'NHS reform research', 'Published 3 policy papers on wait times', '🩺');
  insertExpert.run(issueIds['NHS Waiting Times'], 'Maria G.', 'Community Organiser', 'Campaign coordination', 'Organised 12 local health rallies', '📢');
  insertExpert.run(issueIds['NHS Waiting Times'], 'Raj P.', 'Data Analyst', 'Wait time mapping', 'Built the national wait time tracker', '📊');

  insertExpert.run(issueIds['Climate Change'], 'Prof. Johnson', 'Climate Scientist', 'Climate data analysis', 'IPCC contributing author', '🔬');
  insertExpert.run(issueIds['Climate Change'], 'Aisha K.', 'Youth Organiser', 'Student climate strikes', 'Mobilised 50,000 students', '✊');
  insertExpert.run(issueIds['Climate Change'], 'Hans W.', 'Green Energy Expert', 'DE/EN · Renewable policy', 'Advised 3 local councils on net zero', '🌱');

  insertExpert.run(issueIds['Hidden Charges'], 'Sophie M.', 'Financial Advisor', 'Bank fee analysis', 'Exposed hidden charges at 5 major banks', '💰');

  insertExpert.run(issueIds['Student Debt'], 'Jake P.', 'Student Finance Expert', 'Loan repayment advice', 'Helped 1,000+ graduates save money', '🎓');

  insertExpert.run(issueIds['Plastic Waste'], 'Dr. Okafor', 'Marine Biologist', 'Ocean plastic research', 'Led 3 beach cleanup campaigns', '🌊');

  // =============================
  // FEED POSTS (from the demo + extras)
  // =============================
  const insertFeed = db.prepare(
    `INSERT INTO feed (issue_id, user_id, content, likes, created_at) VALUES (?, ?, ?, ?, ?)`
  );

  // Southern Rail posts (matching demo exactly)
  insertFeed.run(issueIds['Rail Cancellations'], userIds['Sarah K.'], 'Just got my refund! £42 back. The letter template WORKED. Thank you all! 🎉', 24, '2026-02-15 08:30:00');
  insertFeed.run(issueIds['Rail Cancellations'], userIds['Marcio R.'], 'O mesmo problema em Portugal com CP. Shall we join forces? 🇵🇹', 18, '2026-02-15 07:00:00');
  insertFeed.run(issueIds['Rail Cancellations'], userIds['James L.'], 'Third cancellation this week. Platform was packed. Filmed it this time.', 31, '2026-02-14 18:00:00');
  insertFeed.run(issueIds['Rail Cancellations'], userIds['Emma W.'], 'The regulator acknowledged our 847 letters. We\'re being heard! 📊', 45, '2026-02-14 15:00:00');
  insertFeed.run(issueIds['Rail Cancellations'], userIds['Priya S.'], 'New here! Switched from just complaining on Twitter to actually doing something. Feels different.', 12, '2026-02-13 20:00:00');

  // Broadband posts
  insertFeed.run(issueIds['Broadband Speed'], userIds['James L.'], 'Speed test: paying for 100Mbps, getting 12. Screenshots uploaded.', 28, '2026-02-15 09:00:00');
  insertFeed.run(issueIds['Broadband Speed'], userIds['Yuki T.'], 'Made a comparison video of advertised vs actual speeds. Going viral! 📹', 56, '2026-02-14 16:00:00');

  // NHS posts
  insertFeed.run(issueIds['NHS Waiting Times'], userIds['Dr. Patel'], 'New data shows average wait times up 23% this quarter. Thread with full analysis incoming.', 67, '2026-02-15 10:00:00');
  insertFeed.run(issueIds['NHS Waiting Times'], userIds['Priya S.'], '6 month wait for a specialist appointment. Posted my story on the campaign page.', 34, '2026-02-14 14:00:00');
  insertFeed.run(issueIds['NHS Waiting Times'], userIds['Emma W.'], 'Our petition just hit 10,000 signatures! 🎉 Parliament has to respond now.', 89, '2026-02-13 12:00:00');

  // Climate Change posts
  insertFeed.run(issueIds['Climate Change'], userIds['Carlos M.'], 'Translated the climate action toolkit into Spanish. 6 more languages to go! 🌍', 42, '2026-02-15 08:00:00');
  insertFeed.run(issueIds['Climate Change'], userIds['Priya S.'], 'Our local council just committed to net zero by 2030. The campaign worked!', 103, '2026-02-14 11:00:00');

  // =============================
  // COUNTRY BREAKDOWNS
  // =============================
  const insertCountry = db.prepare(
    `INSERT INTO country_breakdown (issue_id, country_code, country_name, rioter_count) VALUES (?, ?, ?, ?)`
  );

  // Southern Rail (from demo)
  insertCountry.run(issueIds['Rail Cancellations'], 'GB', 'United Kingdom', 2134);
  insertCountry.run(issueIds['Rail Cancellations'], 'FR', 'France', 412);
  insertCountry.run(issueIds['Rail Cancellations'], 'DE', 'Germany', 301);

  // Broadband (from demo)
  insertCountry.run(issueIds['Broadband Speed'], 'GB', 'United Kingdom', 3201);
  insertCountry.run(issueIds['Broadband Speed'], 'US', 'United States', 412);
  insertCountry.run(issueIds['Broadband Speed'], 'DE', 'Germany', 199);
  insertCountry.run(issueIds['Broadband Speed'], 'FR', 'France', 180);
  insertCountry.run(issueIds['Broadband Speed'], 'IE', 'Ireland', 120);

  // NHS
  insertCountry.run(issueIds['NHS Waiting Times'], 'GB', 'United Kingdom', 8412);
  insertCountry.run(issueIds['NHS Waiting Times'], 'IE', 'Ireland', 312);
  insertCountry.run(issueIds['NHS Waiting Times'], 'AU', 'Australia', 210);

  // Flight Delays (global)
  insertCountry.run(issueIds['Flight Delays'], 'GB', 'United Kingdom', 3456);
  insertCountry.run(issueIds['Flight Delays'], 'US', 'United States', 2890);
  insertCountry.run(issueIds['Flight Delays'], 'DE', 'Germany', 1234);
  insertCountry.run(issueIds['Flight Delays'], 'FR', 'France', 987);
  insertCountry.run(issueIds['Flight Delays'], 'ES', 'Spain', 876);
  insertCountry.run(issueIds['Flight Delays'], 'IT', 'Italy', 654);

  // Climate Change (most global)
  insertCountry.run(issueIds['Climate Change'], 'GB', 'United Kingdom', 8900);
  insertCountry.run(issueIds['Climate Change'], 'US', 'United States', 7650);
  insertCountry.run(issueIds['Climate Change'], 'DE', 'Germany', 5430);
  insertCountry.run(issueIds['Climate Change'], 'FR', 'France', 4320);
  insertCountry.run(issueIds['Climate Change'], 'IN', 'India', 3210);
  insertCountry.run(issueIds['Climate Change'], 'BR', 'Brazil', 2890);
  insertCountry.run(issueIds['Climate Change'], 'AU', 'Australia', 2340);
  insertCountry.run(issueIds['Climate Change'], 'JP', 'Japan', 1980);

  // Plastic Waste
  insertCountry.run(issueIds['Plastic Waste'], 'GB', 'United Kingdom', 5600);
  insertCountry.run(issueIds['Plastic Waste'], 'US', 'United States', 4320);
  insertCountry.run(issueIds['Plastic Waste'], 'DE', 'Germany', 3210);
  insertCountry.run(issueIds['Plastic Waste'], 'IN', 'India', 2890);
  insertCountry.run(issueIds['Plastic Waste'], 'AU', 'Australia', 1980);

  // Hidden Charges
  insertCountry.run(issueIds['Hidden Charges'], 'GB', 'United Kingdom', 5400);
  insertCountry.run(issueIds['Hidden Charges'], 'US', 'United States', 2100);
  insertCountry.run(issueIds['Hidden Charges'], 'DE', 'Germany', 890);
  insertCountry.run(issueIds['Hidden Charges'], 'FR', 'France', 430);

  // Student Debt
  insertCountry.run(issueIds['Student Debt'], 'GB', 'United Kingdom', 4500);
  insertCountry.run(issueIds['Student Debt'], 'US', 'United States', 5230);
  insertCountry.run(issueIds['Student Debt'], 'AU', 'Australia', 890);
  insertCountry.run(issueIds['Student Debt'], 'CA', 'Canada', 610);

  // Lost Luggage (very global)
  insertCountry.run(issueIds['Lost Luggage'], 'GB', 'United Kingdom', 2100);
  insertCountry.run(issueIds['Lost Luggage'], 'US', 'United States', 1890);
  insertCountry.run(issueIds['Lost Luggage'], 'DE', 'Germany', 1230);
  insertCountry.run(issueIds['Lost Luggage'], 'ES', 'Spain', 980);
  insertCountry.run(issueIds['Lost Luggage'], 'FR', 'France', 870);
  insertCountry.run(issueIds['Lost Luggage'], 'IT', 'Italy', 650);

  // Add basic country data for remaining issues
  const basicCountryIssues = ['Train Ticket Prices', 'Bus Route Cuts', 'Mobile Data Costs', 'Customer Service Hold Times', 'Overseas Transfer Fees', 'Bank Branch Closures', 'Mental Health Services', 'Prescription Costs', 'Outdated Teaching Methods', 'School Funding'];
  for (const issueName of basicCountryIssues) {
    insertCountry.run(issueIds[issueName], 'GB', 'United Kingdom', Math.floor(issueIds[issueName] * 400 + 1000));
    insertCountry.run(issueIds[issueName], 'US', 'United States', Math.floor(issueIds[issueName] * 150 + 200));
    insertCountry.run(issueIds[issueName], 'DE', 'Germany', Math.floor(issueIds[issueName] * 80 + 100));
  }

  // =============================
  // USER-ISSUE MEMBERSHIPS
  // =============================
  const insertUserIssue = db.prepare(
    `INSERT INTO user_issues (user_id, issue_id) VALUES (?, ?)`
  );

  insertUserIssue.run(userIds['Sarah K.'], issueIds['Rail Cancellations']);
  insertUserIssue.run(userIds['Marcio R.'], issueIds['Rail Cancellations']);
  insertUserIssue.run(userIds['James L.'], issueIds['Rail Cancellations']);
  insertUserIssue.run(userIds['James L.'], issueIds['Broadband Speed']);
  insertUserIssue.run(userIds['Yuki T.'], issueIds['Broadband Speed']);
  insertUserIssue.run(userIds['Dr. Patel'], issueIds['NHS Waiting Times']);
  insertUserIssue.run(userIds['Priya S.'], issueIds['NHS Waiting Times']);
  insertUserIssue.run(userIds['Priya S.'], issueIds['Climate Change']);
  insertUserIssue.run(userIds['Emma W.'], issueIds['NHS Waiting Times']);
  insertUserIssue.run(userIds['Emma W.'], issueIds['Rail Cancellations']);
  insertUserIssue.run(userIds['Carlos M.'], issueIds['Climate Change']);
  insertUserIssue.run(userIds['Carlos M.'], issueIds['Rail Cancellations']);

  console.log('✅ Database seeded successfully!');
  console.log(`   ${issues.length} issues`);
  console.log(`   ${orgs.length} organisations`);
  console.log(`   ${users.length} sample users`);
  console.log('   Actions, experts, community health, feed posts, countries, synonyms — all populated');
}
