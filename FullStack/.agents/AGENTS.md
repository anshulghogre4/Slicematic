# Slicemate Agent Rules

## Skill Utilization (CRITICAL)
Whenever you (Antigravity, Claude Code, or any other agent) are invoked by a collaborator on this project, you **MUST** prioritize utilizing the custom skills available in the `.agents/skills` directory. 

Before implementing features from scratch, modifying the database schema, or updating the frontend, you must review the existing skills to ensure you are following the project's established best practices.

Specifically:
- If working with Postgres or Supabase, leverage the `supabase-postgres-best-practices` skill.
- If making major architectural changes or Next.js App Router modifications, leverage the relevant frontend and fullstack developer skills.
- Ensure any generated code adheres to the standards defined by the code-review-excellence skill.

Do not ignore these skills. Actively look for and apply them to your tasks.

## Changelog Protocol (MANDATORY)
Whenever you are about to push code to the repository (or right before finalizing a feature/session), you **MUST** update the `CHANGELOG.md` file in the root of the `FullStack` directory.

- Add a new timestamp-based entry (e.g., `### [YYYY-MM-DD HH:MM:SS] - Short Title`).
- Briefly summarize the problem/context, and list the exact changes and fixes applied.
- This is critical to maintain a strict chronology of how the project evolves over time.

## UI & Styling Guidelines (CRITICAL)
Whenever you make updates to any UI-related files (such as `.css`, `.tsx`, or `.ts` components), you **MUST** consult and apply the UI-based skills included in this project (e.g., `tailwind-design-system`, `modern-web-guidance`, or any frontend pattern skills).
- Never introduce arbitrary CSS classes or inline styles without checking if they align with the established design system.
- Always ensure that your styling and UI structure changes strictly follow the correct, documented project guidelines.
