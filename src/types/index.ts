export type Category =
  | 'Transport'
  | 'Telecoms'
  | 'Banking'
  | 'Health'
  | 'Education'
  | 'Environment'
  | 'Energy'
  | 'Water'
  | 'Insurance'
  | 'Housing'
  | 'Shopping'
  | 'Delivery'
  | 'Local'
  | 'Employment'
  | 'Tech'
  | 'Other';

export interface Issue {
  id: number;
  name: string;
  category: Category;
  description: string;
  rioter_count: number;
  country_count: number;
  trending_delta: number;
  created_at: string;
}

export interface Organisation {
  id: number;
  name: string;
  category: Category;
  logo_emoji: string;
  description: string;
  sector: string | null;
  country: string;
  regulator: string | null;
  ombudsman: string | null;
  website: string | null;
}

export interface IssueOrganisation {
  id: number;
  issue_id: number;
  organisation_id: number;
  rioter_count: number;
  rank: number;
}

export interface Synonym {
  id: number;
  issue_id: number;
  term: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  time_available: '1min' | '10min' | '1hr+';
  skills: string;
  created_at: string;
}

export interface UserIssue {
  id: number;
  user_id: number;
  issue_id: number;
  joined_at: string;
}

export interface Action {
  id: number;
  issue_id: number;
  title: string;
  description: string;
  type: 'idea' | 'action' | 'together';
  time_required: '1min' | '10min' | '1hr+';
  skills_needed: string;
  external_url: string | null;
  provider_name: string | null;
}

export interface FeedPost {
  id: number;
  issue_id: number;
  user_id: number;
  user_name?: string;
  content: string;
  likes: number;
  created_at: string;
}

export interface CommunityHealth {
  id: number;
  issue_id: number;
  needs_met: number;
  membership: number;
  influence: number;
  connection: number;
}

export interface ExpertProfile {
  id: number;
  issue_id: number;
  name: string;
  role: string;
  speciality: string;
  achievement: string;
  avatar_emoji: string;
}

export interface CountryBreakdown {
  id: number;
  issue_id: number;
  country_code: string;
  country_name: string;
  rioter_count: number;
}

export interface SeasonalPattern {
  id: number;
  issue_id: number;
  peak_months: string;
  description: string;
}

export interface IssueRelation {
  id: number;
  child_id: number;
  parent_id: number;
  relation_type: 'specific_of' | 'related_to' | 'subset_of';
}

// Pivot types
export interface IssuePivotRow {
  organisation_id: number;
  organisation_name: string;
  logo_emoji: string;
  rioter_count: number;
  rank: number;
}

export interface OrgPivotRow {
  issue_id: number;
  issue_name: string;
  rioter_count: number;
  rank: number;
}

export const CATEGORIES: Category[] = [
  'Transport',
  'Telecoms',
  'Energy',
  'Water',
  'Banking',
  'Insurance',
  'Health',
  'Housing',
  'Shopping',
  'Delivery',
  'Education',
  'Environment',
  'Local',
  'Employment',
  'Tech',
  'Other',
];

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  Transport: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  Telecoms: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  Energy: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  Water: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  Banking: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  Insurance: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  Health: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  Housing: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  Shopping: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
  },
  Delivery: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  Education: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  Environment: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  Local: {
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
  },
  Employment: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
  },
  Tech: {
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
  },
  Other: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  Transport: '🚂',
  Telecoms: '📶',
  Energy: '⚡',
  Water: '💧',
  Banking: '🏦',
  Insurance: '🛡️',
  Health: '🏥',
  Housing: '🏠',
  Shopping: '🛒',
  Delivery: '📦',
  Education: '🎓',
  Environment: '🌍',
  Local: '🏘️',
  Employment: '💼',
  Tech: '💻',
  Other: '📋',
};
