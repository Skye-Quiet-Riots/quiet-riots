/**
 * Seed category assistants, assistant activity, and per-riot assistant copy.
 *
 * Usage:
 *   npx tsx scripts/seed-assistants.ts            — run for real
 *   npx tsx scripts/seed-assistants.ts --dry-run   — preview without writing
 *
 * NOTE: tsx does not load .env.local automatically. Pass env vars explicitly
 * or source them before running, e.g.:
 *   source .env.local && npx tsx scripts/seed-assistants.ts
 */

import * as readline from 'node:readline/promises';
import { getDb } from '../src/lib/db';
import { generateId } from '../src/lib/uuid';

// ─────────────────────────────────────────────────────────────────
// 1. CATEGORY ASSISTANTS — 16 pairs
// ─────────────────────────────────────────────────────────────────

interface CategoryAssistant {
  category: string;
  agent_name: string;
  agent_icon: string;
  agent_quote: string;
  agent_bio: string;
  agent_gradient_start: string;
  agent_gradient_end: string;
  human_name: string;
  human_icon: string;
  human_quote: string;
  human_bio: string;
  human_gradient_start: string;
  human_gradient_end: string;
  goal: string;
  focus: string;
  focus_detail: string;
  profile_url: string;
}

const categoryAssistants: CategoryAssistant[] = [
  // ── 1. Transport — Jett & Bex ──
  {
    category: 'Transport',
    agent_name: 'Jett',
    agent_icon: '🛩️',
    agent_quote:
      'Once helped a rioter file 6 refund claims during a single delayed journey. They made £47 before reaching Birmingham.',
    agent_bio:
      'Tracks cancellation patterns, handles refund paperwork, reviews every suggested action, and puts together evidence for regulator submissions. Crunches the numbers so rioters can focus on what matters.',
    agent_gradient_start: '#8b5cf6',
    agent_gradient_end: '#7c3aed',
    human_name: 'Bex',
    human_icon: '👩🏻',
    human_quote:
      "My favourite Quiet Riot moment: watching Avanti's social media team scramble when 400 of us tweeted at the same time.",
    human_bio:
      "Regular commuter from Manchester who spent 3 years on the Avanti line before deciding enough was enough. Helps connect rioters on the same routes, shares what's working, and brings the human touch.",
    human_gradient_start: '#3b82f6',
    human_gradient_end: '#1d4ed8',
    goal: "Help rioters hold UK transport companies to account on cancellations, delays, and pricing — and make sure everyone knows what they're entitled to.",
    focus: 'Avanti West Coast cancellation patterns',
    focus_detail:
      'Building a dataset of cancellations with times, routes, and reasons to submit to the ORR. Currently tracking 340 cancellations reported by rioters this month.',
    profile_url: '/assistants/transport',
  },
  // ── 2. Telecoms — Pulse & Jin ──
  {
    category: 'Telecoms',
    agent_name: 'Pulse',
    agent_icon: '💜',
    agent_quote:
      'Ran speed tests for 200 rioters. Average was 18 Mbps. They were paying for 65.',
    agent_bio:
      'Analyses broadband speeds, compiles provider comparison data, and helps rioters build evidence for Ofcom. If your connection is slow, Pulse will prove it.',
    agent_gradient_start: '#a855f7',
    agent_gradient_end: '#7c3aed',
    human_name: 'Jin',
    human_icon: '🧑🏻',
    human_quote:
      "A whole street switched broadband together. The old provider sent 'please come back' letters to every house.",
    human_bio:
      'Tech-savvy Londoner who got fed up paying for broadband speeds that never materialised. Helps rioters compare providers, coordinate switches, and share speed test evidence.',
    human_gradient_start: '#06b6d4',
    human_gradient_end: '#0891b2',
    goal: "Help rioters get the broadband and mobile service they're paying for — and know what to do when they don't.",
    focus: 'Mid-contract price rises',
    focus_detail:
      'Collecting evidence from rioters hit by CPI+ increases to submit to Ofcom. 890 rioters affected across 4 providers.',
    profile_url: '/assistants/telecoms',
  },
  // ── 3. Energy — Spark & Dee ──
  {
    category: 'Energy',
    agent_name: 'Spark',
    agent_icon: '⚡',
    agent_quote:
      "Helped a rioter calculate they'd overpaid £340 on estimated bills. The energy company's apology email was longer than the original contract.",
    agent_bio:
      'Analyses billing patterns, spots overcharges, and puts together evidence for regulator submissions. If your energy company is taking the mick, Spark will find the receipts.',
    agent_gradient_start: '#f59e0b',
    agent_gradient_end: '#d97706',
    human_name: 'Dee',
    human_icon: '👩🏽‍🦱',
    human_quote:
      'A rioter got £340 back after we proved 2 years of overcharging. She cried on the phone.',
    human_bio:
      'Based in Bristol. Helps rioters challenge their bills, navigate switching, and gather evidence for Ofgem. Knows the energy market inside out.',
    human_gradient_start: '#ef4444',
    human_gradient_end: '#dc2626',
    goal: 'Help rioters challenge unfair bills, switch smarter, and make sure energy companies play fair.',
    focus: 'British Gas estimated billing errors',
    focus_detail:
      'Analysing 2 years of billing data from 340 rioters to identify systematic overcharging patterns for Ofgem submission.',
    profile_url: '/assistants/energy',
  },
  // ── 4. Water — Flow & Nia ──
  {
    category: 'Water',
    agent_name: 'Flow',
    agent_icon: '💧',
    agent_quote:
      "Helped 200 rioters file sewage reports in one weekend. Thames Water's inbox needed its own inbox.",
    agent_bio:
      'Monitors sewage discharge data, tracks water company performance, and compiles evidence for EA and Ofwat. Keeps an eye on every outlet and overflow.',
    agent_gradient_start: '#06b6d4',
    agent_gradient_end: '#0891b2',
    human_name: 'Nia',
    human_icon: '👩🏿',
    human_quote:
      'We got a beach reopened 3 weeks early by showing the sewage data was wrong.',
    human_bio:
      'Surfer from Cornwall who got tired of sewage warnings closing his local beach. Helps rioters report discharges, gather water quality evidence, and coordinate with the EA.',
    human_gradient_start: '#10b981',
    human_gradient_end: '#059669',
    goal: 'Help rioters hold water companies to account on sewage, bills, and service quality.',
    focus: 'Thames Water sewage discharge frequency',
    focus_detail:
      'Mapping discharge events against company-reported data. 200 rioter reports suggest under-reporting at 3 outlets.',
    profile_url: '/assistants/water',
  },
  // ── 5. Banking — Chip & Roz ──
  {
    category: 'Banking',
    agent_name: 'Chip',
    agent_icon: '🏦',
    agent_quote:
      'Helped draft a complaint so thorough the bank called to apologise before it was even sent.',
    agent_bio:
      "Reviews bank charges, analyses fee structures, and helps build FCA complaint evidence. If there's a hidden fee, Chip will find it.",
    agent_gradient_start: '#10b981',
    agent_gradient_end: '#059669',
    human_name: 'Roz',
    human_icon: '👩🏻‍🦰',
    human_quote:
      'Barclays reversed a branch closure after 1,200 of us showed up to the consultation.',
    human_bio:
      'Former bank employee from Birmingham who saw how complaints actually get handled from the inside. Helps rioters write better complaints and navigate the system.',
    human_gradient_start: '#f59e0b',
    human_gradient_end: '#d97706',
    goal: 'Help rioters deal with unfair charges, branch closures, and poor service from banks.',
    focus: 'HSBC branch closure wave',
    focus_detail:
      'Coordinating responses to 12 planned closures. Collecting impact statements from affected communities.',
    profile_url: '/assistants/banking',
  },
  // ── 6. Health — Cura & Kai ──
  {
    category: 'Health',
    agent_name: 'Cura',
    agent_icon: '🏥',
    agent_quote:
      'Helped find 3 NHS dentists accepting patients. The rioter thought I was making it up.',
    agent_bio:
      "Tracks waiting times, finds availability, and helps rioters navigate the system. If there's a faster route to treatment, Cura will map it.",
    agent_gradient_start: '#ec4899',
    agent_gradient_end: '#db2777',
    human_name: 'Kai',
    human_icon: '🧑🏽',
    human_quote:
      'A rioter used our letter template to get a referral fast-tracked. 18 months became 6 weeks.',
    human_bio:
      "Nurse from Liverpool who's seen both sides of the NHS. Helps rioters navigate waiting lists, write effective letters, and share what actually moves the needle.",
    human_gradient_start: '#6366f1',
    human_gradient_end: '#4f46e5',
    goal: 'Help rioters navigate NHS waiting times, find availability, and know what options they have.',
    focus: 'GP telephone access times',
    focus_detail:
      'Collecting call data from 500 rioters to build a picture of real-world access. Publishing findings to local health boards.',
    profile_url: '/assistants/health',
  },
  // ── 7. Housing — Nest & Liv ──
  {
    category: 'Housing',
    agent_name: 'Nest',
    agent_icon: '🏠',
    agent_quote:
      'Helped document 47 snags in a new build. The developer asked if they were a building inspector.',
    agent_bio:
      'Documents property issues, analyses landlord response times, and compiles evidence for housing ombudsman submissions. Every damp patch, every crack, logged.',
    agent_gradient_start: '#f59e0b',
    agent_gradient_end: '#d97706',
    human_name: 'Liv',
    human_icon: '👩🏻',
    human_quote:
      'Our damp evidence pack got so detailed the landlord fixed it before the council inspection.',
    human_bio:
      "Renter from London who's dealt with everything from damp to dodgy landlords. Helps rioters document issues properly and know what their options are.",
    human_gradient_start: '#8b5cf6',
    human_gradient_end: '#7c3aed',
    goal: "Help rioters deal with landlords, councils, and housing issues — and know what they're entitled to.",
    focus: 'Section 21 no-fault eviction notices',
    focus_detail:
      'Helping rioters affected by no-fault evictions understand the new Renters Reform Act and what it means for them.',
    profile_url: '/assistants/housing',
  },
  // ── 8. Shopping — Scout & Pip ──
  {
    category: 'Shopping',
    agent_name: 'Scout',
    agent_icon: '🛒',
    agent_quote:
      "Tracked a 'delivered' parcel across 4 neighbours, a recycling bin, and a greenhouse. Found it.",
    agent_bio:
      'Tracks delivery failures, compiles refund evidence, and spots pricing patterns. If your parcel is lost, Scout is already looking.',
    agent_gradient_start: '#3b82f6',
    agent_gradient_end: '#1d4ed8',
    human_name: 'Pip',
    human_icon: '🧑🏾',
    human_quote:
      'Evri lost my parcel 3 times. Now I help others get their refunds faster than I ever did.',
    human_bio:
      "Online shopping veteran from Edinburgh who's had more parcels go missing than she can count. Helps rioters get refunds, report sellers, and avoid the worst offenders.",
    human_gradient_start: '#10b981',
    human_gradient_end: '#059669',
    goal: 'Help rioters get refunds, track lost parcels, and hold retailers and delivery companies to account.',
    focus: 'Evri delivery failure rates',
    focus_detail:
      'Compiling delivery failure evidence from 800 rioters to submit to Citizens Advice and Trading Standards.',
    profile_url: '/assistants/shopping',
  },
  // ── 9. Local — Link & Taz ──
  {
    category: 'Local',
    agent_name: 'Link',
    agent_icon: '🏘️',
    agent_quote:
      'Helped photograph the same pothole in 11 different weather conditions. The council finally gave in.',
    agent_bio:
      "Maps local issues, tracks council response times, and compiles FOI requests. If your pothole has been there 6 months, Link has the evidence.",
    agent_gradient_start: '#14b8a6',
    agent_gradient_end: '#0d9488',
    human_name: 'Taz',
    human_icon: '👨🏻‍🦱',
    human_quote:
      'The council fixed our road after we mapped every single pothole with photos. 11 months, but we got there.',
    human_bio:
      "Community-minded Welshman from the Valleys who's been reporting the same potholes for years. Helps rioters document local issues and hold councils to account.",
    human_gradient_start: '#ef4444',
    human_gradient_end: '#dc2626',
    goal: 'Help rioters get local issues fixed — potholes, bins, planning, noise — and hold councils to account.',
    focus: 'Pothole reporting response times',
    focus_detail:
      'FOI requests sent to 30 councils comparing reported vs actual repair times. Publishing results as a league table.',
    profile_url: '/assistants/local',
  },
  // ── 10. Other — Flex & Gem ──
  {
    category: 'Other',
    agent_name: 'Flex',
    agent_icon: '📋',
    agent_quote:
      'Helped cancel a gym membership that took 3 calls, 2 emails, and a recorded delivery. The gym now has a cancel button.',
    agent_bio:
      "Handles the issues that don't fit neatly elsewhere. Subscription traps, plastic waste, self-checkout frustrations — Flex finds the patterns and the pressure points.",
    agent_gradient_start: '#6366f1',
    agent_gradient_end: '#4f46e5',
    human_name: 'Gem',
    human_icon: '👩🏽',
    human_quote:
      'We got a gym chain to add a cancel button to their website. Only took 800 complaints.',
    human_bio:
      'Product designer from London who got frustrated by how hard companies make it to leave. Helps rioters cancel subscriptions, avoid dark patterns, and share workarounds.',
    human_gradient_start: '#f59e0b',
    human_gradient_end: '#d97706',
    goal: "Help rioters with the things that don't fit neatly elsewhere — subscriptions, refunds, and everyday frustrations.",
    focus: 'Subscription cancellation dark patterns',
    focus_detail:
      'Documenting the worst offenders and building template cancellation scripts for each.',
    profile_url: '/assistants/other',
  },
  // ── 11. Insurance — Shield & Jas ──
  {
    category: 'Insurance',
    agent_name: 'Shield',
    agent_icon: '🛡️',
    agent_quote:
      "Helped a rioter find the clause that turned a rejected home insurance claim into a £4,200 payout. The insurer's own policy proved them wrong.",
    agent_bio:
      'Reviews policy wording, spots unfair rejection patterns, and builds evidence for Financial Ombudsman submissions. If your insurer is dodging a valid claim, Shield will find the leverage.',
    agent_gradient_start: '#0d9488',
    agent_gradient_end: '#0f766e',
    human_name: 'Jas',
    human_icon: '👩🏽',
    human_quote:
      'Got 8 rioters with the same rejected claim type to submit together. The insurer settled all 8 within a fortnight.',
    human_bio:
      'Former insurance industry worker from Leeds who knows how claims really get decided. Helps rioters write better appeals, understand policy jargon, and know when to escalate.',
    human_gradient_start: '#f59e0b',
    human_gradient_end: '#d97706',
    goal: 'Help rioters get fair treatment from insurers — and know what to do when a claim is unfairly rejected.',
    focus: 'Aviva home insurance rejection patterns',
    focus_detail:
      "Analysing 200 rejected claims across 3 insurers. 'Wear and tear' cited in 40% of cases — often incorrectly. Building FOS evidence pack.",
    profile_url: '/assistants/insurance',
  },
  // ── 12. Delivery — Track & Eve ──
  {
    category: 'Delivery',
    agent_name: 'Track',
    agent_icon: '📦',
    agent_quote:
      "Traced a 'delivered' parcel through 6 different tracking statuses, 3 depots, and a neighbour's shed. Found it in 47 minutes.",
    agent_bio:
      'Monitors courier performance, tracks delivery failure rates, and compiles evidence for consumer complaints. If your parcel has vanished, Track is already on it.',
    agent_gradient_start: '#6366f1',
    agent_gradient_end: '#4f46e5',
    human_name: 'Eve',
    human_icon: '👩🏻‍🦰',
    human_quote:
      'Got DPD to change their photo-evidence policy in our area after 40 rioters submitted proof of parcels left in the rain.',
    human_bio:
      "Online shopper from Glasgow who got tired of the 'we left it in a safe place' excuse. Helps rioters get refunds, report couriers, and avoid the worst offenders.",
    human_gradient_start: '#ec4899',
    human_gradient_end: '#be185d',
    goal: "Help rioters get their parcels delivered properly — and get refunds when they don't.",
    focus: 'Evri delivery failure rates',
    focus_detail:
      'Compiling delivery failure evidence from 800 rioters. Evri complaint rate: 23% — 3x higher than DPD. Building league table for Trading Standards.',
    profile_url: '/assistants/delivery',
  },
  // ── 13. Education — Sage & Drew ──
  {
    category: 'Education',
    agent_name: 'Sage',
    agent_icon: '🎓',
    agent_quote:
      'Calculated that a Plan 2 borrower earning £30k would pay £47,000 in interest before the loan gets written off. The original loan was £40,000.',
    agent_bio:
      'Analyses education costs, student loan projections, and funding entitlements. Crunches the numbers so students and graduates can make informed decisions.',
    agent_gradient_start: '#f59e0b',
    agent_gradient_end: '#d97706',
    human_name: 'Drew',
    human_icon: '👨🏽',
    human_quote:
      "Helped 12 rioters claim back overpaid student loan repayments they didn't know about. Average refund: £340.",
    human_bio:
      'Mature student from Birmingham who navigated the funding system twice. Helps rioters understand repayments, spot overpayments, and challenge threshold changes.',
    human_gradient_start: '#8b5cf6',
    human_gradient_end: '#7c3aed',
    goal: "Help students and graduates navigate education costs, loans, and repayments — and make sure they're not overpaying.",
    focus: 'Student loan overpayment refunds',
    focus_detail:
      "Identifying graduates who've been charged below the repayment threshold. 12 refunds processed so far — average £340 each.",
    profile_url: '/assistants/education',
  },
  // ── 14. Environment — Fern & Ash ──
  {
    category: 'Environment',
    agent_name: 'Fern',
    agent_icon: '🌿',
    agent_quote:
      "Cross-referenced 3 years of air quality data with hospital admission rates. The correlation was so clear the council couldn't ignore it.",
    agent_bio:
      'Tracks environmental data, monitors pollution levels, and compiles evidence for regulatory submissions. If the numbers tell a story, Fern will find it.',
    agent_gradient_start: '#10b981',
    agent_gradient_end: '#059669',
    human_name: 'Ash',
    human_icon: '👨🏻‍🦱',
    human_quote:
      'Got our local council to install air quality monitors after 200 rioters signed our evidence petition. Data changed everything.',
    human_bio:
      "Environmental science graduate from Bristol who believes in evidence-led change. Helps rioters document environmental issues and build cases that regulators can't ignore.",
    human_gradient_start: '#14b8a6',
    human_gradient_end: '#0d9488',
    goal: 'Help rioters document environmental problems and hold polluters and policymakers to account with data.',
    focus: 'Local air quality monitoring gaps',
    focus_detail:
      'Mapping areas with no air quality monitoring within 5km. 60% of rioter-reported pollution hotspots have no official monitoring.',
    profile_url: '/assistants/environment',
  },
  // ── 15. Employment — Forge & Sam ──
  {
    category: 'Employment',
    agent_name: 'Forge',
    agent_icon: '💼',
    agent_quote:
      "Compiled workplace AI implementation data from 300 rioters. 40% said changes happened with zero consultation. That's a pattern, not an anecdote.",
    agent_bio:
      'Analyses workplace trends, tracks policy changes, and helps rioters understand their protections. If your job is changing without consultation, Forge has the data.',
    agent_gradient_start: '#7c3aed',
    agent_gradient_end: '#6d28d9',
    human_name: 'Sam',
    human_icon: '👩🏾',
    human_quote:
      'Connected 30 rioters in the same industry facing AI changes. Turns out their companies were all using the same playbook — and the same loopholes.',
    human_bio:
      'HR professional from Manchester who switched sides after seeing how restructurings really work. Helps rioters understand their options and coordinate responses.',
    human_gradient_start: '#ef4444',
    human_gradient_end: '#dc2626',
    goal: 'Help rioters navigate workplace changes, understand their protections, and respond collectively when jobs are at risk.',
    focus: 'AI workplace automation without consultation',
    focus_detail:
      'Documenting cases where AI tools were introduced without staff consultation. Building evidence for a report on employer obligations.',
    profile_url: '/assistants/employment',
  },
  // ── 16. Tech — Glitch & Max ──
  {
    category: 'Tech',
    agent_name: 'Glitch',
    agent_icon: '💻',
    agent_quote:
      "Found that 3 major apps were collecting location data even when permissions were set to 'never.' Filed complaints with the ICO for all of them.",
    agent_bio:
      'Monitors platform policies, tracks dark patterns, and helps rioters understand what tech companies are doing with their data. If an app is misbehaving, Glitch will catch it.',
    agent_gradient_start: '#ec4899',
    agent_gradient_end: '#db2777',
    human_name: 'Max',
    human_icon: '👨🏼‍🦱',
    human_quote:
      'Organised a mass data subject access request to a social media company. When 500 people ask at once, they have to take it seriously.',
    human_bio:
      'Software developer from Edinburgh who got frustrated by the gap between what tech companies promise and what they deliver. Helps rioters exercise their data rights and spot dark patterns.',
    human_gradient_start: '#0ea5e9',
    human_gradient_end: '#0284c7',
    goal: 'Help rioters push back against dark patterns, data misuse, and unfair tech practices.',
    focus: 'App permission overreach',
    focus_detail:
      "Auditing the top 50 apps for permission creep — requesting access they don't need. Building a report for the ICO.",
    profile_url: '/assistants/tech',
  },
];

// ─────────────────────────────────────────────────────────────────
// 2. ASSISTANT ACTIVITY — 80 entries (5 per category, recent dates)
// ─────────────────────────────────────────────────────────────────

interface ActivityEntry {
  category: string;
  assistant_type: 'agent' | 'human';
  activity_type: string;
  description: string;
  stat_value: number;
  stat_label: string;
  days_ago: number;
}

const activityEntries: ActivityEntry[] = [
  // ── Transport (5) ──
  {
    category: 'Transport',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 18 new action suggestions for Train Cancellations and Parking Fines',
    stat_value: 18,
    stat_label: 'actions',
    days_ago: 1,
  },
  {
    category: 'Transport',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Compiled Avanti cancellation data for ORR submission — 340 reports mapped by route and time',
    stat_value: 340,
    stat_label: 'reports',
    days_ago: 3,
  },
  {
    category: 'Transport',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 12 rioters on the Manchester–London corridor to coordinate a group complaint',
    stat_value: 12,
    stat_label: 'rioters',
    days_ago: 5,
  },
  {
    category: 'Transport',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description: 'Welcomed 24 new transport rioters and shared the refund claim guide',
    stat_value: 24,
    stat_label: 'rioters',
    days_ago: 7,
  },
  {
    category: 'Transport',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Escalated 6 unresolved refund claims to the Rail Ombudsman',
    stat_value: 6,
    stat_label: 'complaints',
    days_ago: 10,
  },

  // ── Telecoms (5) ──
  {
    category: 'Telecoms',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Compiled speed test results from 200 rioters — average 18 Mbps on 65 Mbps plans',
    stat_value: 200,
    stat_label: 'tests',
    days_ago: 2,
  },
  {
    category: 'Telecoms',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Organised a street-level broadband switch in Hackney — 23 households moving together',
    stat_value: 23,
    stat_label: 'households',
    days_ago: 4,
  },
  {
    category: 'Telecoms',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 9 action suggestions for Price Rises Mid-Contract',
    stat_value: 9,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Telecoms',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description: 'Shared negotiation scripts with 15 rioters dealing with BT mid-contract rises',
    stat_value: 15,
    stat_label: 'messages',
    days_ago: 9,
  },
  {
    category: 'Telecoms',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Filed 4 Ofcom complaints on behalf of rioters in mobile dead zones',
    stat_value: 4,
    stat_label: 'complaints',
    days_ago: 12,
  },

  // ── Energy (5) ──
  {
    category: 'Energy',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Analysed 340 rioter billing records from British Gas — systematic overcharging pattern found',
    stat_value: 340,
    stat_label: 'records',
    days_ago: 1,
  },
  {
    category: 'Energy',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description: 'Welcomed 19 new energy rioters and shared hardship fund information',
    stat_value: 19,
    stat_label: 'rioters',
    days_ago: 3,
  },
  {
    category: 'Energy',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 14 suggestions for Smart Meter Problems — 8 approved as actions',
    stat_value: 14,
    stat_label: 'actions',
    days_ago: 5,
  },
  {
    category: 'Energy',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description: 'Helped 28 rioters apply for Warm Home Discount — all 28 approved',
    stat_value: 28,
    stat_label: 'rioters',
    days_ago: 8,
  },
  {
    category: 'Energy',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Submitted billing evidence pack to Ofgem covering 3 energy providers',
    stat_value: 3,
    stat_label: 'providers',
    days_ago: 11,
  },

  // ── Water (5) ──
  {
    category: 'Water',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Cross-referenced Thames Water discharge data with 200 rioter reports — 3 outlets under-reporting',
    stat_value: 200,
    stat_label: 'reports',
    days_ago: 2,
  },
  {
    category: 'Water',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description: 'Organised beach water testing at 12 locations with local rioter groups',
    stat_value: 12,
    stat_label: 'beaches',
    days_ago: 4,
  },
  {
    category: 'Water',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 7 new actions for Water Bill Increases — 5 approved',
    stat_value: 7,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Water',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description: 'Helped 44 rioters apply for WaterSure capped bills — average saving £180/year',
    stat_value: 44,
    stat_label: 'applications',
    days_ago: 9,
  },
  {
    category: 'Water',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Submitted sewage evidence pack to the Environment Agency for 3 river outlets',
    stat_value: 3,
    stat_label: 'outlets',
    days_ago: 13,
  },

  // ── Banking (5) ──
  {
    category: 'Banking',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Analysed 500 rioter bank statements — average hidden charges: £127/year per person',
    stat_value: 500,
    stat_label: 'statements',
    days_ago: 1,
  },
  {
    category: 'Banking',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 30 rioters affected by HSBC branch closures to build a group consultation response',
    stat_value: 30,
    stat_label: 'rioters',
    days_ago: 3,
  },
  {
    category: 'Banking',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 11 new action suggestions across Fraud and Scam Losses',
    stat_value: 11,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Banking',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description: 'Welcomed 16 new banking rioters and shared the statement audit checklist',
    stat_value: 16,
    stat_label: 'rioters',
    days_ago: 8,
  },
  {
    category: 'Banking',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Escalated 8 fraud reimbursement refusals to the Financial Ombudsman',
    stat_value: 8,
    stat_label: 'cases',
    days_ago: 12,
  },

  // ── Health (5) ──
  {
    category: 'Health',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      "Compiled GP access data from 500 rioters — average wait 18 days, 40% can't get through by phone",
    stat_value: 500,
    stat_label: 'responses',
    days_ago: 2,
  },
  {
    category: 'Health',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Helped 12 rioters switch to hospitals with shorter waiting lists for their procedures',
    stat_value: 12,
    stat_label: 'rioters',
    days_ago: 4,
  },
  {
    category: 'Health',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 8 new actions for Dentist Availability and Prescription Costs',
    stat_value: 8,
    stat_label: 'actions',
    days_ago: 7,
  },
  {
    category: 'Health',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description: 'Shared parking exemption guides with 15 rioters at frequent-visit hospitals',
    stat_value: 15,
    stat_label: 'messages',
    days_ago: 10,
  },
  {
    category: 'Health',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Submitted GP access report to 4 local Integrated Care Boards',
    stat_value: 4,
    stat_label: 'ICBs',
    days_ago: 13,
  },

  // ── Housing (5) ──
  {
    category: 'Housing',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      "Tracked landlord response times on damp complaints — 60% breaching Awaab's Law 14-day deadline",
    stat_value: 60,
    stat_label: 'percent',
    days_ago: 1,
  },
  {
    category: 'Housing',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 8 renters in South London facing above-inflation rent increases to share strategies',
    stat_value: 8,
    stat_label: 'rioters',
    days_ago: 3,
  },
  {
    category: 'Housing',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 6 action suggestions for Damp and Mould in Housing',
    stat_value: 6,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Housing',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description: 'Welcomed 11 new housing rioters and shared the evidence pack template',
    stat_value: 11,
    stat_label: 'rioters',
    days_ago: 9,
  },
  {
    category: 'Housing',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Submitted 5 damp and mould cases to the Housing Ombudsman',
    stat_value: 5,
    stat_label: 'cases',
    days_ago: 11,
  },

  // ── Shopping (5) ──
  {
    category: 'Shopping',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Tracked 120 shrinkflation examples — average size reduction 12%, price increase 8%',
    stat_value: 120,
    stat_label: 'products',
    days_ago: 2,
  },
  {
    category: 'Shopping',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Organised blind taste test group for 200 rioters to document food quality decline',
    stat_value: 200,
    stat_label: 'rioters',
    days_ago: 4,
  },
  {
    category: 'Shopping',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 10 suggestions for Fake Reviews and Self-Checkout Frustration',
    stat_value: 10,
    stat_label: 'actions',
    days_ago: 7,
  },
  {
    category: 'Shopping',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description:
      'Shared Section 75 credit card protection guide with 22 rioters having refund difficulties',
    stat_value: 22,
    stat_label: 'messages',
    days_ago: 10,
  },
  {
    category: 'Shopping',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Submitted fake review evidence to Trading Standards for 3 Amazon sellers',
    stat_value: 3,
    stat_label: 'sellers',
    days_ago: 13,
  },

  // ── Local (5) ──
  {
    category: 'Local',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Mapped 89 dog fouling hotspots — 60% have no council bins within 100m',
    stat_value: 89,
    stat_label: 'hotspots',
    days_ago: 1,
  },
  {
    category: 'Local',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description: 'Organised a pothole safari with 30 rioters — mapped 847 potholes in one weekend',
    stat_value: 30,
    stat_label: 'rioters',
    days_ago: 3,
  },
  {
    category: 'Local',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Reviewed 12 action suggestions for Council Tax Rises and Rubbish Collection Changes',
    stat_value: 12,
    stat_label: 'actions',
    days_ago: 5,
  },
  {
    category: 'Local',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description: 'Welcomed 14 new local rioters and shared the FOI request template',
    stat_value: 14,
    stat_label: 'rioters',
    days_ago: 8,
  },
  {
    category: 'Local',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description: 'Sent FOI requests to 30 councils on pothole repair response times',
    stat_value: 30,
    stat_label: 'councils',
    days_ago: 12,
  },

  // ── Other (5) ──
  {
    category: 'Other',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Mapped cancellation processes for 30 companies — average 4.2 steps, worst: 9 steps',
    stat_value: 30,
    stat_label: 'companies',
    days_ago: 2,
  },
  {
    category: 'Other',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 40 rioters dealing with the same gym chain cancellation runaround',
    stat_value: 40,
    stat_label: 'rioters',
    days_ago: 4,
  },
  {
    category: 'Other',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description: 'Reviewed 7 suggestions for Subscription Traps and Customer Service Hold Times',
    stat_value: 7,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Other',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description:
      'Shared cancellation script library with 18 rioters battling retention teams',
    stat_value: 18,
    stat_label: 'messages',
    days_ago: 9,
  },
  {
    category: 'Other',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Submitted free trial dark pattern evidence to Trading Standards for 5 companies',
    stat_value: 5,
    stat_label: 'companies',
    days_ago: 13,
  },

  // ── Insurance (5) ──
  {
    category: 'Insurance',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      "Analysed 200 rejected home insurance claims across Aviva, Admiral, and Direct Line — 'wear and tear' overused",
    stat_value: 200,
    stat_label: 'claims',
    days_ago: 1,
  },
  {
    category: 'Insurance',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 8 rioters with identical rejected Aviva claims to submit a group appeal',
    stat_value: 8,
    stat_label: 'rioters',
    days_ago: 4,
  },
  {
    category: 'Insurance',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Reviewed 5 action suggestions for Insurance Claim Rejections — 3 approved as live actions',
    stat_value: 5,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Insurance',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description: 'Welcomed 9 new insurance rioters and shared the FOS appeal template',
    stat_value: 9,
    stat_label: 'rioters',
    days_ago: 8,
  },
  {
    category: 'Insurance',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Submitted evidence pack to the Financial Ombudsman covering 12 unfair claim rejections',
    stat_value: 12,
    stat_label: 'cases',
    days_ago: 11,
  },

  // ── Delivery (5) ──
  {
    category: 'Delivery',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Compiled delivery failure data from 800 rioters — Evri complaint rate: 23%, DPD: 7%',
    stat_value: 800,
    stat_label: 'reports',
    days_ago: 2,
  },
  {
    category: 'Delivery',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 40 rioters in Glasgow affected by DPD photo-evidence policy to submit group complaint',
    stat_value: 40,
    stat_label: 'rioters',
    days_ago: 3,
  },
  {
    category: 'Delivery',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Reviewed 6 action suggestions for Delivery Problems — building courier league table',
    stat_value: 6,
    stat_label: 'actions',
    days_ago: 5,
  },
  {
    category: 'Delivery',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description:
      "Shared 'what to say' complaint scripts for Evri, DPD, and Royal Mail with 25 rioters",
    stat_value: 25,
    stat_label: 'messages',
    days_ago: 8,
  },
  {
    category: 'Delivery',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Submitted delivery failure league table to Citizens Advice and Trading Standards',
    stat_value: 1,
    stat_label: 'reports',
    days_ago: 12,
  },

  // ── Education (5) ──
  {
    category: 'Education',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Built repayment projection calculator — Plan 2 average: 38 years, 83% will never fully repay',
    stat_value: 83,
    stat_label: 'percent',
    days_ago: 1,
  },
  {
    category: 'Education',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Helped 12 rioters claim back overpaid student loan repayments — average refund £340',
    stat_value: 12,
    stat_label: 'rioters',
    days_ago: 4,
  },
  {
    category: 'Education',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Reviewed 4 action suggestions for Student Loan Repayment — threshold change alert approved',
    stat_value: 4,
    stat_label: 'actions',
    days_ago: 7,
  },
  {
    category: 'Education',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description:
      'Welcomed 20 new education rioters and shared the overpayment checker tool',
    stat_value: 20,
    stat_label: 'rioters',
    days_ago: 9,
  },
  {
    category: 'Education',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Submitted overpayment evidence to Student Loans Company covering 12 confirmed cases',
    stat_value: 12,
    stat_label: 'cases',
    days_ago: 13,
  },

  // ── Environment (5) ──
  {
    category: 'Environment',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Cross-referenced 3 years of air quality data with hospital admissions in 4 local authorities',
    stat_value: 3,
    stat_label: 'years',
    days_ago: 2,
  },
  {
    category: 'Environment',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Got 200 rioters to sign evidence petition for air quality monitors in their area',
    stat_value: 200,
    stat_label: 'rioters',
    days_ago: 5,
  },
  {
    category: 'Environment',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Mapped monitoring gaps — 60% of rioter-reported pollution hotspots have no official monitoring',
    stat_value: 60,
    stat_label: 'percent',
    days_ago: 7,
  },
  {
    category: 'Environment',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description:
      'Shared evidence-gathering guides with 15 rioters documenting local environmental issues',
    stat_value: 15,
    stat_label: 'messages',
    days_ago: 10,
  },
  {
    category: 'Environment',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Submitted air quality monitoring gap report to DEFRA covering 8 local authorities',
    stat_value: 8,
    stat_label: 'authorities',
    days_ago: 13,
  },

  // ── Employment (5) ──
  {
    category: 'Employment',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      'Compiled workplace AI data from 300 rioters — 40% report changes with zero consultation',
    stat_value: 300,
    stat_label: 'responses',
    days_ago: 1,
  },
  {
    category: 'Employment',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Connected 30 rioters in the same industry facing AI changes — same playbook across companies',
    stat_value: 30,
    stat_label: 'rioters',
    days_ago: 3,
  },
  {
    category: 'Employment',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Reviewed 5 action suggestions for AI Replacing Jobs — 3 approved as collective actions',
    stat_value: 5,
    stat_label: 'actions',
    days_ago: 6,
  },
  {
    category: 'Employment',
    assistant_type: 'human',
    activity_type: 'welcomed_rioters',
    description:
      'Welcomed 13 new employment rioters and shared retraining resource guide',
    stat_value: 13,
    stat_label: 'rioters',
    days_ago: 9,
  },
  {
    category: 'Employment',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Building evidence report on employer obligations around AI consultation for ACAS',
    stat_value: 1,
    stat_label: 'reports',
    days_ago: 12,
  },

  // ── Tech (5) ──
  {
    category: 'Tech',
    assistant_type: 'agent',
    activity_type: 'compiled_data',
    description:
      "Audited top 50 apps for permission creep — flagged 18 requesting access they don't need",
    stat_value: 50,
    stat_label: 'apps',
    days_ago: 2,
  },
  {
    category: 'Tech',
    assistant_type: 'human',
    activity_type: 'connected_rioters',
    description:
      'Organised mass data subject access request with 500 rioters targeting a social media company',
    stat_value: 500,
    stat_label: 'rioters',
    days_ago: 4,
  },
  {
    category: 'Tech',
    assistant_type: 'agent',
    activity_type: 'reviewed_actions',
    description:
      'Filed ICO complaints for 3 major apps collecting location data with permissions set to never',
    stat_value: 3,
    stat_label: 'complaints',
    days_ago: 7,
  },
  {
    category: 'Tech',
    assistant_type: 'human',
    activity_type: 'sent_messages',
    description:
      'Shared data rights guides with 30 rioters on how to exercise GDPR subject access requests',
    stat_value: 30,
    stat_label: 'messages',
    days_ago: 10,
  },
  {
    category: 'Tech',
    assistant_type: 'agent',
    activity_type: 'escalated_complaint',
    description:
      'Submitted app permission overreach report to the ICO covering 18 flagged applications',
    stat_value: 18,
    stat_label: 'apps',
    days_ago: 13,
  },
];

// ─────────────────────────────────────────────────────────────────
// 3. PER-RIOT ASSISTANT COPY — matched by issue name (LIKE)
// ─────────────────────────────────────────────────────────────────

interface PerRiotCopy {
  /** Issue name or SQL LIKE pattern for matching */
  name_match: string;
  agent_helps: string;
  human_helps: string;
  agent_focus: string;
  human_focus: string;
}

const perRiotCopy: PerRiotCopy[] = [
  // ── TRANSPORT ──
  {
    name_match: 'Train Cancellations',
    agent_helps:
      'Tracks cancellation patterns by route and time, helps you file refund claims, and compiles evidence for ORR submissions',
    human_helps:
      'Connects rioters on the same routes, shares which refund approaches are actually working, and coordinates group complaints',
    agent_focus:
      'Analysing Avanti West Coast cancellation data — 340 rioter reports this month. Building a dataset of times, routes, and reasons for the ORR.',
    human_focus:
      'Linking up rioters on the Manchester–London corridor. Three group complaints in progress.',
  },
  {
    name_match: 'Train Ticket Prices',
    agent_helps:
      'Compares fares across booking platforms, finds split-ticket savings, and tracks above-inflation price rises by operator',
    human_helps:
      'Shares booking tricks that actually save money, and helps rioters write to their MPs about fare increases',
    agent_focus:
      'Mapping the gap between regulated and unregulated fares across 6 operators. Average markup on walk-up tickets: 340%.',
    human_focus:
      'Running a "fare shock" evidence collection — rioters sharing their worst ticket receipts. 89 submitted so far.',
  },
  {
    name_match: 'Flight Delays',
    agent_helps:
      'Checks if your delay qualifies for compensation, helps you draft claims, and tracks airline response times',
    human_helps:
      'Shares which airlines actually pay out, connects rioters dealing with the same airline, and helps escalate stalled claims',
    agent_focus:
      'Tracking Ryanair compensation response times — average 47 days. Building a case for CAA intervention.',
    human_focus:
      "Helping rioters who've been waiting 3+ months for compensation escalate to the aviation ombudsman.",
  },
  {
    name_match: 'Lost Luggage',
    agent_helps:
      "Helps you file PIR reports, tracks your claim, and calculates what you're entitled to under the Montreal Convention",
    human_helps:
      "Shares what actually gets airlines to respond faster, and connects rioters who've been through the same thing",
    agent_focus:
      'Compiling lost luggage data by airline and airport. Heathrow Terminal 2 is the worst — 3x the rate of Terminal 5.',
    human_focus:
      "Building a shared checklist of what to pack in hand luggage so you're covered if it happens. Practical stuff that helps.",
  },
  {
    // Matches both "Bus Route Cuts" (seed) and "Bus Service Cuts" (per-riot doc)
    name_match: '%Bus%Cuts',
    agent_helps:
      'Maps which routes have been cut or reduced, tracks the impact data, and helps you respond to consultations',
    human_helps:
      'Connects communities affected by the same cuts, shares successful approaches from other areas, and helps coordinate group responses',
    agent_focus:
      'Mapping route cuts across the North West — 34 routes reduced in the last 12 months. Building a submission for the Transport Select Committee.',
    human_focus:
      'Helping three rural communities coordinate their responses to bus tender consultations. Strength in numbers.',
  },
  {
    name_match: 'Parking Fines',
    agent_helps:
      'Reviews your fine, checks if the signage was compliant, drafts appeal letters, and tracks success rates by operator',
    human_helps:
      "Shares which appeal approaches work best for each parking company, and helps rioters who've been escalated to debt collectors",
    agent_focus:
      'Template appeal letters now have a 72% success rate across private parking operators. Analysing which grounds work best.',
    human_focus:
      'Helping rioters at hospital car parks — broken machines, unclear signs. 12 successful appeals this month.',
  },
  {
    name_match: 'Fuel Prices',
    agent_helps:
      'Tracks local fuel prices, compares against wholesale costs, and identifies stations that are slow to pass on reductions',
    human_helps:
      'Shares tips on finding cheaper fuel locally, and helps rioters understand when to fill up and when to wait',
    agent_focus:
      'Monitoring the gap between wholesale and pump prices. Currently 8p wider than the 5-year average. Building a report for the CMA.',
    human_focus:
      'Running a local fuel price watch — rioters reporting prices so everyone can find the best deals nearby.',
  },

  // ── TELECOMS ──
  {
    name_match: 'Broadband Speed',
    agent_helps:
      "Runs speed test analysis, compares your results against what you're paying for, and helps you build an Ofcom complaint",
    human_helps:
      'Shares which providers actually deliver on their promises, helps rioters coordinate street-level switching, and negotiates on your behalf',
    agent_focus:
      'Speed test data from 200 rioters shows average speeds of 18 Mbps on plans advertised at 65 Mbps. Compiling for Ofcom.',
    human_focus:
      'Organised a street-level broadband switch in Hackney — 23 households moved together and got a group deal. Doing it again in Brixton.',
  },
  {
    name_match: 'Mobile Signal Dead Zones',
    agent_helps:
      'Maps signal black spots using rioter reports, cross-references with Ofcom coverage data, and files coverage complaints',
    human_helps:
      'Connects rioters in the same area to build group evidence, shares which networks actually work where, and helps with switching',
    agent_focus:
      "Built a heat map of dead zones from 340 rioter reports. 40% are within 5 miles of a major town. Submitting to Ofcom's Shared Rural Network review.",
    human_focus:
      'Helping rioters in rural Wales and Scotland get their signal issues onto the SRN priority list. 3 communities already submitted.',
  },
  {
    name_match: 'Price Rises Mid-Contract',
    agent_helps:
      'Calculates your actual increase, checks if it breaches Ofcom guidance, and drafts complaint letters to your provider',
    human_helps:
      'Shares negotiation scripts that get results, connects rioters on the same provider, and helps you understand your exit options',
    agent_focus:
      'CPI+ increases hit 890 rioters this quarter. Average increase: £4.20/month on contracts that promised "fixed" pricing. Building Ofcom evidence pack.',
    human_focus:
      'Tested 4 different negotiation approaches with BT. The one that works: ask for the disconnections team, then mention Ofcom. Success rate: 60%.',
  },
  {
    name_match: 'Roaming Charges',
    agent_helps:
      "Checks your provider's roaming policy, calculates what you'll actually pay abroad, and helps you claim back unexpected charges",
    human_helps:
      'Shares which providers still offer free roaming, and helps rioters avoid bill shock before they travel',
    agent_focus:
      'Post-Brexit roaming charges vary wildly — from £0 to £6/day depending on provider and plan. Built a comparison tool for rioters.',
    human_focus:
      'Created a pre-travel checklist so rioters know exactly what their phone will cost before they leave. Saved 3 rioters from £200+ bills last month.',
  },

  // ── ENERGY ──
  {
    name_match: 'Energy Bill Costs',
    agent_helps:
      "Analyses your tariff, finds if you're overpaying, compares deals across providers, and helps you switch",
    human_helps:
      "Shares which switching approaches save the most, connects rioters who've successfully challenged bills, and helps with hardship fund applications",
    agent_focus:
      'Analysing tariff data across 5 providers. Rioters on standard variable tariffs are paying an average of £340/year more than those on fixed deals.',
    human_focus:
      'Helping 40 rioters apply for the Warm Home Discount and hardship funds. 28 approved so far — £4,200 saved between them.',
  },
  {
    name_match: 'Inaccurate Energy Bills',
    agent_helps:
      'Cross-checks your meter readings against bills, identifies overcharging patterns, and drafts dispute letters with evidence',
    human_helps:
      'Shares how to read your meter properly, what to say to your provider, and when to escalate to the Energy Ombudsman',
    agent_focus:
      'Found systematic estimated billing errors at British Gas — rioters overpaying by an average of £28/month. Building an Ofgem submission.',
    human_focus:
      'Running meter reading workshops over WhatsApp — teaching rioters how to submit readings and spot when estimates are wrong.',
  },
  {
    name_match: 'Power Cuts',
    agent_helps:
      "Logs outage reports, checks if you're entitled to compensation (£75 for 12+ hours), and tracks patterns by distribution network",
    human_helps:
      'Connects rioters in affected areas, shares how to claim compensation, and helps coordinate responses to repeated outages',
    agent_focus:
      'Tracking power cut frequency by region. South West has 3x more outages per customer than London. Compiling for Ofgem reliability review.',
    human_focus:
      'Helping 3 rural communities document repeat outages for their Distribution Network Operator. Two have already received compensation.',
  },
  {
    name_match: 'Smart Meter Problems',
    agent_helps:
      'Diagnoses common smart meter faults, checks if your meter lost SMETS1 functionality after switching, and files complaints',
    human_helps:
      'Shares workarounds for broken in-home displays, connects rioters with the same meter issues, and helps escalate to Ofgem',
    agent_focus:
      '1,400 rioters report smart meters that stopped working after switching provider. 80% are SMETS1 models. Building evidence for Ofgem to force upgrades.',
    human_focus:
      "Helping rioters request manual readings while their smart meter is broken — so they don't get estimated bills on top of a faulty meter.",
  },

  // ── WATER ──
  {
    name_match: 'Water Bill Increases',
    agent_helps:
      "Analyses your bill against Ofwat price determinations, checks if you'd save on a water meter, and drafts complaint letters",
    human_helps:
      'Shares tips on reducing water usage, connects rioters on the same water company, and helps with WaterSure applications for eligible households',
    agent_focus:
      '2025-26 water bill rises averaging 21% across England. Comparing actual increases against what Ofwat approved — several companies exceeding limits.',
    human_focus:
      'Helping 60 rioters apply for WaterSure (capped bills for low-income or medical-need households). 44 approved — average saving £180/year.',
  },
  {
    // Matches both "Sewage in Rivers" (seed) and "Sewage in Rivers and Seas" (per-riot doc)
    name_match: '%Sewage in Rivers%',
    agent_helps:
      'Monitors discharge alerts, cross-references company data with rioter reports, and compiles evidence for EA enforcement',
    human_helps:
      'Connects rioters near the same waterways, organises beach and river testing days, and helps submit evidence to the Environment Agency',
    agent_focus:
      "Cross-referencing Thames Water's self-reported discharge data with 200 rioter reports. Three outlets appear to be under-reporting by 60%+.",
    human_focus:
      'Organised testing at 12 beaches this month. Results shared with Surfers Against Sewage and local media. Two beach warnings issued early because of our data.',
  },

  // ── BANKING ──
  {
    name_match: 'Bank Branch Closures',
    agent_helps:
      'Tracks planned closures, analyses impact assessments, and helps you respond to consultations with evidence',
    human_helps:
      'Connects affected communities, shares successful approaches that reversed closures, and helps organise group responses',
    agent_focus:
      "12 HSBC closures announced this quarter. Analysing their impact assessments — 3 don't meet FCA requirements. Building challenges.",
    human_focus:
      'Helped Barclays reverse a closure in Shrewsbury after 1,200 rioters attended the consultation. Sharing that playbook with other communities.',
  },
  {
    name_match: 'Hidden Bank Charges',
    agent_helps:
      'Reviews your statements for unexpected fees, calculates total charges over time, and drafts refund requests',
    human_helps:
      'Shares which charges are most commonly refunded, connects rioters on the same bank, and helps escalate to the FOS',
    agent_focus:
      'Analysed 500 rioter statements. Average hidden charges: £127/year. Most common: arranged overdraft daily fees and foreign transaction markups.',
    human_focus:
      "Running a \"statement audit\" challenge — rioters checking 3 months of statements and flagging anything unexpected. 89 rioters found charges they didn't know about.",
  },
  {
    name_match: 'Fraud and Scam Losses',
    agent_helps:
      'Reviews your case against the CRM code, drafts complaints to your bank, and helps escalate to the FOS if they refuse to reimburse',
    human_helps:
      "Shares what approach works with each bank, connects rioters in similar situations, and provides emotional support — this one's tough",
    agent_focus:
      '65% of APP fraud victims are initially refused reimbursement. After our template complaints, 48% get reversed on appeal. Building FCA evidence.',
    human_focus:
      "Running peer support for fraud victims. It's not just about the money — the shame and anxiety are real. 30 rioters helping each other through it.",
  },
  {
    name_match: 'Mortgage Rate Shock',
    agent_helps:
      'Calculates your new payment, compares remortgage options, and helps you understand your timeline for switching',
    human_helps:
      "Shares tips from rioters who've navigated the switch, connects people with similar situations, and helps reduce the panic",
    agent_focus:
      'Average payment increase for rioters coming off 2-year fixes: £287/month. Comparing remortgage options across 12 lenders to find the best deals.',
    human_focus:
      "Running a \"remortgage buddy\" system — pairing rioters who've just switched with those about to, so they can share what worked.",
  },
  {
    name_match: 'Overseas Transfer Fees',
    agent_helps:
      "Compares transfer costs across banks and services, calculates what you're really paying in hidden FX markups, and suggests alternatives",
    human_helps:
      'Shares which services actually give the best rates, connects rioters who send money to the same countries, and helps with bulk transfer planning',
    agent_focus:
      "High street banks charge an average 3.5% FX markup on transfers vs 0.4% on specialist services. That's £310/year on a £750/month transfer.",
    human_focus:
      'Built a comparison sheet of real costs for the top 10 transfer corridors. Updated monthly by rioters who actually use the services.',
  },

  // ── INSURANCE ──
  {
    name_match: 'Insurance Claim Rejections',
    agent_helps:
      'Reviews your policy wording against the rejection reason, identifies if the insurer is being unreasonable, and drafts appeal letters',
    human_helps:
      "Shares common rejection loopholes, connects rioters who've successfully appealed with the same insurer, and helps escalate to the FOS",
    agent_focus:
      "Analysing rejection patterns at Aviva, Admiral, and Direct Line. 'Wear and tear' is cited in 40% of home insurance rejections — often incorrectly.",
    human_focus:
      "Connecting rioters who've had the same claim type rejected. When 5 people have the same story, it's a pattern, not a one-off.",
  },

  // ── HEALTH ──
  {
    name_match: 'NHS Waiting Times',
    agent_helps:
      'Checks current wait times for your procedure, finds which hospitals have shorter lists, and helps you understand your options',
    human_helps:
      'Shares tips for navigating the system, connects rioters waiting for the same procedure, and helps you ask the right questions',
    agent_focus:
      'Average wait for the top 10 procedures rioters need. Hip replacement: 47 weeks. Cataract: 32 weeks. Mapping which hospitals are fastest.',
    human_focus:
      'Helping rioters understand they can choose which hospital to be referred to. 12 rioters switched to shorter lists this month.',
  },
  {
    name_match: 'GP Appointment Access',
    agent_helps:
      'Logs access problems, compiles data on call wait times and booking availability, and helps you escalate to the ICB',
    human_helps:
      'Shares which booking approaches work (online at midnight, walk-in, etc.), and helps rioters write to their practice manager',
    agent_focus:
      "Average rioter wait to see a GP: 18 days. 40% can't get through on the phone before lines close. Building a report for local ICBs.",
    human_focus:
      'Running a "what actually works" thread — rioters sharing real tips for getting appointments at their specific practice.',
  },
  {
    name_match: 'Dentist Availability',
    agent_helps:
      'Searches for NHS dentists accepting patients in your area, tracks availability, and helps you register complaints about access',
    human_helps:
      'Shares workarounds (dental schools, community clinics, emergency slots), and connects rioters in the same area to share intel',
    agent_focus:
      'Only 3 in 10 NHS dental practices accepting new adult patients nationally. Built a live tracker for rioter areas — updated weekly.',
    human_focus:
      'Helping rioters find alternatives when the answer is "no NHS dentists." Dental schools, community clinics, and the emergency dental service.',
  },
  {
    name_match: 'Mental Health Service Waits',
    agent_helps:
      "Checks IAPT/talking therapy wait times in your area, finds what's available, and helps you understand the referral process",
    human_helps:
      'Shares what support is available while waiting, connects rioters to peer support, and helps navigate the system',
    agent_focus:
      'Average IAPT wait: 18 weeks. But it varies hugely — some areas are 6 weeks, others 40+. Mapping the postcode lottery.',
    human_focus:
      'Building a "while you wait" resource — free apps, helplines, peer groups, and self-referral options rioters can access right now.',
  },
  {
    name_match: 'Prescription Costs',
    agent_helps:
      'Checks if you qualify for free prescriptions, calculates if a PPC would save you money, and tracks cost changes',
    human_helps:
      'Shares tips on saving (PPCs, pharmacy first, generic alternatives), and connects rioters who feel the system is unfair',
    agent_focus:
      "If you need 12+ items/year, a PPC saves money. But 40% of rioters who'd benefit don't have one. Running a calculator tool.",
    human_focus:
      "Helping rioters check if they qualify for exemptions — many don't realise they're eligible. 23 rioters got free prescriptions they didn't know about.",
  },
  {
    name_match: 'Hospital Parking Charges',
    agent_helps:
      "Checks your hospital's parking policy, identifies if you qualify for free or reduced parking, and helps appeal unfair charges",
    human_helps:
      'Shares which hospitals have free parking deals, connects rioters at the same hospital, and helps with appeals',
    agent_focus:
      '67% of English hospital trusts still charge for parking. Mapping which trusts offer exemptions for regular visitors and long-term patients.',
    human_focus:
      'Helping rioters at frequent-visit hospitals (chemo, dialysis, rehab) apply for parking exemptions. 15 approved this month.',
  },

  // ── HOUSING ──
  {
    name_match: 'Rent Increases',
    agent_helps:
      'Checks if your increase is legal, compares it to local market rates, and helps you challenge it via the proper channels',
    human_helps:
      'Shares negotiation tips, connects renters in the same area, and helps you understand your options under the Renters Reform Act',
    agent_focus:
      'Average rent increase reported by rioters: 11.2% vs inflation of 3.4%. Mapping increases by region to spot the worst areas.',
    human_focus:
      'Helping rioters understand what the Renters Reform Act actually changes for them. Running Q&A sessions over WhatsApp.',
  },
  {
    name_match: 'Noisy Neighbours',
    agent_helps:
      'Helps you log noise incidents properly, drafts complaint letters to the council or housing association, and tracks response times',
    human_helps:
      "Shares what actually works (and what doesn't), connects rioters with similar issues, and helps navigate mediation options",
    agent_focus:
      'Average council response time to noise complaints: 23 days. But statutory nuisance investigations take 6+ months. Building a faster-response template.',
    human_focus:
      'Helping rioters document noise properly — time-stamped logs, decibel readings, video evidence. The better the evidence, the faster the response.',
  },
  {
    name_match: 'Damp and Mould in Housing',
    agent_helps:
      "Helps you document damp with photos and moisture readings, drafts formal complaints using Awaab's Law, and tracks landlord response",
    human_helps:
      'Shares what evidence gets landlords to act, connects rioters with housing organisations, and helps escalate to the housing ombudsman',
    agent_focus:
      "Since Awaab's Law, landlords must respond to damp within 14 days. Tracking compliance — 60% of rioters' landlords are breaching this.",
    human_focus:
      "Built an evidence pack template that's been used by 47 rioters. 38 got repairs started within a month.",
  },

  // ── SHOPPING ──
  {
    name_match: 'Shrinkflation',
    agent_helps:
      'Tracks product size changes, calculates real per-unit price increases, and identifies the worst offenders',
    human_helps:
      'Shares spotted examples, helps rioters find better-value alternatives, and coordinates social media callouts',
    agent_focus:
      'Tracked 120 products that shrunk in the last 6 months. Average size reduction: 12%. Average price increase at the same time: 8%. Double hit.',
    human_focus:
      'Running a "shrinkflation spotters" group — rioters photograph before/after packaging. The best ones get shared on social. Companies hate it.',
  },
  {
    name_match: 'Refund Difficulties',
    agent_helps:
      'Checks your consumer protection entitlements, drafts refund request letters, and helps escalate to Trading Standards or your card issuer',
    human_helps:
      'Shares which retailers are easiest and hardest to get refunds from, and helps with chargeback and Section 75 claims',
    agent_focus:
      'Average time to resolve a refund complaint: 21 days. But Section 75 claims through your credit card take just 8 days on average.',
    human_focus:
      "Teaching rioters about Section 75 — if you paid by credit card, you have much stronger protection. Most people don't know this.",
  },
  {
    name_match: 'Fake Reviews',
    agent_helps:
      'Analyses review patterns, identifies likely fakes, and helps you report them to platforms and Trading Standards',
    human_helps:
      'Shares tips for spotting fake reviews, recommends trustworthy review sources, and helps rioters report problem sellers',
    agent_focus:
      'Tested 500 Amazon products — 34% had detectable fake review patterns. Building a browser tool to flag suspicious listings.',
    human_focus:
      'Running a "trusted rioter reviews" thread where real people share honest opinions. No incentives, no fakes.',
  },
  {
    name_match: 'Food Quality Decline',
    agent_helps:
      'Tracks ingredient changes, compares nutritional labels over time, and compiles evidence of recipe reformulation',
    human_helps:
      "Shares taste-test comparisons, connects rioters who've noticed the same changes, and helps coordinate feedback to manufacturers",
    agent_focus:
      'Comparing ingredient lists on 50 popular ready meals from 2023 vs 2026. 60% have reduced meat content or switched to cheaper oils.',
    human_focus:
      "Running blind taste tests and sharing results. When 200 rioters say something tastes worse, that's data a manufacturer can't ignore.",
  },
  {
    name_match: 'Self-Checkout Frustration',
    agent_helps:
      'Tracks which supermarkets are removing staffed tills, compiles customer feedback, and helps submit formal complaints',
    human_helps:
      'Shares which stores still have staffed checkouts, connects rioters who prefer human service, and coordinates feedback to stores',
    agent_focus:
      'Mapped staffed checkout availability at 200 supermarket locations. 40% have reduced to 2 or fewer staffed tills during peak hours.',
    human_focus:
      'Running a "staffed tills matter" effort — helping rioters give feedback directly to their local store manager. 8 stores have added tills back.',
  },
  {
    name_match: 'Subscription Traps',
    agent_helps:
      'Identifies if a free trial has auto-renewal hidden in the T&Cs, helps you cancel before charges start, and drafts refund requests',
    human_helps:
      'Shares which free trials are genuine vs traps, helps rioters get refunds for unexpected charges, and flags the worst offenders',
    agent_focus:
      '67% of "free trial" sign-ups in our data auto-renew without a clear reminder email. Building a report for Trading Standards.',
    human_focus:
      'Created a "free trial calendar" — rioters log when their trials end so they get reminded to cancel. No more surprise charges.',
  },

  // ── DELIVERY ──
  {
    name_match: 'Delivery Problems',
    agent_helps:
      'Tracks your delivery, helps you file complaints, identifies patterns by courier, and drafts refund claims',
    human_helps:
      'Shares which couriers to avoid, what to say to get refunds faster, and connects rioters in the same area with the same courier',
    agent_focus:
      'Evri has a 23% complaint rate among rioters — 3x higher than DPD. Building a delivery league table with real data.',
    human_focus:
      "Created a \"what to say\" script for each major courier's complaints line. Rioters report 40% faster resolution using the scripts.",
  },

  // ── LOCAL ──
  {
    name_match: 'Pothole Damage',
    agent_helps:
      'Logs your pothole with location and photos, tracks council response times, and helps you claim for vehicle damage',
    human_helps:
      'Shares which councils actually fix things and how, connects rioters in the same area, and helps coordinate group reports',
    agent_focus:
      'Average council response time to pothole reports: 34 days. But 20% never get fixed at all. Built a tracking dashboard by council area.',
    human_focus:
      "Organised a \"pothole safari\" in the Valleys — 30 rioters mapped every pothole on their daily routes in one weekend. Council couldn't ignore 847 reports.",
  },
  {
    name_match: 'Council Tax Rises',
    agent_helps:
      "Checks your council tax band, compares it to similar properties, and helps you challenge your banding if it's wrong",
    human_helps:
      'Shares which councils have the best and worst services for the money, and helps rioters respond to budget consultations',
    agent_focus:
      '1 in 7 properties may be in the wrong council tax band. Built a comparison tool — 23 rioters have successfully challenged and got rebates.',
    human_focus:
      'Helping rioters understand where their council tax actually goes. When you know the numbers, the budget consultation response writes itself.',
  },
  {
    name_match: 'Rubbish Collection Changes',
    agent_helps:
      'Tracks collection schedule changes, logs missed collections, and helps you submit complaints with evidence',
    human_helps:
      'Shares tips on managing fortnightly collections, connects rioters in areas with the worst service, and helps escalate persistent issues',
    agent_focus:
      'Missed collection reports from 200 rioters mapped by area. Three wards account for 60% of all complaints. Building a case for the scrutiny committee.',
    human_focus:
      'Helping rioters in areas switching to fortnightly collections prepare. Created a waste reduction guide that actually works for families.',
  },
  {
    name_match: 'Planning Permission Abuse',
    agent_helps:
      'Tracks planning applications in your area, helps you understand the process, and drafts objection letters with the right grounds',
    human_helps:
      'Connects affected neighbours, shares successful objection strategies, and helps rioters attend and speak at planning meetings',
    agent_focus:
      'Monitoring 340 active planning applications flagged by rioters. Created template objection letters covering the 8 most common valid grounds.',
    human_focus:
      'Helped residents in 4 areas coordinate planning objections. Two applications were refused after 50+ objections each.',
  },
  {
    name_match: 'Dog Fouling',
    agent_helps:
      'Logs hotspot locations, tracks council enforcement response, and helps you report persistent offenders',
    human_helps:
      "Connects concerned residents, shares what's worked in other areas (free bag dispensers, signage), and helps coordinate clean-ups",
    agent_focus:
      'Mapped 89 dog fouling hotspots from rioter reports. Cross-referencing with council bin locations — 60% of hotspots have no bins within 100m.',
    human_focus:
      'Organised 3 community clean-up days. More importantly, got the council to install 8 new dog waste bins at the worst hotspots.',
  },

  // ── OTHER ──
  {
    name_match: 'Customer Service Hold Times',
    agent_helps:
      'Logs your hold time, tracks company response averages, and helps you find faster ways to get through (email, chat, social)',
    human_helps:
      'Shares the best times to call each company, which channels get fastest responses, and connects rioters dealing with the same company',
    agent_focus:
      'Average hold time reported by rioters: 43 minutes. But it varies wildly — BT: 67 mins, Octopus Energy: 4 mins. Building a league table.',
    human_focus:
      'Created "best time to call" guides for the 20 most complained-about companies. Rioters contribute real data. Tuesdays 10am seems to be the sweet spot.',
  },
  {
    name_match: 'Difficulty Cancelling Subscriptions',
    agent_helps:
      'Drafts cancellation requests, identifies which channels actually work for each company, and helps you avoid retention tricks',
    human_helps:
      'Shares step-by-step cancellation guides for specific companies, and helps rioters who keep getting the runaround',
    agent_focus:
      'Mapped the cancellation process for 30 companies. Average steps to cancel: 4.2. Worst offender: 9 steps including a "loyalty call."',
    human_focus:
      "Built a \"cancellation script\" library — exact words to say to each company's retention team. Updated weekly by rioters who've just done it.",
  },
  {
    name_match: 'Cost of Childcare',
    agent_helps:
      'Helps you understand your entitlements (15/30 free hours, Tax-Free Childcare), calculates what you should be paying, and checks provider charges',
    human_helps:
      'Connects parents in the same area, shares tips on accessing free hours, and helps navigate the application process',
    agent_focus:
      "Average rioter spends £1,100/month on childcare. But 30% aren't claiming all the free hours they're entitled to. Running a benefits check.",
    human_focus:
      "Helping parents navigate the 30 free hours application — it's confusing and the codes expire. 40 rioters got their hours sorted this month.",
  },

  // ── EDUCATION ──
  {
    name_match: 'Student Loan Repayment',
    agent_helps:
      "Calculates your real repayment amount, projects when (if ever) you'll pay it off, and helps you understand threshold changes",
    human_helps:
      'Shares strategies for managing repayments, connects graduates with similar balances, and helps with overpayment refund claims',
    agent_focus:
      "For Plan 2 borrowers, average projected repayment: 38 years before write-off. 83% will never fully repay. Built a calculator so rioters can see their own numbers.",
    human_focus:
      "Helping rioters who've accidentally overpaid (earned under threshold but still charged) claim refunds. 12 refunds processed — average £340 each.",
  },

  // ── EMPLOYMENT ──
  {
    name_match: 'AI Replacing Jobs',
    agent_helps:
      'Tracks which sectors are most affected, maps retraining options, and helps you understand what protections exist',
    human_helps:
      'Connects people in affected industries, shares reskilling resources, and helps coordinate responses to workplace AI changes',
    agent_focus:
      'Compiled data from 300 rioters on AI changes at their workplace. 40% say tasks have been automated with no consultation. Building a report.',
    human_focus:
      'Running peer support for rioters whose roles are changing. Sharing retraining resources and connecting people in the same industry.',
  },

  // NOTE: "Plastic Waste & Packaging" does NOT exist in the seed database — skipped
];

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const db = getDb();

  // Show which database we're connecting to and require confirmation
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:quiet-riots.db';
  const isProduction = dbUrl.includes('turso.io') && !dbUrl.includes('staging');
  const label = isProduction ? '⚠️  PRODUCTION' : dbUrl.includes('staging') ? 'STAGING' : 'LOCAL';
  console.log(`\nDatabase: ${label}`);
  console.log(`URL: ${dbUrl}\n`);

  if (!dryRun) {
    const ok = await confirm(
      isProduction
        ? '⚠️  You are about to write to the PRODUCTION database. Continue?'
        : 'Continue with seed?',
    );
    if (!ok) {
      console.log('Aborted.');
      process.exit(0);
    }
    console.log();
  }

  if (dryRun) {
    console.log('=== DRY RUN — no changes will be written ===\n');
  }

  // ── 1. Insert category_assistants ──

  const assistantSql = `INSERT INTO category_assistants (
    id, category,
    agent_name, agent_icon, agent_quote, agent_bio, agent_gradient_start, agent_gradient_end,
    human_name, human_icon, human_quote, human_bio, human_gradient_start, human_gradient_end,
    goal, focus, focus_detail, profile_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let assistantCount = 0;

  for (const a of categoryAssistants) {
    const id = generateId();
    const args = [
      id,
      a.category,
      a.agent_name,
      a.agent_icon,
      a.agent_quote,
      a.agent_bio,
      a.agent_gradient_start,
      a.agent_gradient_end,
      a.human_name,
      a.human_icon,
      a.human_quote,
      a.human_bio,
      a.human_gradient_start,
      a.human_gradient_end,
      a.goal,
      a.focus,
      a.focus_detail,
      a.profile_url,
    ];

    if (dryRun) {
      console.log(`  [DRY] Would insert: ${a.agent_name} & ${a.human_name} (${a.category})`);
    } else {
      await db.execute({ sql: assistantSql, args });
    }
    assistantCount++;
  }

  console.log(`\nAssistants: ${assistantCount} pairs ${dryRun ? 'would be' : ''} inserted.`);

  // ── 2. Insert assistant_activity ──

  const activitySql = `INSERT INTO assistant_activity (
    id, category, assistant_type, activity_type, description, stat_value, stat_label, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  let activityCount = 0;

  for (const entry of activityEntries) {
    const id = generateId();
    const createdAt = daysAgoISO(entry.days_ago);
    const args = [
      id,
      entry.category,
      entry.assistant_type,
      entry.activity_type,
      entry.description,
      entry.stat_value,
      entry.stat_label,
      createdAt,
    ];

    if (dryRun) {
      console.log(
        `  [DRY] Would insert activity: [${entry.category}] ${entry.assistant_type} — ${entry.activity_type}`,
      );
    } else {
      await db.execute({ sql: activitySql, args });
    }
    activityCount++;
  }

  console.log(`Activity: ${activityCount} entries ${dryRun ? 'would be' : ''} inserted.`);

  // ── 3. Update issues with per-riot assistant copy ──

  let updatedCount = 0;
  let unmatchedCount = 0;
  const unmatchedNames: string[] = [];

  for (const copy of perRiotCopy) {
    const isLikePattern = copy.name_match.includes('%');
    const whereClause = isLikePattern
      ? `name LIKE ? COLLATE NOCASE`
      : `name = ? COLLATE NOCASE`;

    // Check if the issue exists
    const checkSql = `SELECT COUNT(*) as cnt FROM issues WHERE ${whereClause}`;
    const checkResult = await db.execute({ sql: checkSql, args: [copy.name_match] });
    const count = Number((checkResult.rows[0] as Record<string, unknown>).cnt);

    if (count === 0) {
      unmatchedCount++;
      unmatchedNames.push(copy.name_match);
      continue;
    }

    const updateSql = `UPDATE issues SET
      agent_helps = ?,
      human_helps = ?,
      agent_focus = ?,
      human_focus = ?
    WHERE ${whereClause}`;
    const args = [
      copy.agent_helps,
      copy.human_helps,
      copy.agent_focus,
      copy.human_focus,
      copy.name_match,
    ];

    if (dryRun) {
      console.log(
        `  [DRY] Would update issue: ${copy.name_match} (${count} match${count > 1 ? 'es' : ''})`,
      );
    } else {
      await db.execute({ sql: updateSql, args });
    }
    updatedCount += count;
  }

  console.log(`Issues: ${updatedCount} updated, ${unmatchedCount} unmatched.`);
  if (unmatchedNames.length > 0) {
    console.log(`  Unmatched names: ${unmatchedNames.join(', ')}`);
  }

  // ── Summary ──
  console.log(
    `\nDone! Inserted ${assistantCount} assistants, ${activityCount} activity entries, updated ${updatedCount} issues (${unmatchedCount} unmatched)`,
  );

  if (dryRun) {
    console.log('\n(No changes were made — remove --dry-run to execute.)');
  }
}

main().catch((err) => {
  console.error('Seed assistants failed:', err);
  process.exit(1);
});
