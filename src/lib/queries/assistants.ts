import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type {
  CategoryAssistant,
  AssistantActivity,
  UserAssistantIntroduction,
  AssistantClaim,
  AssistantCategory,
  Issue,
} from '@/types';

export interface AssistantWithStats extends CategoryAssistant {
  riot_count: number;
  rioter_count: number;
  action_count: number;
}

export interface AssistantDetail extends AssistantWithStats {
  riots: Pick<
    Issue,
    | 'id'
    | 'name'
    | 'rioter_count'
    | 'agent_helps'
    | 'human_helps'
    | 'agent_focus'
    | 'human_focus'
  >[];
  recent_activity: AssistantActivity[];
  messages_sent: number;
}

/**
 * Get all 16 assistant pairs with summary stats.
 */
export async function getAllAssistants(): Promise<AssistantWithStats[]> {
  const db = getDb();
  const result = await db.execute(`
    SELECT
      ca.*,
      COALESCE(stats.riot_count, 0) AS riot_count,
      COALESCE(stats.rioter_count, 0) AS rioter_count,
      COALESCE(stats.action_count, 0) AS action_count
    FROM category_assistants ca
    LEFT JOIN (
      SELECT
        LOWER(i.category) AS cat,
        COUNT(DISTINCT i.id) AS riot_count,
        SUM(i.rioter_count) AS rioter_count,
        COUNT(DISTINCT a.id) AS action_count
      FROM issues i
      LEFT JOIN actions a ON a.issue_id = i.id
      GROUP BY LOWER(i.category)
    ) stats ON stats.cat = ca.category
    ORDER BY stats.rioter_count DESC
  `);
  return result.rows as unknown as AssistantWithStats[];
}

/**
 * Get a single assistant pair by category.
 */
export async function getAssistantByCategory(
  category: string,
): Promise<CategoryAssistant | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM category_assistants WHERE LOWER(category) = LOWER(?)',
    args: [category],
  });
  return (result.rows[0] as unknown as CategoryAssistant) ?? null;
}

/**
 * Get full detail for a category's assistant pair including riots, activity, and stats.
 */
export async function getAssistantDetail(
  category: string,
): Promise<AssistantDetail | null> {
  const db = getDb();

  // Get the assistant pair
  const assistantResult = await db.execute({
    sql: 'SELECT * FROM category_assistants WHERE LOWER(category) = LOWER(?)',
    args: [category],
  });
  const assistant = assistantResult.rows[0] as unknown as CategoryAssistant;
  if (!assistant) return null;

  // Get stats, riots, and activity in parallel
  const [statsResult, riotsResult, activityResult, messageResult] = await Promise.all([
    db.execute({
      sql: `SELECT
              COUNT(DISTINCT i.id) AS riot_count,
              COALESCE(SUM(i.rioter_count), 0) AS rioter_count,
              COUNT(DISTINCT a.id) AS action_count
            FROM issues i
            LEFT JOIN actions a ON a.issue_id = i.id
            WHERE LOWER(i.category) = ?`,
      args: [category],
    }),
    db.execute({
      sql: `SELECT id, name, rioter_count, agent_helps, human_helps, agent_focus, human_focus
            FROM issues
            WHERE LOWER(category) = ?
            ORDER BY rioter_count DESC`,
      args: [category],
    }),
    db.execute({
      sql: `SELECT * FROM assistant_activity
            WHERE category = ?
            ORDER BY created_at DESC
            LIMIT 10`,
      args: [category],
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(stat_value), 0) AS total
            FROM assistant_activity
            WHERE category = ? AND activity_type IN ('sent_messages', 'welcomed_rioters')`,
      args: [category],
    }),
  ]);

  const stats = statsResult.rows[0] as unknown as {
    riot_count: number;
    rioter_count: number;
    action_count: number;
  };

  return {
    ...assistant,
    riot_count: stats.riot_count,
    rioter_count: stats.rioter_count,
    action_count: stats.action_count,
    riots: riotsResult.rows as unknown as AssistantDetail['riots'],
    recent_activity: activityResult.rows as unknown as AssistantActivity[],
    messages_sent: (messageResult.rows[0] as unknown as { total: number }).total,
  };
}

/**
 * Get paginated activity for a category.
 */
export async function getAssistantActivity(
  category: string,
  limit = 20,
  offset = 0,
  type?: 'agent' | 'human',
): Promise<AssistantActivity[]> {
  const db = getDb();
  let query = 'SELECT * FROM assistant_activity WHERE category = ?';
  const args: (string | number)[] = [category];

  if (type) {
    query += ' AND assistant_type = ?';
    args.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as AssistantActivity[];
}

/**
 * Create a claim for the human assistant role.
 */
export async function createAssistantClaim(
  category: string,
  userId: string,
  message?: string,
): Promise<AssistantClaim> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO assistant_claims (id, category, user_id, message) VALUES (?, ?, ?, ?)`,
    args: [id, category, userId, message ?? null],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM assistant_claims WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as AssistantClaim;
}

/**
 * Get categories where a user has been introduced to assistants.
 */
export async function getUserMetAssistants(
  userId: string,
): Promise<AssistantCategory[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT category FROM user_assistant_introductions WHERE user_id = ? ORDER BY introduced_at ASC',
    args: [userId],
  });
  return result.rows.map((r) => (r as unknown as { category: AssistantCategory }).category);
}

/**
 * Record that a user has met a category's assistants.
 */
export async function recordAssistantIntroduction(
  userId: string,
  category: string,
): Promise<UserAssistantIntroduction> {
  const db = getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO user_assistant_introductions (user_id, category) VALUES (?, ?)`,
    args: [userId, category],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM user_assistant_introductions WHERE user_id = ? AND category = ?',
    args: [userId, category],
  });
  return result.rows[0] as unknown as UserAssistantIntroduction;
}

/**
 * Create a suggestion as an idea action and log agent activity.
 */
export async function createSuggestion(
  userId: string,
  issueId: string,
  suggestionText: string,
): Promise<{
  actionId: string;
  agentName: string;
  humanName: string;
  category: AssistantCategory;
}> {
  const db = getDb();

  // Get the issue's category to find the right assistants
  const issueResult = await db.execute({
    sql: 'SELECT category FROM issues WHERE id = ?',
    args: [issueId],
  });
  if (issueResult.rows.length === 0) {
    throw new Error('Issue not found');
  }
  const issueCategory = (issueResult.rows[0] as unknown as { category: string }).category;
  const assistantCategory = issueCategory.toLowerCase();

  // Get assistant names
  const assistantResult = await db.execute({
    sql: 'SELECT agent_name, human_name FROM category_assistants WHERE category = ?',
    args: [assistantCategory],
  });
  const assistant = assistantResult.rows[0] as unknown as {
    agent_name: string;
    human_name: string;
  };
  if (!assistant) {
    throw new Error('No assistants found for category');
  }

  // Create the idea action
  const actionId = generateId();
  await db.execute({
    sql: `INSERT INTO actions (id, issue_id, title, description, type, time_required)
          VALUES (?, ?, ?, ?, 'idea', '10min')`,
    args: [actionId, issueId, suggestionText.slice(0, 255), suggestionText],
  });

  // Log assistant activity
  const activityId = generateId();
  await db.execute({
    sql: `INSERT INTO assistant_activity (id, category, assistant_type, activity_type, description, stat_value, stat_label)
          VALUES (?, ?, 'agent', 'reviewed_actions', ?, 1, 'suggestions')`,
    args: [activityId, assistantCategory, `Reviewed suggestion: ${suggestionText.slice(0, 100)}`],
  });

  return {
    actionId,
    agentName: assistant.agent_name,
    humanName: assistant.human_name,
    category: assistantCategory as AssistantCategory,
  };
}
