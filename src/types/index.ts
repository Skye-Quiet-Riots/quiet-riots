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

export type IssueStatus = 'pending_review' | 'active' | 'rejected';

export interface Issue {
  id: string;
  name: string;
  category: Category;
  description: string;
  rioter_count: number;
  country_count: number;
  trending_delta: number;
  created_at: string;
  agent_helps: string | null;
  human_helps: string | null;
  agent_focus: string | null;
  human_focus: string | null;
  country_scope: 'global' | 'country';
  primary_country: string | null;
  status: IssueStatus;
  first_rioter_id: string | null;
  approved_at: string | null;
  hero_image_url: string | null;
  hero_thumb_url: string | null;
}

export type OrganisationStatus = 'pending_review' | 'active' | 'rejected';

export interface Organisation {
  id: string;
  name: string;
  category: Category;
  logo_emoji: string;
  description: string;
  sector: string | null;
  country: string;
  regulator: string | null;
  ombudsman: string | null;
  website: string | null;
  status: OrganisationStatus;
  first_rioter_id: string | null;
  approved_at: string | null;
  hero_image_url: string | null;
  hero_thumb_url: string | null;
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

export type UserStatus = 'active' | 'deactivated' | 'deleted';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  time_available: '1min' | '10min' | '1hr+';
  skills: string;
  created_at: string;
  // Profile fields (Phase 0 — global rearchitecture)
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  // Global identity
  country_code: string | null;
  language_code: string;
  // Auth
  email_verified: number;
  phone_verified: number;
  // Account management
  status: UserStatus;
  deactivated_at: string | null;
  session_version: number;
  // Onboarding
  onboarding_completed: number;
  // Password auth
  password_hash: string | null;
  password_changed_at: string | null;
  // Merge tracking
  merged_into_user_id: string | null;
}

/**
 * Safe user profile projection — excludes PII and sensitive auth fields.
 * Use this when returning user data to external consumers (bot API, public endpoints).
 */
export type SafeUserProfile = Omit<
  User,
  'email' | 'phone' | 'password_hash' | 'password_changed_at' | 'session_version' | 'merged_into_user_id'
>;

/** Strip sensitive fields from a User object for external consumption. */
export function safeProfile(user: User): SafeUserProfile {
  const {
    email: _email,
    phone: _phone,
    password_hash: _hash,
    password_changed_at: _pwChanged,
    session_version: _sv,
    merged_into_user_id: _merged,
    ...safe
  } = user;
  return safe;
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
  user_avatar?: string | null;
  user_country_code?: string | null;
  content: string;
  likes: number;
  photo_urls?: string;
  comments_count?: number;
  shares?: number;
  created_at: string;
}

export interface FeedComment {
  id: string;
  feed_id: string;
  user_id: string;
  user_name?: string;
  content: string;
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

export interface SeasonalPattern {
  id: string;
  issue_id: string;
  peak_months: string;
  description: string;
}

export interface IssueRelation {
  id: string;
  child_id: string;
  parent_id: string;
  relation_type: 'specific_of' | 'related_to' | 'subset_of';
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

// Riot Reels
export interface RiotReel {
  id: string;
  issue_id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  caption: string;
  submitted_by: string | null;
  source: 'curated' | 'community' | 'ai_suggested';
  status: 'pending' | 'approved' | 'featured' | 'rejected';
  upvotes: number;
  views: number;
  created_at: string;
}

export interface ReelVote {
  reel_id: string;
  user_id: string;
  vote: number;
  voted_at: string;
}

export interface ReelShownLog {
  user_id: string;
  reel_id: string;
  issue_id: string;
  shown_at: string;
}

// Riot Wallet
export type ActionInitiativeStatus = 'active' | 'goal_reached' | 'delivered' | 'cancelled';
export type WalletTransactionType = 'topup' | 'payment' | 'refund' | 'share_consideration';

export interface Wallet {
  id: string;
  user_id: string;
  balance_pence: number;
  total_loaded_pence: number;
  total_spent_pence: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount_pence: number;
  action_initiative_id: string | null;
  issue_id: string | null;
  stripe_payment_id: string | null;
  description: string;
  completed_at: string | null;
  currency_code: string;
  created_at: string;
}

export interface ActionInitiative {
  id: string;
  issue_id: string;
  org_id: string | null;
  title: string;
  description: string;
  target_pence: number;
  committed_pence: number;
  supporter_count: number;
  recipient: string | null;
  recipient_url: string | null;
  status: ActionInitiativeStatus;
  service_fee_pct: number;
  currency_code: string;
  goal_reached_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

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

// Category Assistants
export type AssistantCategory =
  | 'transport'
  | 'telecoms'
  | 'banking'
  | 'health'
  | 'education'
  | 'environment'
  | 'energy'
  | 'water'
  | 'insurance'
  | 'housing'
  | 'shopping'
  | 'delivery'
  | 'local'
  | 'employment'
  | 'tech'
  | 'other';

export const ASSISTANT_CATEGORIES: AssistantCategory[] = [
  'transport',
  'telecoms',
  'energy',
  'water',
  'banking',
  'insurance',
  'health',
  'housing',
  'shopping',
  'delivery',
  'education',
  'environment',
  'local',
  'employment',
  'tech',
  'other',
];

export function toAssistantCategory(category: Category): AssistantCategory {
  return category.toLowerCase() as AssistantCategory;
}

export interface CategoryAssistant {
  id: string;
  category: AssistantCategory;
  agent_name: string;
  agent_icon: string;
  agent_quote: string | null;
  agent_bio: string | null;
  agent_gradient_start: string | null;
  agent_gradient_end: string | null;
  human_name: string;
  human_icon: string;
  human_quote: string | null;
  human_bio: string | null;
  human_gradient_start: string | null;
  human_gradient_end: string | null;
  human_user_id: string | null;
  goal: string | null;
  focus: string | null;
  focus_detail: string | null;
  profile_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssistantActivity {
  id: string;
  category: AssistantCategory;
  assistant_type: 'agent' | 'human';
  activity_type: string;
  description: string;
  stat_value: number | null;
  stat_label: string | null;
  created_at: string;
}

export interface UserAssistantIntroduction {
  user_id: string;
  category: AssistantCategory;
  introduced_at: string;
}

export interface AssistantClaim {
  id: string;
  category: AssistantCategory;
  user_id: string;
  message: string | null;
  created_at: string;
}

// Evidence
export type EvidenceMediaType = 'text' | 'photo' | 'video' | 'link' | 'live_stream';

export interface Evidence {
  id: string;
  issue_id: string;
  org_id: string | null;
  user_id: string;
  user_name?: string;
  org_name?: string;
  issue_name?: string;
  content: string;
  media_type: EvidenceMediaType;
  photo_urls: string;
  video_url: string | null;
  external_urls: string;
  live: number;
  likes: number;
  comments_count: number;
  shares: number;
  created_at: string;
}

export interface EvidenceComment {
  id: string;
  evidence_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

// i18n (Phase 0 — global rearchitecture)
export type TextDirection = 'ltr' | 'rtl';
export type TranslationSource = 'manual' | 'machine' | 'reviewed';

export interface Language {
  code: string;
  name: string;
  native_name: string;
  direction: TextDirection;
}

export interface Country {
  code: string;
  name: string;
  default_language: string | null;
  currency_code: string | null;
  phone_prefix: string | null;
}

export interface Translation {
  id: string;
  entity_type: string;
  entity_id: string;
  field: string;
  language_code: string;
  value: string;
  source: TranslationSource;
}

// Auth (Phase 0 — global rearchitecture)
export type AccountType = 'oauth' | 'oidc' | 'email' | 'credentials';
export type LegalDocumentType = 'terms' | 'privacy' | 'cookie';
export type ConsentType = 'terms' | 'privacy' | 'cookie' | 'analytics';

export interface Account {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  type: AccountType;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: string;
}

export interface LegalDocument {
  id: string;
  country_code: string;
  document_type: LegalDocumentType;
  version: string;
  content_url: string;
  effective_date: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  document_type: ConsentType;
  version: string;
  country_code: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

// Privacy & Compliance (Phase 4)
export type LoginEventType =
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'password_reset'
  | 'account_locked';

export interface NotificationPreferences {
  user_id: string;
  security: number;
  product_updates: number;
  action_initiative_updates: number;
  weekly_digest: number;
}

export interface LoginEvent {
  id: string;
  user_id: string | null;
  event_type: LoginEventType;
  ip_address: string | null;
  user_agent: string | null;
  provider: string | null;
  created_at: string;
}

// Social Features (Phase 5)
export type ReportEntityType = 'feed' | 'evidence' | 'reel' | 'user';
export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface UserBlock {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  entity_type: ReportEntityType;
  entity_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
}

// User Memory (persistent bot context across sessions)
export type MemoryCategory = 'preference' | 'context' | 'goal' | 'emotional' | 'general';

export interface UserMemory {
  id: string;
  user_id: string;
  memory_key: string;
  memory_value: string;
  category: MemoryCategory;
  created_at: string;
  updated_at: string;
}

// Bot Analytics
export interface BotEvent {
  id: string;
  action: string;
  user_id: string | null;
  issue_id: string | null;
  duration_ms: number | null;
  status: 'ok' | 'error';
  error_message: string | null;
  metadata: string | null;
  created_at: string;
}

// User Roles
export type RoleType =
  | 'setup_guide'
  | 'administrator'
  | 'share_guide'
  | 'compliance_guide'
  | 'treasury_guide';

export interface UserRole {
  id: string;
  user_id: string;
  role: RoleType;
  assigned_by: string | null;
  created_at: string;
}

// Issue Suggestions (waiting room for new Quiet Riots)
export type SuggestionStatus =
  | 'pending_review'
  | 'more_info_requested'
  | 'approved'
  | 'translations_ready'
  | 'live'
  | 'rejected'
  | 'merged';

export type SuggestedType = 'issue' | 'organisation';

export type RejectionReason = 'close_to_existing' | 'about_people' | 'illegal_subject' | 'other';

export interface IssueSuggestion {
  id: string;
  suggested_by: string;
  original_text: string;
  suggested_name: string;
  suggested_type: SuggestedType;
  category: Category;
  description: string;
  status: SuggestionStatus;
  issue_id: string | null;
  organisation_id: string | null;
  merged_into_issue_id: string | null;
  merged_into_org_id: string | null;
  reviewer_id: string | null;
  rejection_reason: RejectionReason | null;
  rejection_detail: string | null;
  close_match_ids: string | null;
  public_recognition: number;
  first_rioter_notified: number;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  live_at: string | null;
  created_at: string;
  language_code: string;
  updated_at: string;
}

// Messages / Inbox
export type MessageType =
  | 'suggestion_received'
  | 'suggestion_approved'
  | 'suggestion_rejected'
  | 'suggestion_merged'
  | 'suggestion_more_info'
  | 'suggestion_live'
  | 'suggestion_progress'
  | 'role_assigned'
  | 'general'
  | 'share_available'
  | 'share_approved'
  | 'share_identity_needed'
  | 'share_issued'
  | 'share_rejected'
  | 'share_question'
  | 'share_payment_received'
  | 'share_refunded';

export type MessageEntityType =
  | 'issue_suggestion'
  | 'issue'
  | 'organisation'
  | 'user'
  | 'share_application';

export interface Message {
  id: string;
  recipient_id: string;
  sender_name: string | null;
  type: MessageType;
  subject: string;
  body: string;
  entity_type: MessageEntityType | null;
  entity_id: string | null;
  read: number;
  whatsapp_message: string | null;
  whatsapp_delivered_at: string | null;
  whatsapp_expires_at: string | null;
  whatsapp_attempts: number;
  created_at: string;
}

// ── Global Share Scheme ─────────────────────────────────────────────────

export type ShareStatus =
  | 'not_eligible'
  | 'available'
  | 'under_review'
  | 'approved'
  | 'identity_submitted'
  | 'forwarded_senior'
  | 'issued'
  | 'declined'
  | 'rejected'
  | 'withdrawn';

export type ShareGender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';

export type IdDocumentType = 'passport' | 'national_id' | 'driving_licence' | 'other';

export type ShareSenderRole =
  | 'applicant'
  | 'share_guide'
  | 'compliance_guide'
  | 'senior_compliance';

export interface ShareApplication {
  id: string;
  user_id: string;
  status: ShareStatus;
  // Eligibility snapshots
  riots_joined_at_offer: number | null;
  actions_at_offer: number | null;
  eligible_at: string | null;
  // Payment
  payment_transaction_id: string | null;
  payment_amount_pence: number | null;
  // Share Guide review
  share_guide_id: string | null;
  share_guide_decision_at: string | null;
  share_guide_notes: string | null;
  // Compliance Guide review
  compliance_guide_id: string | null;
  compliance_decision_at: string | null;
  compliance_notes: string | null;
  // Senior Compliance review
  senior_compliance_id: string | null;
  senior_decision_at: string | null;
  senior_notes: string | null;
  // Rejection / reapply
  rejection_reason: string | null;
  reapply_count: number;
  // Certificate
  certificate_number: string | null;
  issued_at: string | null;
  // Tracking
  last_notification_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareIdentity {
  id: string;
  application_id: string;
  user_id: string;
  // Personal details (encrypted at application level)
  legal_first_name: string;
  legal_middle_name: string | null;
  legal_last_name: string;
  date_of_birth: string;
  gender: ShareGender | null;
  // Address (encrypted at application level)
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country_code: string;
  // Contact
  phone: string;
  // ID verification
  id_document_type: IdDocumentType | null;
  id_document_country: string | null;
  digital_verification_available: number;
  // Timestamps
  submitted_at: string;
  updated_at: string;
}

export interface ShareMessage {
  id: string;
  application_id: string;
  sender_id: string;
  sender_role: ShareSenderRole;
  content: string;
  created_at: string;
}

export interface ShareAuditEntry {
  id: string;
  application_id: string;
  actor_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface ShareStatusHistory {
  id: string;
  application_id: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  notes: string | null;
  created_at: string;
}

// Deploy a Chicken
export type ChickenDeploymentStatus =
  | 'paid'
  | 'accepted'
  | 'in_progress'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export interface ChickenPricing {
  id: string;
  country_code: string;
  currency: string;
  base_price_pence: number;
  distance_surcharge_pence: number;
  express_surcharge_pence: number;
  description: string | null;
  active: number;
  created_at: string;
}

export interface ChickenFulfiller {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string;
  country_code: string;
  radius_km: number;
  active: number;
  rating: number;
  deployments_completed: number;
  created_at: string;
}

export interface ChickenDeployment {
  id: string;
  user_id: string;
  issue_id: string | null;
  organisation_id: string | null;
  target_name: string;
  target_role: string | null;
  target_address: string;
  target_city: string;
  target_country: string;
  message_text: string;
  status: ChickenDeploymentStatus;
  pricing_id: string | null;
  amount_paid_pence: number;
  currency: string;
  express_delivery: number;
  estimated_delivery_date: string | null;
  fulfiller_id: string | null;
  fulfiller_notes: string | null;
  proof_photo_url: string | null;
  wallet_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface ChickenDeploymentWithDetails extends ChickenDeployment {
  issue_name?: string;
  organisation_name?: string;
  fulfiller_name?: string;
}

// Personal Activity Feed
export type ActivityType = 'feed_post' | 'evidence' | 'riot_reel';

export interface ActivityItem {
  activity_type: ActivityType;
  activity_id: string;
  issue_id: string;
  issue_name: string;
  user_name: string;
  content_snippet: string;
  created_at: string;
  likes: number;
  comments_count: number;
  shares: number;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  detail_url: string;
}

export interface PersonalFeedResult {
  activities: ActivityItem[];
  next_cursor: string | null;
}
