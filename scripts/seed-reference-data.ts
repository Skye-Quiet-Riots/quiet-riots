/**
 * Seed reference data: languages, countries, and default legal documents.
 *
 * Safe to run multiple times — uses INSERT OR IGNORE so existing rows are untouched.
 * Does NOT drop any tables. Only adds reference data.
 *
 * Usage:
 *   npx tsx scripts/seed-reference-data.ts
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-reference-data.ts
 */

import { getDb } from '../src/lib/db';
import { printDbBanner, requireRemoteDb } from './db-safety';
import { generateId } from '../src/lib/uuid';

// ─── Languages ──────────────────────────────────────────────────────────────
// 46 languages matching what major social platforms (Instagram/Facebook/X) support
// Each: [code, English name, native name, direction]
const LANGUAGES: [string, string, string, 'ltr' | 'rtl'][] = [
  ['en', 'English', 'English', 'ltr'],
  ['es', 'Spanish', 'Español', 'ltr'],
  ['fr', 'French', 'Français', 'ltr'],
  ['de', 'German', 'Deutsch', 'ltr'],
  ['pt', 'Portuguese', 'Português', 'ltr'],
  ['pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)', 'ltr'],
  ['it', 'Italian', 'Italiano', 'ltr'],
  ['nl', 'Dutch', 'Nederlands', 'ltr'],
  ['sv', 'Swedish', 'Svenska', 'ltr'],
  ['da', 'Danish', 'Dansk', 'ltr'],
  ['no', 'Norwegian', 'Norsk', 'ltr'],
  ['fi', 'Finnish', 'Suomi', 'ltr'],
  ['pl', 'Polish', 'Polski', 'ltr'],
  ['cs', 'Czech', 'Čeština', 'ltr'],
  ['sk', 'Slovak', 'Slovenčina', 'ltr'],
  ['hu', 'Hungarian', 'Magyar', 'ltr'],
  ['ro', 'Romanian', 'Română', 'ltr'],
  ['bg', 'Bulgarian', 'Български', 'ltr'],
  ['hr', 'Croatian', 'Hrvatski', 'ltr'],
  ['sl', 'Slovenian', 'Slovenščina', 'ltr'],
  ['uk', 'Ukrainian', 'Українська', 'ltr'],
  ['ru', 'Russian', 'Русский', 'ltr'],
  ['tr', 'Turkish', 'Türkçe', 'ltr'],
  ['ar', 'Arabic', 'العربية', 'rtl'],
  ['he', 'Hebrew', 'עברית', 'rtl'],
  ['fa', 'Persian', 'فارسی', 'rtl'],
  ['hi', 'Hindi', 'हिन्दी', 'ltr'],
  ['bn', 'Bengali', 'বাংলা', 'ltr'],
  ['ta', 'Tamil', 'தமிழ்', 'ltr'],
  ['te', 'Telugu', 'తెలుగు', 'ltr'],
  ['ml', 'Malayalam', 'മലയാളം', 'ltr'],
  ['th', 'Thai', 'ไทย', 'ltr'],
  ['vi', 'Vietnamese', 'Tiếng Việt', 'ltr'],
  ['id', 'Indonesian', 'Bahasa Indonesia', 'ltr'],
  ['ms', 'Malay', 'Bahasa Melayu', 'ltr'],
  ['zh-CN', 'Chinese (Simplified)', '简体中文', 'ltr'],
  ['zh-TW', 'Chinese (Traditional)', '繁體中文', 'ltr'],
  ['ja', 'Japanese', '日本語', 'ltr'],
  ['ko', 'Korean', '한국어', 'ltr'],
  ['tl', 'Filipino', 'Filipino', 'ltr'],
  ['sw', 'Swahili', 'Kiswahili', 'ltr'],
  ['el', 'Greek', 'Ελληνικά', 'ltr'],
  ['ca', 'Catalan', 'Català', 'ltr'],
  ['eu', 'Basque', 'Euskara', 'ltr'],
  ['gl', 'Galician', 'Galego', 'ltr'],
  ['sr', 'Serbian', 'Српски', 'ltr'],
];

// ─── Countries ──────────────────────────────────────────────────────────────
// All 249 ISO 3166-1 countries
// Each: [code, name, default_language, currency_code, phone_prefix]
const COUNTRIES: [string, string, string | null, string | null, string | null][] = [
  ['AF', 'Afghanistan', 'fa', 'AFN', '+93'],
  ['AL', 'Albania', null, 'ALL', '+355'],
  ['DZ', 'Algeria', 'ar', 'DZD', '+213'],
  ['AS', 'American Samoa', 'en', 'USD', '+1684'],
  ['AD', 'Andorra', 'ca', 'EUR', '+376'],
  ['AO', 'Angola', 'pt', 'AOA', '+244'],
  ['AI', 'Anguilla', 'en', 'XCD', '+1264'],
  ['AQ', 'Antarctica', 'en', null, '+672'],
  ['AG', 'Antigua and Barbuda', 'en', 'XCD', '+1268'],
  ['AR', 'Argentina', 'es', 'ARS', '+54'],
  ['AM', 'Armenia', null, 'AMD', '+374'],
  ['AW', 'Aruba', 'nl', 'AWG', '+297'],
  ['AU', 'Australia', 'en', 'AUD', '+61'],
  ['AT', 'Austria', 'de', 'EUR', '+43'],
  ['AZ', 'Azerbaijan', null, 'AZN', '+994'],
  ['BS', 'Bahamas', 'en', 'BSD', '+1242'],
  ['BH', 'Bahrain', 'ar', 'BHD', '+973'],
  ['BD', 'Bangladesh', 'bn', 'BDT', '+880'],
  ['BB', 'Barbados', 'en', 'BBD', '+1246'],
  ['BY', 'Belarus', 'ru', 'BYN', '+375'],
  ['BE', 'Belgium', 'nl', 'EUR', '+32'],
  ['BZ', 'Belize', 'en', 'BZD', '+501'],
  ['BJ', 'Benin', 'fr', 'XOF', '+229'],
  ['BM', 'Bermuda', 'en', 'BMD', '+1441'],
  ['BT', 'Bhutan', null, 'BTN', '+975'],
  ['BO', 'Bolivia', 'es', 'BOB', '+591'],
  ['BA', 'Bosnia and Herzegovina', null, 'BAM', '+387'],
  ['BW', 'Botswana', 'en', 'BWP', '+267'],
  ['BR', 'Brazil', 'pt-BR', 'BRL', '+55'],
  ['IO', 'British Indian Ocean Territory', 'en', 'USD', '+246'],
  ['BN', 'Brunei', 'ms', 'BND', '+673'],
  ['BG', 'Bulgaria', 'bg', 'BGN', '+359'],
  ['BF', 'Burkina Faso', 'fr', 'XOF', '+226'],
  ['BI', 'Burundi', 'fr', 'BIF', '+257'],
  ['CV', 'Cabo Verde', 'pt', 'CVE', '+238'],
  ['KH', 'Cambodia', null, 'KHR', '+855'],
  ['CM', 'Cameroon', 'fr', 'XAF', '+237'],
  ['CA', 'Canada', 'en', 'CAD', '+1'],
  ['KY', 'Cayman Islands', 'en', 'KYD', '+1345'],
  ['CF', 'Central African Republic', 'fr', 'XAF', '+236'],
  ['TD', 'Chad', 'fr', 'XAF', '+235'],
  ['CL', 'Chile', 'es', 'CLP', '+56'],
  ['CN', 'China', 'zh-CN', 'CNY', '+86'],
  ['CX', 'Christmas Island', 'en', 'AUD', '+61'],
  ['CC', 'Cocos (Keeling) Islands', 'en', 'AUD', '+61'],
  ['CO', 'Colombia', 'es', 'COP', '+57'],
  ['KM', 'Comoros', 'ar', 'KMF', '+269'],
  ['CG', 'Congo', 'fr', 'XAF', '+242'],
  ['CD', 'Congo (DRC)', 'fr', 'CDF', '+243'],
  ['CK', 'Cook Islands', 'en', 'NZD', '+682'],
  ['CR', 'Costa Rica', 'es', 'CRC', '+506'],
  ['CI', "Côte d'Ivoire", 'fr', 'XOF', '+225'],
  ['HR', 'Croatia', 'hr', 'EUR', '+385'],
  ['CU', 'Cuba', 'es', 'CUP', '+53'],
  ['CW', 'Curaçao', 'nl', 'ANG', '+599'],
  ['CY', 'Cyprus', 'el', 'EUR', '+357'],
  ['CZ', 'Czech Republic', 'cs', 'CZK', '+420'],
  ['DK', 'Denmark', 'da', 'DKK', '+45'],
  ['DJ', 'Djibouti', 'fr', 'DJF', '+253'],
  ['DM', 'Dominica', 'en', 'XCD', '+1767'],
  ['DO', 'Dominican Republic', 'es', 'DOP', '+1809'],
  ['EC', 'Ecuador', 'es', 'USD', '+593'],
  ['EG', 'Egypt', 'ar', 'EGP', '+20'],
  ['SV', 'El Salvador', 'es', 'USD', '+503'],
  ['GQ', 'Equatorial Guinea', 'es', 'XAF', '+240'],
  ['ER', 'Eritrea', null, 'ERN', '+291'],
  ['EE', 'Estonia', null, 'EUR', '+372'],
  ['SZ', 'Eswatini', 'en', 'SZL', '+268'],
  ['ET', 'Ethiopia', null, 'ETB', '+251'],
  ['FK', 'Falkland Islands', 'en', 'FKP', '+500'],
  ['FO', 'Faroe Islands', 'da', 'DKK', '+298'],
  ['FJ', 'Fiji', 'en', 'FJD', '+679'],
  ['FI', 'Finland', 'fi', 'EUR', '+358'],
  ['FR', 'France', 'fr', 'EUR', '+33'],
  ['GF', 'French Guiana', 'fr', 'EUR', '+594'],
  ['PF', 'French Polynesia', 'fr', 'XPF', '+689'],
  ['GA', 'Gabon', 'fr', 'XAF', '+241'],
  ['GM', 'Gambia', 'en', 'GMD', '+220'],
  ['GE', 'Georgia', null, 'GEL', '+995'],
  ['DE', 'Germany', 'de', 'EUR', '+49'],
  ['GH', 'Ghana', 'en', 'GHS', '+233'],
  ['GI', 'Gibraltar', 'en', 'GIP', '+350'],
  ['GR', 'Greece', 'el', 'EUR', '+30'],
  ['GL', 'Greenland', 'da', 'DKK', '+299'],
  ['GD', 'Grenada', 'en', 'XCD', '+1473'],
  ['GP', 'Guadeloupe', 'fr', 'EUR', '+590'],
  ['GU', 'Guam', 'en', 'USD', '+1671'],
  ['GT', 'Guatemala', 'es', 'GTQ', '+502'],
  ['GG', 'Guernsey', 'en', 'GBP', '+44'],
  ['GN', 'Guinea', 'fr', 'GNF', '+224'],
  ['GW', 'Guinea-Bissau', 'pt', 'XOF', '+245'],
  ['GY', 'Guyana', 'en', 'GYD', '+592'],
  ['HT', 'Haiti', 'fr', 'HTG', '+509'],
  ['HN', 'Honduras', 'es', 'HNL', '+504'],
  ['HK', 'Hong Kong', 'zh-TW', 'HKD', '+852'],
  ['HU', 'Hungary', 'hu', 'HUF', '+36'],
  ['IS', 'Iceland', null, 'ISK', '+354'],
  ['IN', 'India', 'hi', 'INR', '+91'],
  ['ID', 'Indonesia', 'id', 'IDR', '+62'],
  ['IR', 'Iran', 'fa', 'IRR', '+98'],
  ['IQ', 'Iraq', 'ar', 'IQD', '+964'],
  ['IE', 'Ireland', 'en', 'EUR', '+353'],
  ['IM', 'Isle of Man', 'en', 'GBP', '+44'],
  ['IL', 'Israel', 'he', 'ILS', '+972'],
  ['IT', 'Italy', 'it', 'EUR', '+39'],
  ['JM', 'Jamaica', 'en', 'JMD', '+1876'],
  ['JP', 'Japan', 'ja', 'JPY', '+81'],
  ['JE', 'Jersey', 'en', 'GBP', '+44'],
  ['JO', 'Jordan', 'ar', 'JOD', '+962'],
  ['KZ', 'Kazakhstan', 'ru', 'KZT', '+7'],
  ['KE', 'Kenya', 'sw', 'KES', '+254'],
  ['KI', 'Kiribati', 'en', 'AUD', '+686'],
  ['KP', 'North Korea', 'ko', 'KPW', '+850'],
  ['KR', 'South Korea', 'ko', 'KRW', '+82'],
  ['KW', 'Kuwait', 'ar', 'KWD', '+965'],
  ['KG', 'Kyrgyzstan', 'ru', 'KGS', '+996'],
  ['LA', 'Laos', null, 'LAK', '+856'],
  ['LV', 'Latvia', null, 'EUR', '+371'],
  ['LB', 'Lebanon', 'ar', 'LBP', '+961'],
  ['LS', 'Lesotho', 'en', 'LSL', '+266'],
  ['LR', 'Liberia', 'en', 'LRD', '+231'],
  ['LY', 'Libya', 'ar', 'LYD', '+218'],
  ['LI', 'Liechtenstein', 'de', 'CHF', '+423'],
  ['LT', 'Lithuania', null, 'EUR', '+370'],
  ['LU', 'Luxembourg', 'fr', 'EUR', '+352'],
  ['MO', 'Macao', 'zh-TW', 'MOP', '+853'],
  ['MG', 'Madagascar', 'fr', 'MGA', '+261'],
  ['MW', 'Malawi', 'en', 'MWK', '+265'],
  ['MY', 'Malaysia', 'ms', 'MYR', '+60'],
  ['MV', 'Maldives', null, 'MVR', '+960'],
  ['ML', 'Mali', 'fr', 'XOF', '+223'],
  ['MT', 'Malta', 'en', 'EUR', '+356'],
  ['MH', 'Marshall Islands', 'en', 'USD', '+692'],
  ['MQ', 'Martinique', 'fr', 'EUR', '+596'],
  ['MR', 'Mauritania', 'ar', 'MRU', '+222'],
  ['MU', 'Mauritius', 'en', 'MUR', '+230'],
  ['YT', 'Mayotte', 'fr', 'EUR', '+262'],
  ['MX', 'Mexico', 'es', 'MXN', '+52'],
  ['FM', 'Micronesia', 'en', 'USD', '+691'],
  ['MD', 'Moldova', 'ro', 'MDL', '+373'],
  ['MC', 'Monaco', 'fr', 'EUR', '+377'],
  ['MN', 'Mongolia', null, 'MNT', '+976'],
  ['ME', 'Montenegro', 'sr', 'EUR', '+382'],
  ['MS', 'Montserrat', 'en', 'XCD', '+1664'],
  ['MA', 'Morocco', 'ar', 'MAD', '+212'],
  ['MZ', 'Mozambique', 'pt', 'MZN', '+258'],
  ['MM', 'Myanmar', null, 'MMK', '+95'],
  ['NA', 'Namibia', 'en', 'NAD', '+264'],
  ['NR', 'Nauru', 'en', 'AUD', '+674'],
  ['NP', 'Nepal', null, 'NPR', '+977'],
  ['NL', 'Netherlands', 'nl', 'EUR', '+31'],
  ['NC', 'New Caledonia', 'fr', 'XPF', '+687'],
  ['NZ', 'New Zealand', 'en', 'NZD', '+64'],
  ['NI', 'Nicaragua', 'es', 'NIO', '+505'],
  ['NE', 'Niger', 'fr', 'XOF', '+227'],
  ['NG', 'Nigeria', 'en', 'NGN', '+234'],
  ['NU', 'Niue', 'en', 'NZD', '+683'],
  ['NF', 'Norfolk Island', 'en', 'AUD', '+672'],
  ['MK', 'North Macedonia', null, 'MKD', '+389'],
  ['MP', 'Northern Mariana Islands', 'en', 'USD', '+1670'],
  ['NO', 'Norway', 'no', 'NOK', '+47'],
  ['OM', 'Oman', 'ar', 'OMR', '+968'],
  ['PK', 'Pakistan', null, 'PKR', '+92'],
  ['PW', 'Palau', 'en', 'USD', '+680'],
  ['PS', 'Palestine', 'ar', 'ILS', '+970'],
  ['PA', 'Panama', 'es', 'PAB', '+507'],
  ['PG', 'Papua New Guinea', 'en', 'PGK', '+675'],
  ['PY', 'Paraguay', 'es', 'PYG', '+595'],
  ['PE', 'Peru', 'es', 'PEN', '+51'],
  ['PH', 'Philippines', 'tl', 'PHP', '+63'],
  ['PN', 'Pitcairn', 'en', 'NZD', '+64'],
  ['PL', 'Poland', 'pl', 'PLN', '+48'],
  ['PT', 'Portugal', 'pt', 'EUR', '+351'],
  ['PR', 'Puerto Rico', 'es', 'USD', '+1787'],
  ['QA', 'Qatar', 'ar', 'QAR', '+974'],
  ['RE', 'Réunion', 'fr', 'EUR', '+262'],
  ['RO', 'Romania', 'ro', 'RON', '+40'],
  ['RU', 'Russia', 'ru', 'RUB', '+7'],
  ['RW', 'Rwanda', 'fr', 'RWF', '+250'],
  ['BL', 'Saint Barthélemy', 'fr', 'EUR', '+590'],
  ['SH', 'Saint Helena', 'en', 'SHP', '+290'],
  ['KN', 'Saint Kitts and Nevis', 'en', 'XCD', '+1869'],
  ['LC', 'Saint Lucia', 'en', 'XCD', '+1758'],
  ['MF', 'Saint Martin', 'fr', 'EUR', '+590'],
  ['PM', 'Saint Pierre and Miquelon', 'fr', 'EUR', '+508'],
  ['VC', 'Saint Vincent and the Grenadines', 'en', 'XCD', '+1784'],
  ['WS', 'Samoa', 'en', 'WST', '+685'],
  ['SM', 'San Marino', 'it', 'EUR', '+378'],
  ['ST', 'São Tomé and Príncipe', 'pt', 'STN', '+239'],
  ['SA', 'Saudi Arabia', 'ar', 'SAR', '+966'],
  ['SN', 'Senegal', 'fr', 'XOF', '+221'],
  ['RS', 'Serbia', 'sr', 'RSD', '+381'],
  ['SC', 'Seychelles', 'en', 'SCR', '+248'],
  ['SL', 'Sierra Leone', 'en', 'SLE', '+232'],
  ['SG', 'Singapore', 'en', 'SGD', '+65'],
  ['SX', 'Sint Maarten', 'nl', 'ANG', '+1721'],
  ['SK', 'Slovakia', 'sk', 'EUR', '+421'],
  ['SI', 'Slovenia', 'sl', 'EUR', '+386'],
  ['SB', 'Solomon Islands', 'en', 'SBD', '+677'],
  ['SO', 'Somalia', null, 'SOS', '+252'],
  ['ZA', 'South Africa', 'en', 'ZAR', '+27'],
  ['SS', 'South Sudan', 'en', 'SSP', '+211'],
  ['ES', 'Spain', 'es', 'EUR', '+34'],
  ['LK', 'Sri Lanka', null, 'LKR', '+94'],
  ['SD', 'Sudan', 'ar', 'SDG', '+249'],
  ['SR', 'Suriname', 'nl', 'SRD', '+597'],
  ['SE', 'Sweden', 'sv', 'SEK', '+46'],
  ['CH', 'Switzerland', 'de', 'CHF', '+41'],
  ['SY', 'Syria', 'ar', 'SYP', '+963'],
  ['TW', 'Taiwan', 'zh-TW', 'TWD', '+886'],
  ['TJ', 'Tajikistan', 'ru', 'TJS', '+992'],
  ['TZ', 'Tanzania', 'sw', 'TZS', '+255'],
  ['TH', 'Thailand', 'th', 'THB', '+66'],
  ['TL', 'Timor-Leste', 'pt', 'USD', '+670'],
  ['TG', 'Togo', 'fr', 'XOF', '+228'],
  ['TK', 'Tokelau', 'en', 'NZD', '+690'],
  ['TO', 'Tonga', 'en', 'TOP', '+676'],
  ['TT', 'Trinidad and Tobago', 'en', 'TTD', '+1868'],
  ['TN', 'Tunisia', 'ar', 'TND', '+216'],
  ['TR', 'Turkey', 'tr', 'TRY', '+90'],
  ['TM', 'Turkmenistan', 'ru', 'TMT', '+993'],
  ['TC', 'Turks and Caicos Islands', 'en', 'USD', '+1649'],
  ['TV', 'Tuvalu', 'en', 'AUD', '+688'],
  ['UG', 'Uganda', 'en', 'UGX', '+256'],
  ['UA', 'Ukraine', 'uk', 'UAH', '+380'],
  ['AE', 'United Arab Emirates', 'ar', 'AED', '+971'],
  ['GB', 'United Kingdom', 'en', 'GBP', '+44'],
  ['US', 'United States', 'en', 'USD', '+1'],
  ['UY', 'Uruguay', 'es', 'UYU', '+598'],
  ['UZ', 'Uzbekistan', 'ru', 'UZS', '+998'],
  ['VU', 'Vanuatu', 'en', 'VUV', '+678'],
  ['VA', 'Vatican City', 'it', 'EUR', '+379'],
  ['VE', 'Venezuela', 'es', 'VES', '+58'],
  ['VN', 'Vietnam', 'vi', 'VND', '+84'],
  ['VG', 'British Virgin Islands', 'en', 'USD', '+1284'],
  ['VI', 'U.S. Virgin Islands', 'en', 'USD', '+1340'],
  ['WF', 'Wallis and Futuna', 'fr', 'XPF', '+681'],
  ['EH', 'Western Sahara', 'ar', 'MAD', '+212'],
  ['YE', 'Yemen', 'ar', 'YER', '+967'],
  ['ZM', 'Zambia', 'en', 'ZMW', '+260'],
  ['ZW', 'Zimbabwe', 'en', 'ZWL', '+263'],
];

async function main() {
  requireRemoteDb();
  printDbBanner();

  const db = getDb();

  // Seed languages
  console.log(`\nSeeding ${LANGUAGES.length} languages...`);
  for (const [code, name, nativeName, direction] of LANGUAGES) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO languages (code, name, native_name, direction) VALUES (?, ?, ?, ?)',
      args: [code, name, nativeName, direction],
    });
  }
  console.log(`  ✓ ${LANGUAGES.length} languages seeded`);

  // Seed countries
  console.log(`Seeding ${COUNTRIES.length} countries...`);
  for (const [code, name, defaultLang, currency, phonePrefix] of COUNTRIES) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO countries (code, name, default_language, currency_code, phone_prefix) VALUES (?, ?, ?, ?, ?)',
      args: [code, name, defaultLang, currency, phonePrefix],
    });
  }
  console.log(`  ✓ ${COUNTRIES.length} countries seeded`);

  // Seed default legal documents (global, English)
  console.log('Seeding default legal documents...');
  const legalDocs = [
    {
      countryCode: 'GLO',
      type: 'terms',
      version: '1.0',
      url: '/en/terms',
      date: '2026-03-01',
    },
    {
      countryCode: 'GLO',
      type: 'privacy',
      version: '1.0',
      url: '/en/privacy',
      date: '2026-03-01',
    },
  ];

  for (const doc of legalDocs) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO legal_documents (id, country_code, document_type, version, content_url, effective_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [generateId(), doc.countryCode, doc.type, doc.version, doc.url, doc.date],
    });
  }
  console.log('  ✓ Default legal documents seeded');

  // Summary
  const langCount = await db.execute('SELECT COUNT(*) as count FROM languages');
  const countryCount = await db.execute('SELECT COUNT(*) as count FROM countries');
  const legalCount = await db.execute('SELECT COUNT(*) as count FROM legal_documents');

  console.log('\n📊 Reference data summary:');
  console.log(`  Languages: ${langCount.rows[0].count}`);
  console.log(`  Countries: ${countryCount.rows[0].count}`);
  console.log(`  Legal documents: ${legalCount.rows[0].count}`);
  console.log('\n✅ Done!\n');
}

main().catch((err) => {
  console.error('Seed reference data failed:', err);
  process.exit(1);
});
