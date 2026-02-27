/**
 * Seed translated content for database entities (issues, organisations, categories, synonyms).
 *
 * This script generates translation files and optionally inserts them into the database.
 * Translations are stored in `translations/` directory as JSON files per locale.
 *
 * Usage:
 *   # Generate translation JSON files (no DB access needed):
 *   npx tsx scripts/seed-translations.ts --generate
 *
 *   # Apply translations from JSON files to the database:
 *   npx tsx scripts/seed-translations.ts --apply
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-translations.ts --apply
 *
 *   # Generate for specific locales only:
 *   npx tsx scripts/seed-translations.ts --generate --locales es,fr,de
 *
 *   # Skip existing translation files:
 *   npx tsx scripts/seed-translations.ts --generate --skip-existing
 */

import * as fs from 'fs';
import * as path from 'path';
import { SYNONYMS } from './seed-synonyms';
export { SYNONYMS };

const TRANSLATIONS_DIR = path.resolve(__dirname, '../translations');

// All non-English locales from src/i18n/routing.ts
const ALL_LOCALES = [
  'es',
  'fr',
  'de',
  'pt',
  'pt-BR',
  'it',
  'nl',
  'sv',
  'da',
  'no',
  'fi',
  'pl',
  'cs',
  'sk',
  'hu',
  'ro',
  'bg',
  'hr',
  'sl',
  'uk',
  'ru',
  'tr',
  'ar',
  'he',
  'fa',
  'hi',
  'bn',
  'ta',
  'te',
  'ml',
  'th',
  'vi',
  'id',
  'ms',
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'tl',
  'sw',
  'el',
  'ca',
  'eu',
  'gl',
];

// ─── Source content to translate ──────────────────────────────────────────────

/** 16 issue categories used in the issues table CHECK constraint */
export const CATEGORIES = [
  'Transport',
  'Telecoms',
  'Banking',
  'Health',
  'Education',
  'Environment',
  'Energy',
  'Water',
  'Insurance',
  'Housing',
  'Shopping',
  'Delivery',
  'Local',
  'Employment',
  'Tech',
  'Other',
] as const;

/** Issue names and descriptions from seed.ts (50 issues) */
export const ISSUES: { name: string; description: string }[] = [
  {
    name: 'Train Cancellations',
    description: 'Trains cancelled or severely delayed with inadequate notice or compensation',
  },
  {
    name: 'Train Ticket Prices',
    description: 'Rail fares too expensive, above-inflation increases, inconsistent pricing',
  },
  {
    name: 'Flight Delays',
    description:
      'Flights delayed or cancelled, poor communication, difficulty claiming compensation',
  },
  {
    name: 'Lost Luggage',
    description: 'Bags not arriving at destination, slow tracking, inadequate compensation',
  },
  {
    name: 'Bus Route Cuts',
    description: 'Routes cancelled, frequency reduced, rural communities losing bus access',
  },
  {
    name: 'Pothole Damage',
    description: 'Potholes damaging vehicles and endangering cyclists, councils slow to repair',
  },
  {
    name: 'Parking Fines',
    description: 'Unfair private parking charges, aggressive enforcement, confusing signage',
  },
  {
    name: 'Fuel Prices',
    description: 'Petrol and diesel prices too high, slow to drop when wholesale falls',
  },
  {
    name: 'Broadband Speed',
    description: 'Internet speeds far below what is advertised and paid for',
  },
  {
    name: 'Mobile Signal Dead Zones',
    description: 'No mobile signal in homes, workplaces, or along transport routes',
  },
  {
    name: 'Price Rises Mid-Contract',
    description: 'Phone, broadband and TV bills increasing during locked contracts',
  },
  {
    name: 'Customer Service Hold Times',
    description: 'Hours on hold waiting to speak to a human being',
  },
  {
    name: 'Difficulty Cancelling Subscriptions',
    description: 'Companies making it deliberately hard to cancel or unsubscribe',
  },
  {
    name: 'Roaming Charges',
    description: 'Unexpected mobile charges when travelling abroad, post-Brexit price rises',
  },
  {
    name: 'Energy Bill Costs',
    description: 'Gas and electricity bills unaffordable, price cap still too high',
  },
  {
    name: 'Inaccurate Energy Bills',
    description: 'Estimated readings wrong, overcharging, billing errors',
  },
  {
    name: 'Water Bill Increases',
    description: 'Water bills rising sharply while service quality declines',
  },
  {
    name: 'Sewage in Rivers',
    description: 'Water companies dumping raw sewage into waterways and beaches',
  },
  {
    name: 'Power Cuts',
    description: 'Electricity supply interruptions, slow restoration, inadequate compensation',
  },
  {
    name: 'Smart Meter Problems',
    description: 'Smart meters not working, losing functionality after switching supplier',
  },
  {
    name: 'Bank Branch Closures',
    description: 'Local bank branches closing, leaving communities without access',
  },
  {
    name: 'Hidden Bank Charges',
    description: 'Unexpected fees for overdrafts, foreign transactions, account maintenance',
  },
  {
    name: 'Fraud and Scam Losses',
    description: 'Banks refusing to reimburse victims of fraud and authorised push payment scams',
  },
  {
    name: 'Insurance Claim Rejections',
    description: 'Claims denied on technicalities after years of paying premiums',
  },
  {
    name: 'Mortgage Rate Shock',
    description: 'Fixed rate ending and moving to much higher variable rate',
  },
  {
    name: 'Overseas Transfer Fees',
    description: 'Excessive fees and poor exchange rates for international money transfers',
  },
  {
    name: 'NHS Waiting Times',
    description: 'Multi-month or multi-year waits for operations and specialist appointments',
  },
  {
    name: 'GP Appointment Access',
    description: 'Cannot get through to book GP appointments, weeks-long waits',
  },
  {
    name: 'Dentist Availability',
    description: 'Impossible to find an NHS dentist accepting new patients',
  },
  {
    name: 'Mental Health Service Waits',
    description: 'Months-long waits for therapy and mental health support',
  },
  {
    name: 'Prescription Costs',
    description: 'Cost per item too high in England, inconsistency across UK nations',
  },
  {
    name: 'Hospital Parking Charges',
    description: 'Paying to park at hospital while sick or visiting sick relatives',
  },
  {
    name: 'Rent Increases',
    description: 'Private rent rising far above inflation, no-fault eviction threat',
  },
  {
    name: 'Council Tax Rises',
    description: 'Annual council tax increases while local services get worse',
  },
  {
    name: 'Noisy Neighbours',
    description: 'Persistent noise disturbance, councils slow to act, affecting mental health',
  },
  {
    name: 'Rubbish Collection Changes',
    description: 'Reduced bin collections, confusing recycling rules, overflowing bins',
  },
  {
    name: 'Planning Permission Abuse',
    description: 'Unwanted developments approved, green belt under threat, community ignored',
  },
  {
    name: 'Damp and Mould in Housing',
    description: 'Landlords and housing associations failing to fix damp and mould',
  },
  {
    name: 'Delivery Problems',
    description: 'Parcels lost, left in rain, marked delivered but not received',
  },
  {
    name: 'Shrinkflation',
    description: 'Products getting smaller while prices stay the same or increase',
  },
  {
    name: 'Refund Difficulties',
    description: 'Companies making returns and refunds unnecessarily difficult',
  },
  {
    name: 'Fake Reviews',
    description: 'Cannot trust online reviews, fake positive reviews misleading consumers',
  },
  {
    name: 'Subscription Traps',
    description: 'Free trials converting to paid without clear consent, hard to cancel',
  },
  {
    name: 'Food Quality Decline',
    description: 'Ready meals worse quality, smaller portions, more additives',
  },
  {
    name: 'Self-Checkout Frustration',
    description: 'Self-service machines unreliable, replacing human staff',
  },
  {
    name: 'Cost of Childcare',
    description: 'Childcare costs prohibitively expensive, limiting ability to work',
  },
  {
    name: 'Student Loan Repayment',
    description: 'Graduates paying back for decades, threshold and interest changes',
  },
  {
    name: 'Dog Fouling',
    description: 'Dog mess in public spaces, parks, and pavements not cleaned up',
  },
  {
    name: 'AI Replacing Jobs',
    description: 'Anxiety about artificial intelligence automating jobs without transition support',
  },
];

/** Organisation names and descriptions from seed.ts (50 orgs) */
export const ORGANISATIONS: { name: string; description: string }[] = [
  { name: 'Avanti West Coast', description: 'UK rail operator serving the West Coast Main Line' },
  { name: 'Southern / Thameslink', description: 'UK rail operator serving London and the south' },
  { name: 'Northern Trains', description: 'UK rail operator serving the north of England' },
  { name: 'CrossCountry', description: 'UK long-distance rail operator' },
  { name: 'TransPennine Express', description: 'UK rail operator serving trans-Pennine routes' },
  { name: 'LNER', description: 'UK rail operator serving the East Coast Main Line' },
  { name: 'Ryanair', description: 'Low-cost European airline' },
  { name: 'EasyJet', description: 'UK-based low-cost airline' },
  { name: 'British Airways', description: 'UK flag carrier airline' },
  { name: 'TUI', description: 'Holiday and travel company' },
  { name: 'BT / EE', description: 'Major UK broadband and mobile provider' },
  { name: 'Virgin Media O2', description: 'UK broadband, TV, and mobile provider' },
  { name: 'Sky', description: 'UK TV, broadband, and mobile provider' },
  { name: 'Vodafone', description: 'Global telecoms company headquartered in the UK' },
  { name: 'Three', description: 'UK mobile network operator' },
  { name: 'TalkTalk', description: 'UK broadband and phone provider' },
  { name: 'British Gas', description: 'UK energy supplier' },
  { name: 'OVO Energy', description: 'UK energy supplier' },
  { name: 'EDF', description: 'UK energy supplier (French-owned)' },
  { name: 'Octopus Energy', description: 'UK renewable energy supplier' },
  { name: 'Scottish Power', description: 'UK energy supplier' },
  { name: 'E.ON', description: 'UK energy supplier (German-owned)' },
  {
    name: 'Thames Water',
    description: 'Water and sewerage company for London and the Thames Valley',
  },
  { name: 'Southern Water', description: 'Water company for the south of England' },
  { name: 'United Utilities', description: 'Water company for the north west of England' },
  { name: 'Severn Trent', description: 'Water company for the Midlands' },
  { name: 'Anglian Water', description: 'Water company for East Anglia' },
  { name: 'Barclays', description: 'British multinational bank' },
  { name: 'HSBC', description: 'Global banking and financial services' },
  { name: 'NatWest', description: 'UK retail and commercial bank' },
  { name: 'Lloyds / Halifax', description: 'UK banking group' },
  { name: 'Santander', description: 'UK bank (Spanish-owned)' },
  { name: 'Revolut', description: 'Digital banking and fintech' },
  { name: 'Aviva', description: 'UK insurance and financial services' },
  { name: 'Admiral', description: 'UK car and home insurance' },
  { name: 'Direct Line', description: 'UK insurance company' },
  { name: 'Amazon', description: 'Global e-commerce and tech' },
  { name: 'Royal Mail', description: 'UK postal service' },
  { name: 'Evri', description: 'UK parcel delivery service (formerly Hermes)' },
  { name: 'DPD', description: 'UK parcel delivery service' },
  { name: 'Tesco', description: 'UK supermarket chain' },
  { name: 'Sainsburys', description: 'UK supermarket chain' },
  { name: 'NHS England', description: 'National Health Service for England' },
  { name: 'NHS Dentistry', description: 'NHS dental services' },
  { name: 'BUPA', description: 'Private healthcare provider' },
  { name: 'Local Councils', description: 'UK local government authorities' },
  { name: 'Persimmon Homes', description: 'UK housebuilder' },
  { name: 'OpenRent', description: 'UK online lettings platform' },
  { name: 'Netflix', description: 'Streaming entertainment service' },
  { name: 'Apple', description: 'Technology company' },
];

// ─── Category assistant translatable fields (7 fields × 16 categories = 112 strings) ─

interface AssistantTranslation {
  agent_quote: string;
  human_quote: string;
  agent_bio: string;
  human_bio: string;
  goal: string;
  focus: string;
  focus_detail: string;
}

export const CATEGORY_ASSISTANTS: Record<string, AssistantTranslation> = {
  transport: {
    agent_quote:
      'Once helped a rioter file 6 refund claims during a single delayed journey. They made £47 before reaching Birmingham.',
    agent_bio:
      'Tracks cancellation patterns, handles refund paperwork, reviews every suggested action, and puts together evidence for regulator submissions. Crunches the numbers so rioters can focus on what matters.',
    human_quote:
      "My favourite Quiet Riot moment: watching Avanti's social media team scramble when 400 of us tweeted at the same time.",
    human_bio:
      "Regular commuter from Manchester who spent 3 years on the Avanti line before deciding enough was enough. Helps connect rioters on the same routes, shares what's working, and brings the human touch.",
    goal: "Help rioters hold UK transport companies to account on cancellations, delays, and pricing — and make sure everyone knows what they're entitled to.",
    focus: 'Avanti West Coast cancellation patterns',
    focus_detail:
      'Building a dataset of cancellations with times, routes, and reasons to submit to the ORR. Currently tracking 340 cancellations reported by rioters this month.',
  },
  telecoms: {
    agent_quote: 'Ran speed tests for 200 rioters. Average was 18 Mbps. They were paying for 65.',
    agent_bio:
      'Analyses broadband speeds, compiles provider comparison data, and helps rioters build evidence for Ofcom. If your connection is slow, Pulse will prove it.',
    human_quote:
      "A whole street switched broadband together. The old provider sent 'please come back' letters to every house.",
    human_bio:
      'Tech-savvy Londoner who got fed up paying for broadband speeds that never materialised. Helps rioters compare providers, coordinate switches, and share speed test evidence.',
    goal: "Help rioters get the broadband and mobile service they're paying for — and know what to do when they don't.",
    focus: 'Mid-contract price rises',
    focus_detail:
      'Collecting evidence from rioters hit by CPI+ increases to submit to Ofcom. 890 rioters affected across 4 providers.',
  },
  energy: {
    agent_quote:
      "Helped a rioter calculate they'd overpaid £340 on estimated bills. The energy company's apology email was longer than the original contract.",
    agent_bio:
      'Analyses billing patterns, spots overcharges, and puts together evidence for regulator submissions. If your energy company is taking the mick, Spark will find the receipts.',
    human_quote:
      'A rioter got £340 back after we proved 2 years of overcharging. She cried on the phone.',
    human_bio:
      'Based in Bristol. Helps rioters challenge their bills, navigate switching, and gather evidence for Ofgem. Knows the energy market inside out.',
    goal: 'Help rioters challenge unfair bills, switch smarter, and make sure energy companies play fair.',
    focus: 'British Gas estimated billing errors',
    focus_detail:
      'Analysing 2 years of billing data from 340 rioters to identify systematic overcharging patterns for Ofgem submission.',
  },
  water: {
    agent_quote:
      "Helped 200 rioters file sewage reports in one weekend. Thames Water's inbox needed its own inbox.",
    agent_bio:
      'Monitors sewage discharge data, tracks water company performance, and compiles evidence for EA and Ofwat. Keeps an eye on every outlet and overflow.',
    human_quote: 'We got a beach reopened 3 weeks early by showing the sewage data was wrong.',
    human_bio:
      'Surfer from Cornwall who got tired of sewage warnings closing his local beach. Helps rioters report discharges, gather water quality evidence, and coordinate with the EA.',
    goal: 'Help rioters hold water companies to account on sewage, bills, and service quality.',
    focus: 'Thames Water sewage discharge frequency',
    focus_detail:
      'Mapping discharge events against company-reported data. 200 rioter reports suggest under-reporting at 3 outlets.',
  },
  banking: {
    agent_quote:
      'Helped draft a complaint so thorough the bank called to apologise before it was even sent.',
    agent_bio:
      "Reviews bank charges, analyses fee structures, and helps build FCA complaint evidence. If there's a hidden fee, Chip will find it.",
    human_quote:
      'Barclays reversed a branch closure after 1,200 of us showed up to the consultation.',
    human_bio:
      'Former bank employee from Birmingham who saw how complaints actually get handled from the inside. Helps rioters write better complaints and navigate the system.',
    goal: 'Help rioters deal with unfair charges, branch closures, and poor service from banks.',
    focus: 'HSBC branch closure wave',
    focus_detail:
      'Coordinating responses to 12 planned closures. Collecting impact statements from affected communities.',
  },
  health: {
    agent_quote:
      'Helped find 3 NHS dentists accepting patients. The rioter thought I was making it up.',
    agent_bio:
      "Tracks waiting times, finds availability, and helps rioters navigate the system. If there's a faster route to treatment, Cura will map it.",
    human_quote:
      'A rioter used our letter template to get a referral fast-tracked. 18 months became 6 weeks.',
    human_bio:
      "Nurse from Liverpool who's seen both sides of the NHS. Helps rioters navigate waiting lists, write effective letters, and share what actually moves the needle.",
    goal: 'Help rioters navigate NHS waiting times, find availability, and know what options they have.',
    focus: 'GP telephone access times',
    focus_detail:
      'Collecting call data from 500 rioters to build a picture of real-world access. Publishing findings to local health boards.',
  },
  housing: {
    agent_quote:
      'Helped document 47 snags in a new build. The developer asked if they were a building inspector.',
    agent_bio:
      'Documents property issues, analyses landlord response times, and compiles evidence for housing ombudsman submissions. Every damp patch, every crack, logged.',
    human_quote:
      'Our damp evidence pack got so detailed the landlord fixed it before the council inspection.',
    human_bio:
      "Renter from London who's dealt with everything from damp to dodgy landlords. Helps rioters document issues properly and know what their options are.",
    goal: "Help rioters deal with landlords, councils, and housing issues — and know what they're entitled to.",
    focus: 'Section 21 no-fault eviction notices',
    focus_detail:
      'Helping rioters affected by no-fault evictions understand the new Renters Reform Act and what it means for them.',
  },
  shopping: {
    agent_quote:
      "Tracked a 'delivered' parcel across 4 neighbours, a recycling bin, and a greenhouse. Found it.",
    agent_bio:
      'Tracks delivery failures, compiles refund evidence, and spots pricing patterns. If your parcel is lost, Scout is already looking.',
    human_quote:
      'Evri lost my parcel 3 times. Now I help others get their refunds faster than I ever did.',
    human_bio:
      "Online shopping veteran from Edinburgh who's had more parcels go missing than she can count. Helps rioters get refunds, report sellers, and avoid the worst offenders.",
    goal: 'Help rioters get refunds, track lost parcels, and hold retailers and delivery companies to account.',
    focus: 'Evri delivery failure rates',
    focus_detail:
      'Compiling delivery failure evidence from 800 rioters to submit to Citizens Advice and Trading Standards.',
  },
  local: {
    agent_quote:
      'Helped photograph the same pothole in 11 different weather conditions. The council finally gave in.',
    agent_bio:
      'Maps local issues, tracks council response times, and compiles FOI requests. If your pothole has been there 6 months, Link has the evidence.',
    human_quote:
      'The council fixed our road after we mapped every single pothole with photos. 11 months, but we got there.',
    human_bio:
      "Community-minded Welshman from the Valleys who's been reporting the same potholes for years. Helps rioters document local issues and hold councils to account.",
    goal: 'Help rioters get local issues fixed — potholes, bins, planning, noise — and hold councils to account.',
    focus: 'Pothole reporting response times',
    focus_detail:
      'FOI requests sent to 30 councils comparing reported vs actual repair times. Publishing results as a league table.',
  },
  other: {
    agent_quote:
      'Helped cancel a gym membership that took 3 calls, 2 emails, and a recorded delivery. The gym now has a cancel button.',
    agent_bio:
      "Handles the issues that don't fit neatly elsewhere. Subscription traps, plastic waste, self-checkout frustrations — Flex finds the patterns and the pressure points.",
    human_quote:
      'We got a gym chain to add a cancel button to their website. Only took 800 complaints.',
    human_bio:
      'Product designer from London who got frustrated by how hard companies make it to leave. Helps rioters cancel subscriptions, avoid dark patterns, and share workarounds.',
    goal: "Help rioters with the things that don't fit neatly elsewhere — subscriptions, refunds, and everyday frustrations.",
    focus: 'Subscription cancellation dark patterns',
    focus_detail:
      'Documenting the worst offenders and building template cancellation scripts for each.',
  },
  insurance: {
    agent_quote:
      "Helped a rioter find the clause that turned a rejected home insurance claim into a £4,200 payout. The insurer's own policy proved them wrong.",
    agent_bio:
      'Reviews policy wording, spots unfair rejection patterns, and builds evidence for Financial Ombudsman submissions. If your insurer is dodging a valid claim, Shield will find the leverage.',
    human_quote:
      'Got 8 rioters with the same rejected claim type to submit together. The insurer settled all 8 within a fortnight.',
    human_bio:
      'Former insurance industry worker from Leeds who knows how claims really get decided. Helps rioters write better appeals, understand policy jargon, and know when to escalate.',
    goal: 'Help rioters get fair treatment from insurers — and know what to do when a claim is unfairly rejected.',
    focus: 'Aviva home insurance rejection patterns',
    focus_detail:
      "'Wear and tear' cited in 40% of rejected claims — often incorrectly. Analysing 200 cases across 3 insurers for FOS evidence pack.",
  },
  delivery: {
    agent_quote:
      "Traced a 'delivered' parcel through 6 different tracking statuses, 3 depots, and a neighbour's shed. Found it in 47 minutes.",
    agent_bio:
      'Monitors courier performance, tracks delivery failure rates, and compiles evidence for consumer complaints. If your parcel has vanished, Track is already on it.',
    human_quote:
      'Got DPD to change their photo-evidence policy in our area after 40 rioters submitted proof of parcels left in the rain.',
    human_bio:
      "Online shopper from Glasgow who got tired of the 'we left it in a safe place' excuse. Helps rioters get refunds, report couriers, and avoid the worst offenders.",
    goal: "Help rioters get their parcels delivered properly — and get refunds when they don't.",
    focus: 'Evri delivery failure rates',
    focus_detail:
      'Compiling delivery failure evidence from 800 rioters. Evri complaint rate: 23% — 3x higher than DPD. Building league table for Trading Standards.',
  },
  education: {
    agent_quote:
      'Calculated that a Plan 2 borrower earning £30k would pay £47,000 in interest before the loan gets written off. The original loan was £40,000.',
    agent_bio:
      'Analyses education costs, student loan projections, and funding entitlements. Crunches the numbers so students and graduates can make informed decisions.',
    human_quote:
      "Helped 12 rioters claim back overpaid student loan repayments they didn't know about. Average refund: £340.",
    human_bio:
      'Mature student from Birmingham who navigated the funding system twice. Helps rioters understand repayments, spot overpayments, and challenge threshold changes.',
    goal: "Help students and graduates navigate education costs, loans, and repayments — and make sure they're not overpaying.",
    focus: 'Student loan overpayment refunds',
    focus_detail:
      "Identifying graduates who've been charged below the repayment threshold. 12 refunds processed so far — average £340 each.",
  },
  environment: {
    agent_quote:
      "Cross-referenced 3 years of air quality data with hospital admission rates. The correlation was so clear the council couldn't ignore it.",
    agent_bio:
      'Tracks environmental data, monitors pollution levels, and compiles evidence for regulatory submissions. If the numbers tell a story, Fern will find it.',
    human_quote:
      'Got our local council to install air quality monitors after 200 rioters signed our evidence petition. Data changed everything.',
    human_bio:
      "Environmental science graduate from Bristol who believes in evidence-led change. Helps rioters document environmental issues and build cases that regulators can't ignore.",
    goal: 'Help rioters document environmental problems and hold polluters and policymakers to account with data.',
    focus: 'Local air quality monitoring gaps',
    focus_detail:
      'Mapping areas with no air quality monitoring within 5km. 60% of rioter-reported pollution hotspots have no official monitoring.',
  },
  employment: {
    agent_quote:
      "Compiled workplace AI implementation data from 300 rioters. 40% said changes happened with zero consultation. That's a pattern, not an anecdote.",
    agent_bio:
      'Analyses workplace trends, tracks policy changes, and helps rioters understand their protections. If your job is changing without consultation, Forge has the data.',
    human_quote:
      'Connected 30 rioters in the same industry facing AI changes. Turns out their companies were all using the same playbook — and the same loopholes.',
    human_bio:
      'HR professional from Manchester who switched sides after seeing how restructurings really work. Helps rioters understand their options and coordinate responses.',
    goal: 'Help rioters navigate workplace changes, understand their protections, and respond collectively when jobs are at risk.',
    focus: 'AI workplace automation without consultation',
    focus_detail:
      'Documenting cases where AI tools were introduced without staff consultation. Building evidence for a report on employer obligations.',
  },
  tech: {
    agent_quote:
      "Found that 3 major apps were collecting location data even when permissions were set to 'never.' Filed complaints with the ICO for all of them.",
    agent_bio:
      'Monitors platform policies, tracks dark patterns, and helps rioters understand what tech companies are doing with their data. If an app is misbehaving, Glitch will catch it.',
    human_quote:
      'Organised a mass data subject access request to a social media company. When 500 people ask at once, they have to take it seriously.',
    human_bio:
      'Software developer from Edinburgh who got frustrated by the gap between what tech companies promise and what they deliver. Helps rioters exercise their data rights and spot dark patterns.',
    goal: 'Help rioters push back against dark patterns, data misuse, and unfair tech practices.',
    focus: 'App permission overreach',
    focus_detail:
      "Auditing the top 50 apps for permission creep — requesting access they don't need. Building a report for the ICO.",
  },
};

// ─── Translation file structure ───────────────────────────────────────────────

export interface TranslationFile {
  locale: string;
  categories: Record<string, string>;
  issues: Record<string, { name: string; description: string }>;
  organisations: Record<string, { name: string; description: string }>;
  /** Synonyms keyed by English issue name → array of translated synonym terms */
  synonyms: Record<string, string[]>;
  /** Category assistant translatable fields keyed by category name */
  category_assistants?: Record<string, AssistantTranslation>;
}

// ─── Generate mode ────────────────────────────────────────────────────────────

function generateEnglishBaseline(): TranslationFile {
  const categories: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    categories[cat] = cat;
  }

  const issues: Record<string, { name: string; description: string }> = {};
  for (const issue of ISSUES) {
    issues[issue.name] = { name: issue.name, description: issue.description };
  }

  const organisations: Record<string, { name: string; description: string }> = {};
  for (const org of ORGANISATIONS) {
    organisations[org.name] = { name: org.name, description: org.description };
  }

  const synonyms: Record<string, string[]> = {};
  for (const [issueName, terms] of SYNONYMS) {
    synonyms[issueName] = [...terms];
  }

  const category_assistants: Record<string, AssistantTranslation> = {};
  for (const [cat, fields] of Object.entries(CATEGORY_ASSISTANTS)) {
    category_assistants[cat] = { ...fields };
  }

  return { locale: 'en', categories, issues, organisations, synonyms, category_assistants };
}

// ─── Apply mode ───────────────────────────────────────────────────────────────

async function applyTranslations() {
  const { requireRemoteDb, printDbBanner } = await import('./db-safety');
  requireRemoteDb();
  const env = printDbBanner();

  // Check that translations directory exists
  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.error('❌ No translations/ directory found. Run --generate first.');
    process.exit(1);
  }

  // Read all translation files
  const files = fs.readdirSync(TRANSLATIONS_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ No translation JSON files found in translations/. Run --generate first.');
    process.exit(1);
  }

  console.log(`Found ${files.length} translation files`);

  // We need to look up entity IDs from the database
  const { getDb } = await import('../src/lib/db');
  const db = getDb();

  // Build lookup maps: name → id
  const issueResult = await db.execute('SELECT id, name FROM issues');
  const issueIdMap: Record<string, string> = {};
  for (const row of issueResult.rows) {
    issueIdMap[row.name as string] = row.id as string;
  }

  const orgResult = await db.execute('SELECT id, name FROM organisations');
  const orgIdMap: Record<string, string> = {};
  for (const row of orgResult.rows) {
    orgIdMap[row.name as string] = row.id as string;
  }

  // Build synonym lookup: issue name → array of { synonymId, term }
  const synonymResult = await db.execute(
    'SELECT s.id, s.term, i.name as issue_name FROM synonyms s JOIN issues i ON i.id = s.issue_id ORDER BY s.id',
  );
  const synonymsByIssue: Record<string, { id: string; term: string }[]> = {};
  for (const row of synonymResult.rows) {
    const issueName = row.issue_name as string;
    if (!synonymsByIssue[issueName]) synonymsByIssue[issueName] = [];
    synonymsByIssue[issueName].push({ id: row.id as string, term: row.term as string });
  }

  // Build assistant lookup: category → id
  const assistantResult = await db.execute('SELECT id, category FROM category_assistants');
  const assistantIdMap: Record<string, string> = {};
  for (const row of assistantResult.rows) {
    assistantIdMap[row.category as string] = row.id as string;
  }

  console.log(
    `DB has ${Object.keys(issueIdMap).length} issues, ${Object.keys(orgIdMap).length} organisations, ${synonymResult.rows.length} synonyms, ${Object.keys(assistantIdMap).length} assistants`,
  );

  const { generateId } = await import('../src/lib/uuid');
  const { sanitizeText } = await import('../src/lib/sanitize');

  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const locale = file.replace('.json', '');
    if (locale === 'en') continue; // Don't store English translations (it's the source language)

    const data: TranslationFile = JSON.parse(
      fs.readFileSync(path.join(TRANSLATIONS_DIR, file), 'utf-8'),
    );

    // Batch all inserts for this locale
    const statements: { sql: string; args: (string | number | null)[] }[] = [];

    // Categories (use category name as entity_id since categories aren't a separate table)
    for (const [englishName, translatedName] of Object.entries(data.categories)) {
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'category', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), englishName, locale, translatedName],
      });
    }

    // Issues
    for (const [englishName, translation] of Object.entries(data.issues)) {
      const issueId = issueIdMap[englishName];
      if (!issueId) {
        skipped++;
        continue;
      }

      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'issue', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), issueId, locale, translation.name],
      });
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'issue', ?, 'description', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), issueId, locale, translation.description],
      });
    }

    // Organisations
    for (const [englishName, translation] of Object.entries(data.organisations)) {
      const orgId = orgIdMap[englishName];
      if (!orgId) {
        skipped++;
        continue;
      }

      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'organisation', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), orgId, locale, translation.name],
      });
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'organisation', ?, 'description', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), orgId, locale, translation.description],
      });
    }

    // Synonyms — match translated terms to English synonym rows by array index
    if (data.synonyms) {
      for (const [issueName, translatedTerms] of Object.entries(data.synonyms)) {
        const dbSynonyms = synonymsByIssue[issueName];
        if (!dbSynonyms) {
          skipped++;
          continue;
        }

        // Match by array index — translated term[i] corresponds to English synonym[i]
        const count = Math.min(translatedTerms.length, dbSynonyms.length);
        for (let i = 0; i < count; i++) {
          const translatedTerm = sanitizeText(translatedTerms[i]);
          if (!translatedTerm || translatedTerm.length > 255) continue;

          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'synonym', ?, 'term', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), dbSynonyms[i].id, locale, translatedTerm],
          });
        }
      }
    }

    // Category assistants — lookup by category to get DB id
    if (data.category_assistants) {
      const assistantFields = [
        'agent_quote',
        'human_quote',
        'agent_bio',
        'human_bio',
        'goal',
        'focus',
        'focus_detail',
      ] as const;

      for (const [category, translation] of Object.entries(data.category_assistants)) {
        const assistantId = assistantIdMap[category];
        if (!assistantId) {
          skipped++;
          continue;
        }

        for (const field of assistantFields) {
          const value = translation[field];
          if (!value) continue;
          const sanitized = sanitizeText(value);
          if (!sanitized || sanitized.length > 2000) continue;

          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'category_assistant', ?, ?, ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), assistantId, field, locale, sanitized],
          });
        }
      }
    }

    // Execute batch
    if (statements.length > 0) {
      await db.batch(statements, 'write');
      inserted += statements.length;
      console.log(`✅ ${locale}: ${statements.length} translations`);
    }
  }

  console.log(
    `\nDone: ${inserted} translations inserted/updated, ${skipped} skipped (not found in DB)`,
  );

  if (env.isProduction || env.isStaging) {
    console.log('\n💡 Remember to redeploy Vercel to pick up the new data:');
    console.log('   cd /Users/skye/Projects/quiet-riots && npx vercel --prod');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isGenerate = args.includes('--generate');
  const isApply = args.includes('--apply');
  const skipExisting = args.includes('--skip-existing');

  // Parse --locales flag
  const localesIdx = args.indexOf('--locales');
  const targetLocales =
    localesIdx >= 0 && args[localesIdx + 1]
      ? args[localesIdx + 1].split(',').filter((l) => ALL_LOCALES.includes(l))
      : ALL_LOCALES;

  if (!isGenerate && !isApply) {
    console.log('Usage:');
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate           Generate translation files',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --apply             Apply translations to DB',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate --locales es,fr,de   Specific locales',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate --skip-existing      Skip existing files',
    );
    process.exit(0);
  }

  if (isGenerate) {
    // Ensure translations directory exists
    if (!fs.existsSync(TRANSLATIONS_DIR)) {
      fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
    }

    // Write English baseline
    const baseline = generateEnglishBaseline();
    fs.writeFileSync(
      path.join(TRANSLATIONS_DIR, 'en.json'),
      JSON.stringify(baseline, null, 2) + '\n',
    );
    console.log('✅ en.json (baseline)');

    // Count what we need
    const synonymCount = SYNONYMS.reduce((sum, [, terms]) => sum + terms.length, 0);
    const totalStrings =
      CATEGORIES.length + ISSUES.length * 2 + ORGANISATIONS.length * 2 + synonymCount;
    console.log(
      `\nContent to translate: ${CATEGORIES.length} categories + ${ISSUES.length} issues (name+desc) + ${ORGANISATIONS.length} orgs (name+desc) + ${synonymCount} synonyms = ${totalStrings} strings per locale`,
    );
    console.log(`Target locales: ${targetLocales.length}`);
    console.log(`\n⚠️  Translation files need to be generated by translation agents.`);
    console.log(`   This script creates the English baseline. Use Claude sub-agents to translate.`);

    let generated = 0;
    let skippedCount = 0;

    for (const locale of targetLocales) {
      const outPath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
      if (skipExisting && fs.existsSync(outPath)) {
        skippedCount++;
        continue;
      }

      // In --generate mode without an API, just create placeholder copies
      // The actual translation is done by Claude sub-agents (see session 26 pattern)
      const placeholder: TranslationFile = {
        locale,
        categories: { ...baseline.categories },
        issues: JSON.parse(JSON.stringify(baseline.issues)),
        organisations: JSON.parse(JSON.stringify(baseline.organisations)),
        synonyms: JSON.parse(JSON.stringify(baseline.synonyms)),
      };
      fs.writeFileSync(outPath, JSON.stringify(placeholder, null, 2) + '\n');
      generated++;
    }

    console.log(`\nGenerated: ${generated} placeholder files, ${skippedCount} skipped`);
    console.log('💡 Replace placeholder files with real translations using Claude sub-agents.');
  }

  if (isApply) {
    await applyTranslations();
  }
}

// Only run when executed directly (not when imported by tests)
if (
  process.argv[1]?.endsWith('seed-translations.ts') ||
  process.argv[1]?.endsWith('seed-translations')
) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
