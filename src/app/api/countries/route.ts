import { getDb } from '@/lib/db';
import { apiOk } from '@/lib/api-response';

export async function GET() {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT code, name FROM countries ORDER BY name',
    args: [],
  });

  const countries = result.rows.map((row) => ({
    code: row.code as string,
    name: row.name as string,
  }));

  const response = apiOk(countries);
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return response;
}
