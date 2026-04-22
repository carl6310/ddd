# AGENTS.md

## Repository Identity

This repository is a **local-first, single-user writing workbench**, not a cloud SaaS product.

Core assumptions to preserve:
- Single repo
- Local-first runtime
- SQLite persistence
- Workflow / stage driven UX
- Mixed model + deterministic rule system
- Markdown export as a core output

Phase 1 job infrastructure already exists. Reuse and extend it. Do **not** create a second async path, a second worker model, or a parallel queue abstraction unless the task explicitly requires replacing the current one.

## Architecture Rules

1. **Preserve the product shape**
   - Do not turn this into a multi-user web app.
   - Do not add auth, RBAC, multi-tenant concepts, cloud object storage, or search infra.
   - Do not introduce Postgres, Redis, BullMQ, microservices, or external queue brokers.

2. **Keep the workflow mental model intact**
   - API routes represent stage actions, not generic CRUD only.
   - `ProjectBundle` remains the canonical read model for workbench UI and export flows.
   - Deterministic workflow gates and review rules remain hard constraints, even when model calls are involved.

3. **Prefer thinner routes over fatter routes**
   - Route handlers should parse input, call a service / enqueue a job, and shape the response.
   - Business orchestration belongs in `lib/services/*`, `lib/jobs/*`, or similarly scoped domain modules.

4. **Respect compatibility layers**
   - Do not remove legacy compatibility fields or transforms in the same PR that introduces a refactor.
   - If touching ThinkCard / StyleCore <-> legacy frame mapping, keep writes centralized and document the behavior.

5. **Keep exports and stored artifacts stable**
   - Avoid breaking Markdown export structure unless the task explicitly targets export changes.
   - Keep existing persisted project artifacts readable after schema changes.

## Working Mode For Codex

1. Start every non-trivial task with `/plan`.
2. Read, in order, before editing:
   - `AGENTS.md`
   - architecture docs in `docs/` if present
   - `package.json`
   - touched route / service / repository files
3. Make the smallest vertical slice that completes the requested phase.
4. Reuse existing patterns before inventing new abstractions.
5. Do not silently broaden scope into later phases.
6. Do not claim checks passed unless they were actually run.

## Important Files To Inspect First

- `app/page.tsx`
- `components/project-workbench.tsx`
- `lib/db.ts`
- `lib/repository.ts`
- `lib/workflow.ts`
- `lib/llm.ts`
- `lib/prompt-engine.ts`
- `lib/review.ts`
- `lib/markdown.ts`
- `lib/types.ts`

If present after Phase 1, inspect these before changing any long-running step:
- `lib/jobs/*`
- `lib/services/steps/*`
- `scripts/worker.ts`
- job-related route files under `app/api/jobs/*`
- any polling hooks / workbench job status components

## Commands And Validation

Always inspect `package.json` before assuming scripts exist.

Known core scripts from the current repo architecture:
- `npm run dev`
- `npm run dev:all`
- `npm run build`
- `npm run start`
- `npm run worker`
- `npm run worker:once`
- `npm run lint`
- `npm run typecheck`
- `npm run import-samples`
- `npm run backfill-project-frames`

Additional rules:
- If worker or test scripts already exist, use the existing script names instead of inventing new ones.
- Run the smallest relevant check after each meaningful slice.
- Before finishing, run the broadest relevant checks available for the scope.
- If no test script exists for a touched subsystem, add the minimum test coverage appropriate for that PR and run it.

## Dependency Policy

- Default to **no new production dependency**.
- If a new dependency is materially justified, keep it to one small dependency per PR and explain why built-ins or existing utilities were not enough.
- Avoid framework churn and avoid swapping core libraries unless explicitly requested.

## Schema And Data Rules

- Any schema change must come with a migration or explicit backfill / upgrade path.
- Preserve the ability to open existing local databases.
- Avoid opportunistic schema cleanup in unrelated PRs.
- For data migrations, document rollback / fallback behavior.

## UI Rules

- Preserve the workbench interaction model.
- Any new async state must have loading, success, error, and recoverability behavior.
- Prefer incremental UI additions over large component rewrites.

## Definition Of Done

A task is only done when all of the following are true:
- The requested scope is implemented without silently expanding into later phases.
- Relevant code paths compile / typecheck.
- Relevant lint and tests pass, or missing coverage is explicitly added and run.
- Schema changes include migration / upgrade handling.
- User-visible behavior changes are reflected in the workbench and documented.
- The final summary includes:
  - what changed
  - files changed
  - checks run
  - risks / follow-ups
  - rollback notes when applicable

## PR Shape

One PR should usually equal one vertical slice.

Good examples:
- one step moved onto the existing job system
- one state-machine capability added with tests
- one migration runner added with docs and validation

Bad examples:
- route refactor + state-machine rewrite + export redesign in one PR
- migration framework + evidence system + UI polish in one PR

## Codex Workflow Assets

These repo-local files support future Codex work:
- `docs/codex-pr-plan-checklist.md`: recommended phase queue and PR review checklist
- `.codex/prompts/codex-phase2-prompt.md`: ready-to-run phase 2 execution brief
- `docs/codex-workflow-assets.md`: how to use these assets together

Use them as development guidance. They are **not** runtime application inputs.
