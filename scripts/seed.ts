import { seed } from '../src/lib/seed';

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
