export type Category =
  | 'Transport'
  | 'Telecoms'
  | 'Banking'
  | 'Health'
  | 'Education'
  | 'Environment';

export interface Issue {
  id: string;
  name: string;
  category: Category;
  description: string;
  rioter_count: number;
  country_count: number;
  trending_delta: number;
  created_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  category: Category;
  logo_emoji: string;
  description: string;
}

export interface IssueOrganisation {
  id: string;
  issue_id: string;
  organisation_id: string;
  rioter_count: number;
  rank: number;
}

export interface Synonym {
  id: string;
  issue_id: string;
  term: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  time_available: '1min' | '10min' | '1hr+';
  skills: string;
  created_at: string;
}

export interface UserIssue {
  id: string;
  user_id: string;
  issue_id: string;
  joined_at: string;
}

export interface Action {
  id: string;
  issue_id: string;
  title: string;
  description: string;
  type: 'idea' | 'action' | 'together';
  time_required: '1min' | '10min' | '1hr+';
  skills_needed: string;
  external_url: string | null;
  provider_name: string | null;
}

export interface FeedPost {
  id: string;
  issue_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  likes: number;
  created_at: string;
}

export interface CommunityHealth {
  id: string;
  issue_id: string;
  needs_met: number;
  membership: number;
  influence: number;
  connection: number;
}

export interface ExpertProfile {
  id: string;
  issue_id: string;
  name: string;
  role: string;
  speciality: string;
  achievement: string;
  avatar_emoji: string;
}

export interface CountryBreakdown {
  id: string;
  issue_id: string;
  country_code: string;
  country_name: string;
  rioter_count: number;
}

// Pivot types
export interface IssuePivotRow {
  organisation_id: string;
  organisation_name: string;
  logo_emoji: string;
  rioter_count: number;
  rank: number;
}

export interface OrgPivotRow {
  issue_id: string;
  issue_name: string;
  rioter_count: number;
  rank: number;
}

export const CATEGORIES: Category[] = [
  'Transport',
  'Telecoms',
  'Banking',
  'Health',
  'Education',
  'Environment',
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
  Banking: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  Health: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
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
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  Transport: '🚂',
  Telecoms: '📶',
  Banking: '🏦',
  Health: '🏥',
  Education: '🎓',
  Environment: '🌍',
};
