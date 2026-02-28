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
import { NON_EN_LOCALES } from '../src/i18n/locales';
import { perRiotCopy } from './seed-assistants';
export { SYNONYMS };

const TRANSLATIONS_DIR = path.resolve(__dirname, '../translations');

// All non-English locales from the single source of truth
const ALL_LOCALES: string[] = [...NON_EN_LOCALES];

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

/** Issue names and descriptions — 51 issues (49 from seed.ts + 2 added via Setup Guide) */
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
  {
    name: 'Mobile Data Charges',
    description:
      'Unexpected or excessive charges for mobile data usage beyond monthly allowances',
  },
  {
    name: 'Fly Tipping',
    description:
      'Illegal dumping of waste in public spaces, damaging communities and costing councils millions to clean up',
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

// ─── Actions source data (39 unique title/description pairs) ─────────────────

export const ACTIONS: { title: string; description: string }[] = [
  // Train Cancellations
  { title: 'Claim delay repay compensation', description: 'You are legally entitled to compensation for delays over 15 or 30 minutes depending on operator' },
  { title: 'Write to your MP about rail performance', description: 'Template letter to send to your MP highlighting the impact of cancellations' },
  { title: 'Share your cancellation story', description: 'Help others understand the real impact — post your experience' },
  { title: 'Suggest improvements to timetabling', description: 'What would actually fix this? Share your ideas' },
  // Flight Delays
  { title: 'Claim EU261 / UK261 compensation', description: 'Airlines must pay £220-520 for delays over 3 hours on qualifying flights' },
  { title: 'Document everything at the airport', description: 'Photograph departure boards, keep boarding passes, note times' },
  { title: 'Rate your airline experience', description: 'Help future passengers know what to expect' },
  // Broadband Speed
  { title: 'Run and save speed test evidence', description: 'Use Ofcom broadband checker to document your actual speeds vs advertised' },
  { title: 'Complain to Ofcom', description: 'Report your broadband provider for not delivering advertised speeds' },
  { title: 'Switch to a better provider', description: 'Compare broadband deals in your area and switch' },
  { title: "Map your street's broadband speeds", description: 'Organise neighbours to all test and share — collective data is powerful' },
  // Energy Bill Costs
  { title: 'Check if you are on the cheapest tariff', description: 'Use Ofgem accredited comparison sites to check' },
  { title: 'Apply for the Warm Home Discount', description: 'You may be eligible for £150 off your electricity bill' },
  { title: 'Share energy saving tips', description: 'What actually works to cut bills? Share with the community' },
  { title: 'Propose a community energy buying scheme', description: 'Bulk buying power as a group could get better rates' },
  // Sewage in Rivers
  { title: 'Report a sewage discharge', description: 'Use the Environment Agency hotline to report sewage pollution' },
  { title: 'Check your local river quality', description: 'See real-time discharge data for your area' },
  { title: 'Sign the petition for tougher regulation', description: 'Join thousands demanding change' },
  { title: 'Organise a local river clean-up', description: 'Bring people together to clean up and raise awareness' },
  // NHS Waiting Times
  { title: 'Check your right to choose', description: 'You have the right to choose which hospital you are referred to — shorter waits may be available' },
  { title: 'Contact PALS at your hospital', description: 'Patient Advice and Liaison Service can help escalate your case' },
  { title: 'Share your waiting story', description: 'Real stories create pressure for change — your experience matters' },
  // GP Appointment Access
  { title: 'Know your rights to a GP appointment', description: 'Practices must offer urgent appointments — know what to ask for' },
  { title: 'Complain to NHS England about GP access', description: 'Formal complaints create a paper trail that drives change' },
  // Delivery Problems
  { title: 'Claim compensation for lost parcel', description: 'The sender is responsible — contact them, not the courier' },
  { title: 'Film your delivery location', description: 'Video evidence of where parcels are left helps with claims' },
  { title: 'Rate your delivery driver', description: 'Help identify patterns — good and bad' },
  // Hidden Bank Charges
  { title: 'Check if you can reclaim charges', description: 'You may be able to reclaim unfair overdraft charges' },
  { title: 'Switch to a fee-free bank account', description: 'Compare accounts with no monthly fees or hidden charges' },
  // Parking Fines
  { title: 'Appeal your parking charge', description: 'Most private parking charges can be successfully appealed' },
  { title: 'Check if the signage was adequate', description: 'Unclear signs are grounds for appeal — photograph everything' },
  // Rent Increases
  { title: 'Know your rights on rent increases', description: 'Your landlord must follow proper legal process' },
  { title: 'Contact Shelter for free advice', description: 'Free housing advice helpline' },
  { title: 'Share your rent increase story', description: 'Collective stories drive policy change' },
  // Student Loan Repayment
  { title: 'Check your repayment plan', description: "Make sure you're on the right plan" },
  { title: 'Campaign for reform', description: 'Write to your MP about student finance' },
  // Generic (applied to 38 issues)
  { title: 'Share your experience', description: 'Tell others about your story — collective voices drive change' },
  { title: 'Write to your representative', description: 'Use our template to demand change from your MP or councillor' },
  { title: 'Welcome new members', description: 'Help newcomers feel at home in the community' },
];

// ─── Expert profiles source data (12 experts, name stays untranslated) ───────

export const EXPERT_PROFILES: { name: string; role: string; speciality: string; achievement: string }[] = [
  { name: 'Carlos M.', role: 'Translator', speciality: 'ES/EN Translation', achievement: 'Translated 47 issues across languages' },
  { name: 'Dr. Patel', role: 'Rail Rights Expert', speciality: 'Legal guidance', achievement: '12 years experience in transport law' },
  { name: 'Yuki T.', role: 'Media & Comms Lead', speciality: 'JP/EN · Video campaigns', achievement: 'Running the cancellation evidence campaign' },
  { name: 'Tom H.', role: 'Network Engineer', speciality: 'Broadband infrastructure', achievement: 'Helped 200+ members optimise speeds' },
  { name: 'Lisa R.', role: 'Consumer Rights Advisor', speciality: 'Ofcom complaints', achievement: 'Won 34 compensation claims' },
  { name: 'Dr. Chen', role: 'Healthcare Policy', speciality: 'NHS reform research', achievement: 'Published 3 policy papers on wait times' },
  { name: 'Maria G.', role: 'Community Organiser', speciality: 'Campaign coordination', achievement: 'Organised 12 local health rallies' },
  { name: 'Raj P.', role: 'Data Analyst', speciality: 'Wait time mapping', achievement: 'Built the national wait time tracker' },
  { name: 'Prof. Johnson', role: 'Environmental Scientist', speciality: 'Water quality analysis', achievement: 'Published 5 papers on river pollution' },
  { name: 'Aisha K.', role: 'Campaign Lead', speciality: 'River clean-ups', achievement: 'Organised 30 clean-up events' },
  { name: 'Sophie M.', role: 'Financial Advisor', speciality: 'Bank fee analysis', achievement: 'Exposed hidden charges at 5 major banks' },
  { name: 'Jake P.', role: 'Student Finance Expert', speciality: 'Loan repayment advice', achievement: 'Helped 1,000+ graduates save money' },
];

// ─── Riot reels source data (17 curated reels, keyed by video ID) ────────────

export const RIOT_REELS: { video_id: string; title: string; caption: string }[] = [
  { video_id: 'xsxkHfbbApk', title: 'The Famous Train Carriage Sketch | At Last the 1948 Show', caption: 'An irritating man ruins a perfectly good British Rail journey' },
  { video_id: 'MXEgkM9eBts', title: 'Big Train - Eagle Line', caption: 'A train company so bad they made a sketch show about it' },
  { video_id: 'LZ259Jx8MQY', title: 'Pushing Dial-up Modems Further Than We EVER Thought Possible', caption: 'When 668kbps feels like a win, UK broadband peaked in 1999' },
  { video_id: 'Y_2kFv1QWzU', title: 'Why suffer broadband rage? New unbreakable BT hybrid broadband', caption: 'Every Brit who has screamed at a buffering wheel, this is your biopic' },
  { video_id: 'eT_k9JG0IN4', title: 'Cassetteboy vs The Tories May 2022', caption: 'We would rather let our people freeze than tax our energy companies' },
  { video_id: '3Wtx1HhDfDs', title: 'British Gas shares advert 1986', caption: 'If you see Sid, tell him gas costs four grand a year now' },
  { video_id: 'aZo6vKS0ybI', title: 'BREAKING NEWS: Nish Kumar exposes sewage pollution by water companies', caption: 'Welcome to the beach — hazmat suits and turd ice cream included' },
  { video_id: 'uK7DRJx9nbU', title: 'Cassetteboy vs Jeremy Hunt', caption: "Hunt's own words remixed to YMCA — the NHS roast we deserved" },
  { video_id: 'R9biM_ZfIdo', title: 'George Agdgdgwngo Series 1 Compilation - Fonejacker', caption: 'He just needs your sort code for the steam cleaning' },
  { video_id: 'zegud4x4zL0', title: 'Waiting for a Package - Foil Arms and Hog', caption: 'Your package is out for delivery. It will stay out for delivery.' },
  { video_id: 'VaaankRbMkY', title: 'Lee Evans-Parcel Force', caption: 'Parcelforce! The most stressful word in the English language.' },
  { video_id: '0n_Ty_72Qds', title: 'Little Britain - Computer says no', caption: 'The spiritual ancestor of every self-checkout machine' },
  { video_id: '6_L_MpgMCMA', title: "Compilation Of Michael's Best Jokes About Planes And Airports | Michael McIntyre", caption: 'Your delayed Ryanair flight, but at least Michael McIntyre gets it' },
  { video_id: 'e01EAS0GUa0', title: 'UK Pothole Epidemic - Resurface Our Roads', caption: "Britain's roads: where craters come with free suspension tests" },
  { video_id: 'kAG39jKi0lI', title: 'My blackberry is not working - BBC', caption: 'When your network provider says the problem is at your end' },
  { video_id: '27aVPqpnL7Y', title: 'Trigger Happy TV - The big phone guy', caption: 'UK coverage so good you need a phone the size of a suitcase' },
  { video_id: 'w2A8q3XIhu0', title: "Hold music used to sound better. Here's why.", caption: 'We have all suffered. Now we know why it hurts.' },
];

// ─── Action initiatives source data (8 initiatives) ─────────────────────────

export const ACTION_INITIATIVES: { title: string; description: string }[] = [
  { title: 'Avanti Legal Review', description: 'Commission an independent legal review of Avanti West Coast franchise obligations and compensation policies' },
  { title: 'Season Ticket Refund Toolkit', description: 'Build a free toolkit to help commuters claim back unused season ticket days' },
  { title: 'Brighton Water Testing', description: 'Commission independent water quality testing at 12 Brighton beach sites' },
  { title: 'River Testing Kits', description: 'Purchase portable water testing kits for 50 volunteer river monitors across England' },
  { title: 'Community Speed Map App', description: 'Commission development of a community broadband speed testing and mapping app' },
  { title: 'GP Access FOI Requests', description: 'Commission Freedom of Information requests to every NHS trust on GP appointment statistics' },
  { title: 'Airline Compensation Guide', description: 'Create a comprehensive free guide to claiming EU261/UK261 flight delay compensation' },
  { title: 'Smart Meter Audit', description: 'Commission an independent audit of smart meter accuracy across 500 households' },
];

// ─── Translation file structure ───────────────────────────────────────────────

export interface TranslationFile {
  locale: string;
  categories: Record<string, string>;
  issues: Record<string, { name: string; description: string }>;
  organisations: Record<string, { name: string; description: string }>;
  /** Synonyms keyed by English issue name → array of translated synonym terms */
  synonyms: Record<string, string[]>;
  /** Category assistant translatable fields keyed by category name */
  category_assistants: Record<string, AssistantTranslation>;
  /** Action title + description keyed by English title */
  actions: Record<string, { title: string; description: string }>;
  /** Expert profile translatable fields keyed by English name (name itself stays untranslated) */
  expert_profiles: Record<string, { role: string; speciality: string; achievement: string }>;
  /** Riot reel translatable fields keyed by YouTube video ID (curated only) */
  riot_reels: Record<string, { title: string; caption: string }>;
  /** Action initiative title + description keyed by English title */
  action_initiatives: Record<string, { title: string; description: string }>;
  /** Per-riot assistant copy keyed by issue name_match */
  issue_per_riot: Record<
    string,
    { agent_helps: string; human_helps: string; agent_focus: string; human_focus: string }
  >;
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

/**
 * Deep-merge baseline (English) into existing (translated) section.
 * - New top-level keys from baseline are added with English values (placeholders).
 * - Existing keys are preserved (their values are real translations).
 * - Within an existing key, new nested fields from baseline are added.
 * - Removed keys (in baseline but not in existing) are cleaned up? No — we add new, keep existing, ignore removed.
 */
function mergeSection<T extends Record<string, unknown>>(
  baseline: T | undefined,
  existing: T | undefined,
): T {
  if (!baseline) return (existing || {}) as T;
  if (!existing) return JSON.parse(JSON.stringify(baseline));

  const result = JSON.parse(JSON.stringify(existing)) as Record<string, unknown>;

  for (const [key, baselineValue] of Object.entries(baseline)) {
    if (!(key in result)) {
      // New key — add the English placeholder
      result[key] = JSON.parse(JSON.stringify(baselineValue));
    } else if (
      typeof baselineValue === 'object' &&
      baselineValue !== null &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      // Existing object key — merge nested fields (add new fields, keep existing)
      const existingObj = result[key] as Record<string, unknown>;
      for (const [field, fieldValue] of Object.entries(baselineValue as Record<string, unknown>)) {
        if (!(field in existingObj)) {
          existingObj[field] = fieldValue;
        }
      }
    }
    // Existing scalar key — keep the existing (translated) value
  }

  return result as T;
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

  const actions: Record<string, { title: string; description: string }> = {};
  for (const action of ACTIONS) {
    actions[action.title] = { title: action.title, description: action.description };
  }

  const expert_profiles: Record<string, { role: string; speciality: string; achievement: string }> = {};
  for (const expert of EXPERT_PROFILES) {
    expert_profiles[expert.name] = { role: expert.role, speciality: expert.speciality, achievement: expert.achievement };
  }

  const riot_reels: Record<string, { title: string; caption: string }> = {};
  for (const reel of RIOT_REELS) {
    riot_reels[reel.video_id] = { title: reel.title, caption: reel.caption };
  }

  const action_initiatives: Record<string, { title: string; description: string }> = {};
  for (const initiative of ACTION_INITIATIVES) {
    action_initiatives[initiative.title] = { title: initiative.title, description: initiative.description };
  }

  const issue_per_riot: Record<string, { agent_helps: string; human_helps: string; agent_focus: string; human_focus: string }> = {};
  for (const copy of perRiotCopy) {
    issue_per_riot[copy.name_match] = {
      agent_helps: copy.agent_helps,
      human_helps: copy.human_helps,
      agent_focus: copy.agent_focus,
      human_focus: copy.human_focus,
    };
  }

  return {
    locale: 'en',
    categories,
    issues,
    organisations,
    synonyms,
    category_assistants,
    actions,
    expert_profiles,
    riot_reels,
    action_initiatives,
    issue_per_riot,
  };
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

  // Build action lookup: title → id (actions have duplicate titles across issues, use first)
  const actionResult = await db.execute('SELECT id, title FROM actions');
  const actionIdMap: Record<string, string> = {};
  for (const row of actionResult.rows) {
    const title = row.title as string;
    if (!actionIdMap[title]) {
      actionIdMap[title] = row.id as string;
    }
  }

  // Build expert lookup: name → id
  const expertResult = await db.execute('SELECT id, name FROM expert_profiles');
  const expertIdMap: Record<string, string> = {};
  for (const row of expertResult.rows) {
    expertIdMap[row.name as string] = row.id as string;
  }

  // Build reel lookup: youtube_video_id → id (curated reels only)
  const reelResult = await db.execute(
    "SELECT id, youtube_video_id FROM riot_reels WHERE source = 'curated'",
  );
  const reelIdMap: Record<string, string> = {};
  for (const row of reelResult.rows) {
    reelIdMap[row.youtube_video_id as string] = row.id as string;
  }

  // Build action initiative lookup: title → id
  const aiResult = await db.execute('SELECT id, title FROM action_initiatives');
  const aiIdMap: Record<string, string> = {};
  for (const row of aiResult.rows) {
    aiIdMap[row.title as string] = row.id as string;
  }

  console.log(
    `DB has ${Object.keys(issueIdMap).length} issues, ${Object.keys(orgIdMap).length} organisations, ${synonymResult.rows.length} synonyms, ${Object.keys(assistantIdMap).length} assistants, ${Object.keys(actionIdMap).length} actions, ${Object.keys(expertIdMap).length} experts, ${Object.keys(reelIdMap).length} reels, ${Object.keys(aiIdMap).length} action initiatives`,
  );

  const { generateId } = await import('../src/lib/uuid');
  const { sanitizeTranslation } = await import('../src/lib/sanitize');

  // Parse CLI flags for apply mode
  const applyArgs = process.argv.slice(2);
  const isStrict = applyArgs.includes('--strict');
  const isVerbose = applyArgs.includes('--verbose');

  // Track skips with full detail
  interface SkipEntry {
    locale: string;
    section: string;
    key: string;
    reason: string;
  }
  const skipLog: SkipEntry[] = [];

  function trackSkip(locale: string, section: string, key: string, reason: string) {
    skipLog.push({ locale, section, key, reason });
    if (isVerbose) {
      console.log(`  ⚠️  SKIP ${locale}/${section}: "${key}" — ${reason}`);
    }
  }

  let inserted = 0;

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
      const sanitized = sanitizeTranslation(translatedName, 255);
      if (!sanitized) continue;
      statements.push({
        sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (?, 'category', ?, 'name', ?, ?, 'machine')
              ON CONFLICT(entity_type, entity_id, field, language_code)
              DO UPDATE SET value = excluded.value, source = excluded.source`,
        args: [generateId(), englishName, locale, sanitized],
      });
    }

    // Issues
    for (const [englishName, translation] of Object.entries(data.issues)) {
      const issueId = issueIdMap[englishName];
      if (!issueId) {
        trackSkip(locale, 'issues', englishName, 'no matching issue in DB');
        continue;
      }

      const sanitizedName = sanitizeTranslation(translation.name, 255);
      const sanitizedDesc = sanitizeTranslation(translation.description, 2000);
      if (sanitizedName) {
        statements.push({
          sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                VALUES (?, 'issue', ?, 'name', ?, ?, 'machine')
                ON CONFLICT(entity_type, entity_id, field, language_code)
                DO UPDATE SET value = excluded.value, source = excluded.source`,
          args: [generateId(), issueId, locale, sanitizedName],
        });
      }
      if (sanitizedDesc) {
        statements.push({
          sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                VALUES (?, 'issue', ?, 'description', ?, ?, 'machine')
                ON CONFLICT(entity_type, entity_id, field, language_code)
                DO UPDATE SET value = excluded.value, source = excluded.source`,
          args: [generateId(), issueId, locale, sanitizedDesc],
        });
      }
    }

    // Organisations
    for (const [englishName, translation] of Object.entries(data.organisations)) {
      const orgId = orgIdMap[englishName];
      if (!orgId) {
        trackSkip(locale, 'organisations', englishName, 'no matching organisation in DB');
        continue;
      }

      const sanitizedOrgName = sanitizeTranslation(translation.name, 255);
      const sanitizedOrgDesc = sanitizeTranslation(translation.description, 2000);
      if (sanitizedOrgName) {
        statements.push({
          sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                VALUES (?, 'organisation', ?, 'name', ?, ?, 'machine')
                ON CONFLICT(entity_type, entity_id, field, language_code)
                DO UPDATE SET value = excluded.value, source = excluded.source`,
          args: [generateId(), orgId, locale, sanitizedOrgName],
        });
      }
      if (sanitizedOrgDesc) {
        statements.push({
          sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                VALUES (?, 'organisation', ?, 'description', ?, ?, 'machine')
                ON CONFLICT(entity_type, entity_id, field, language_code)
                DO UPDATE SET value = excluded.value, source = excluded.source`,
          args: [generateId(), orgId, locale, sanitizedOrgDesc],
        });
      }
    }

    // Synonyms — match translated terms to English synonym rows by array index
    if (data.synonyms) {
      for (const [issueName, translatedTerms] of Object.entries(data.synonyms)) {
        const dbSynonyms = synonymsByIssue[issueName];
        if (!dbSynonyms) {
          trackSkip(locale, 'synonyms', issueName, 'no synonyms found for issue in DB');
          continue;
        }

        // Match by array index — translated term[i] corresponds to English synonym[i]
        const count = Math.min(translatedTerms.length, dbSynonyms.length);
        for (let i = 0; i < count; i++) {
          const translatedTerm = sanitizeTranslation(translatedTerms[i], 255);
          if (!translatedTerm) continue;

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
          trackSkip(locale, 'category_assistants', category, 'no matching assistant in DB');
          continue;
        }

        for (const field of assistantFields) {
          const value = translation[field];
          if (!value) continue;
          const sanitized = sanitizeTranslation(value, 2000);
          if (!sanitized) continue;

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

    // Actions — lookup by title to get DB id
    if (data.actions) {
      for (const [englishTitle, translation] of Object.entries(data.actions)) {
        const actionId = actionIdMap[englishTitle];
        if (!actionId) {
          trackSkip(locale, 'actions', englishTitle, 'no matching action in DB');
          continue;
        }

        const sanitizedTitle = sanitizeTranslation(translation.title, 255);
        const sanitizedDesc = sanitizeTranslation(translation.description, 2000);
        if (sanitizedTitle) {
          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'action', ?, 'title', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), actionId, locale, sanitizedTitle],
          });
        }
        if (sanitizedDesc) {
          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'action', ?, 'description', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), actionId, locale, sanitizedDesc],
          });
        }
      }
    }

    // Expert profiles — lookup by name to get DB id
    if (data.expert_profiles) {
      const expertFields = ['role', 'speciality', 'achievement'] as const;
      for (const [expertName, translation] of Object.entries(data.expert_profiles)) {
        const expertId = expertIdMap[expertName];
        if (!expertId) {
          trackSkip(locale, 'expert_profiles', expertName, 'no matching expert in DB');
          continue;
        }

        for (const field of expertFields) {
          const value = translation[field];
          if (!value) continue;
          const sanitized = sanitizeTranslation(value, 2000);
          if (!sanitized) continue;

          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'expert_profile', ?, ?, ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), expertId, field, locale, sanitized],
          });
        }
      }
    }

    // Riot reels — lookup by video_id to get DB id
    if (data.riot_reels) {
      for (const [videoId, translation] of Object.entries(data.riot_reels)) {
        const reelId = reelIdMap[videoId];
        if (!reelId) {
          trackSkip(locale, 'riot_reels', videoId, 'no matching reel in DB');
          continue;
        }

        const sanitizedTitle = sanitizeTranslation(translation.title, 255);
        const sanitizedCaption = sanitizeTranslation(translation.caption, 2000);
        if (sanitizedTitle) {
          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'riot_reel', ?, 'title', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), reelId, locale, sanitizedTitle],
          });
        }
        if (sanitizedCaption) {
          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'riot_reel', ?, 'caption', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), reelId, locale, sanitizedCaption],
          });
        }
      }
    }

    // Action initiatives — lookup by title to get DB id
    if (data.action_initiatives) {
      for (const [englishTitle, translation] of Object.entries(data.action_initiatives)) {
        const aiId = aiIdMap[englishTitle];
        if (!aiId) {
          trackSkip(locale, 'action_initiatives', englishTitle, 'no matching initiative in DB');
          continue;
        }

        const sanitizedAiTitle = sanitizeTranslation(translation.title, 255);
        const sanitizedAiDesc = sanitizeTranslation(translation.description, 2000);
        if (sanitizedAiTitle) {
          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'action_initiative', ?, 'title', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), aiId, locale, sanitizedAiTitle],
          });
        }
        if (sanitizedAiDesc) {
          statements.push({
            sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                  VALUES (?, 'action_initiative', ?, 'description', ?, ?, 'machine')
                  ON CONFLICT(entity_type, entity_id, field, language_code)
                  DO UPDATE SET value = excluded.value, source = excluded.source`,
            args: [generateId(), aiId, locale, sanitizedAiDesc],
          });
        }
      }
    }

    // Per-riot assistant copy — uses name_match to find issue IDs
    // These are stored as entity_type='issue' with fields agent_helps, human_helps, agent_focus, human_focus
    if (data.issue_per_riot) {
      // Build reverse lookup: translated issue name → English issue name
      // This handles the case where the translate script produces translated keys
      // (e.g. "Cancelaciones de Trenes" instead of "Train Cancellations")
      const translatedNameToEnglish: Record<string, string> = {};
      if (data.issues) {
        for (const [englishName, translation] of Object.entries(data.issues)) {
          if (translation.name && translation.name !== englishName) {
            translatedNameToEnglish[translation.name] = englishName;
          }
        }
      }

      const perRiotFields = ['agent_helps', 'human_helps', 'agent_focus', 'human_focus'] as const;
      for (const [nameMatch, translation] of Object.entries(data.issue_per_riot)) {
        // name_match can be exact name, translated name, or LIKE pattern (e.g. '%Bus%Cuts')
        // For exact names, use direct lookup; for patterns, match against known issue names
        let matchedIssueIds: string[] = [];
        if (nameMatch.includes('%')) {
          // LIKE pattern — match against all issue names
          const regex = new RegExp('^' + nameMatch.replace(/%/g, '.*') + '$', 'i');
          for (const [issueName, issueId] of Object.entries(issueIdMap)) {
            if (regex.test(issueName)) {
              matchedIssueIds.push(issueId);
            }
          }
        } else {
          // Try English name first, then translated name → English name fallback
          let issueId = issueIdMap[nameMatch];
          if (!issueId) {
            const englishName = translatedNameToEnglish[nameMatch];
            if (englishName) issueId = issueIdMap[englishName];
          }
          if (issueId) matchedIssueIds = [issueId];
        }

        if (matchedIssueIds.length === 0) {
          trackSkip(locale, 'issue_per_riot', nameMatch, 'no matching issue in DB');
          continue;
        }

        for (const issueId of matchedIssueIds) {
          for (const field of perRiotFields) {
            const value = translation[field];
            if (!value) continue;
            const sanitized = sanitizeTranslation(value, 2000);
            if (!sanitized) continue;

            statements.push({
              sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
                    VALUES (?, 'issue', ?, ?, ?, ?, 'machine')
                    ON CONFLICT(entity_type, entity_id, field, language_code)
                    DO UPDATE SET value = excluded.value, source = excluded.source`,
              args: [generateId(), issueId, field, locale, sanitized],
            });
          }
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

  // ─── Summary report ───
  const totalSkipped = skipLog.length;
  console.log(
    `\nDone: ${inserted} translations inserted/updated, ${totalSkipped} skipped`,
  );

  if (totalSkipped > 0) {
    // Group skips by section
    const skipsBySection: Record<string, SkipEntry[]> = {};
    for (const entry of skipLog) {
      if (!skipsBySection[entry.section]) skipsBySection[entry.section] = [];
      skipsBySection[entry.section].push(entry);
    }

    console.log('\n── Skip Summary ──');
    for (const [section, entries] of Object.entries(skipsBySection)) {
      const uniqueKeys = Array.from(new Set(entries.map((e) => e.key)));
      const uniqueLocales = Array.from(new Set(entries.map((e) => e.locale)));
      console.log(
        `  ${section}: ${entries.length} skipped across ${uniqueLocales.length} locales`,
      );
      for (const key of uniqueKeys.slice(0, 5)) {
        const reason = entries.find((e) => e.key === key)!.reason;
        console.log(`    "${key}" — ${reason}`);
      }
      if (uniqueKeys.length > 5) {
        console.log(`    ... and ${uniqueKeys.length - 5} more`);
      }
    }
  }

  if (isStrict && totalSkipped > 0) {
    console.error(
      `\n❌ --strict mode: ${totalSkipped} entries were skipped. Fix translation files and retry.`,
    );
    process.exit(1);
  }

  if (env.isProduction || env.isStaging) {
    console.log('\n💡 Remember to redeploy Vercel to pick up the new data:');
    console.log('   cd /Users/skye/Projects/quiet-riots && npx vercel --prod');
  }

  // Run coverage verification after apply
  await verifyTranslationCoverage(db, isStrict);
}

// ─── Post-apply coverage verification ────────────────────────────────────────

async function verifyTranslationCoverage(
  db: { execute: (sql: string) => Promise<{ rows: Record<string, unknown>[] }> },
  strict: boolean = false,
) {
  console.log('\n── Translation Coverage Report ──');

  const result = await db.execute(
    'SELECT entity_type, language_code, COUNT(*) as cnt FROM translations GROUP BY entity_type, language_code ORDER BY entity_type, language_code',
  );

  // Group by entity_type
  const coverage: Record<string, Record<string, number>> = {};
  for (const row of result.rows) {
    const entityType = String(row.entity_type);
    const langCode = String(row.language_code);
    const count = Number(row.cnt);
    if (!coverage[entityType]) coverage[entityType] = {};
    coverage[entityType][langCode] = count;
  }

  const entityTypes = Object.keys(coverage).sort();
  if (entityTypes.length === 0) {
    console.log('  No translations found in DB.');
    return;
  }

  // Print summary table
  console.log(
    `  ${'Entity Type'.padEnd(22)} ${'Locales'.padStart(7)} ${'Min'.padStart(5)} ${'Max'.padStart(5)} ${'Avg'.padStart(7)}`,
  );
  console.log(`  ${'─'.repeat(22)} ${'─'.repeat(7)} ${'─'.repeat(5)} ${'─'.repeat(5)} ${'─'.repeat(7)}`);

  let hasGaps = false;

  for (const entityType of entityTypes) {
    const localeCounts = Object.values(coverage[entityType]);
    const localeCount = localeCounts.length;
    const min = Math.min(...localeCounts);
    const max = Math.max(...localeCounts);
    const avg = (localeCounts.reduce((a, b) => a + b, 0) / localeCount).toFixed(1);

    const flag = min < max ? ' ⚠️' : '';
    if (min < max) hasGaps = true;

    console.log(
      `  ${entityType.padEnd(22)} ${String(localeCount).padStart(7)} ${String(min).padStart(5)} ${String(max).padStart(5)} ${avg.padStart(7)}${flag}`,
    );
  }

  if (hasGaps) {
    console.log('\n  ⚠️  Some entity types have uneven coverage across locales.');
    console.log('     Run with --verbose to investigate, or check skip summary above.');
  } else {
    console.log('\n  ✅ All entity types have consistent coverage across locales.');
  }

  if (strict && hasGaps) {
    console.error('\n❌ --strict mode: translation coverage gaps detected.');
    process.exit(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isGenerate = args.includes('--generate');
  const isApply = args.includes('--apply');
  const isVerify = args.includes('--verify');
  const skipExisting = args.includes('--skip-existing');

  // Parse --locales flag
  const localesIdx = args.indexOf('--locales');
  const targetLocales =
    localesIdx >= 0 && args[localesIdx + 1]
      ? args[localesIdx + 1].split(',').filter((l) => ALL_LOCALES.includes(l))
      : ALL_LOCALES;

  if (!isGenerate && !isApply && !isVerify) {
    console.log('Usage:');
    console.log(
      '  npx tsx scripts/seed-translations.ts --generate           Generate translation files',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --apply             Apply translations to DB',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --apply --strict    Fail if any entries are skipped',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --apply --verbose   Print each skip as it happens',
    );
    console.log(
      '  npx tsx scripts/seed-translations.ts --verify            Check DB translation coverage',
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
      CATEGORIES.length +
      ISSUES.length * 2 +
      ORGANISATIONS.length * 2 +
      synonymCount +
      ACTIONS.length * 2 +
      EXPERT_PROFILES.length * 3 +
      RIOT_REELS.length * 2 +
      ACTION_INITIATIVES.length * 2;
    console.log(
      `\nContent to translate: ${CATEGORIES.length} categories + ${ISSUES.length} issues + ${ORGANISATIONS.length} orgs + ${synonymCount} synonyms + ${ACTIONS.length} actions + ${EXPERT_PROFILES.length} experts + ${RIOT_REELS.length} reels + ${ACTION_INITIATIVES.length} initiatives = ${totalStrings} strings per locale`,
    );
    console.log(`Target locales: ${targetLocales.length}`);
    console.log(`\n⚠️  Translation files need to be generated by translation agents.`);
    console.log(`   This script creates the English baseline. Use Claude sub-agents to translate.`);

    let generated = 0;
    let skippedCount = 0;

    for (const locale of targetLocales) {
      const outPath = path.join(TRANSLATIONS_DIR, `${locale}.json`);

      // IMPORTANT: Merge new keys into existing files — never overwrite translated values.
      // Previously this created a full English placeholder, destroying any existing translations.
      const existing: TranslationFile | null = fs.existsSync(outPath)
        ? JSON.parse(fs.readFileSync(outPath, 'utf-8'))
        : null;

      if (skipExisting && existing) {
        skippedCount++;
        continue;
      }

      // Deep-merge: for each section, add keys from baseline that don't exist in the locale file.
      // Never overwrite a value that already differs from English (it's a real translation).
      const merged: TranslationFile = {
        locale,
        categories: mergeSection(baseline.categories, existing?.categories),
        issues: mergeSection(baseline.issues, existing?.issues),
        organisations: mergeSection(baseline.organisations, existing?.organisations),
        synonyms: mergeSection(baseline.synonyms, existing?.synonyms),
        category_assistants: mergeSection(baseline.category_assistants, existing?.category_assistants),
        actions: mergeSection(baseline.actions, existing?.actions),
        expert_profiles: mergeSection(baseline.expert_profiles, existing?.expert_profiles),
        riot_reels: mergeSection(baseline.riot_reels, existing?.riot_reels),
        action_initiatives: mergeSection(baseline.action_initiatives, existing?.action_initiatives),
        issue_per_riot: mergeSection(baseline.issue_per_riot, existing?.issue_per_riot),
      };
      fs.writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n');
      generated++;
    }

    console.log(`\nGenerated: ${generated} files (merged with existing), ${skippedCount} skipped`);
    console.log('💡 Run npm run translate to translate new/changed keys.');
  }

  if (isApply) {
    await applyTranslations();
  }

  if (isVerify && !isApply) {
    // Standalone verification (--apply already runs verification at the end)
    const { requireRemoteDb, printDbBanner } = await import('./db-safety');
    requireRemoteDb();
    printDbBanner();
    const { getDb } = await import('../src/lib/db');
    const db = getDb();
    const strict = args.includes('--strict');
    await verifyTranslationCoverage(db, strict);
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
