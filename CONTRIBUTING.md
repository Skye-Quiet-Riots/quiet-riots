# Contributing to Quiet Riots

Thanks for your interest in contributing!

## Getting Started

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/Skye-Quiet-Riots/quiet-riots.git
   cd quiet-riots
   npm install
   ```

2. Copy the environment file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

3. Seed the database and start the dev server:
   ```bash
   npm run seed
   npm run dev
   ```

## Branch Naming

- `feature/short-description` — new features
- `fix/short-description` — bug fixes
- `docs/short-description` — documentation changes

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm test` and `npm run build` to check everything passes
4. Commit with a clear message describing what and why
5. Open a pull request against `main`

## Code Style

- TypeScript strict mode — no `any` types
- Functional React components with hooks
- Server components by default, `"use client"` only when needed
- Mobile-first CSS with Tailwind
- Prettier formats code on commit (via Husky + lint-staged)

## Testing

- Write tests for business logic, API endpoints, and data handling
- When fixing a bug, add a regression test
- Run the full suite: `npm test`
- Run with coverage: `npm run test:coverage`

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Ensure all tests pass and the build succeeds
