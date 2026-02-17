---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
  - "src/app/**/page.tsx"
---

# Component Rules

- Prefer async server components by default — only add `"use client"` for interactive parts
- Mobile-first CSS with Tailwind — design for small screens, scale up with breakpoints
- Keep components small and focused
- Follow the existing directory structure: cards/, data/, interactive/, layout/
- TypeScript strict mode — no `any` types without justification
