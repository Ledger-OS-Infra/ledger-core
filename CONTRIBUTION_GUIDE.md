# Contribution Guide

Thank you for contributing to **Ledger-Core**. This document covers how we work together on the Nomba x DevCareer Hackathon 2026 codebase.

## Getting started

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Ledger-OS-Infra/ledger--raas.git
   cd ledger-core
   npm install
   ```

2. Copy environment templates and fill in values (see app-specific READMEs under each package).

3. Pick an issue from [GitHub Issues](https://github.com/Ledger-OS-Infra/ledger--raas/issues), assign yourself, and comment before starting large work.

## Branch naming

Use short, descriptive branch names:

| Pattern | Example |
|---------|---------|
| `feat/<scope>-<description>` | `feat/webhook-nomba-handler` |
| `fix/<scope>-<description>` | `fix/reconciliation-fifo-order` |
| `chore/<description>` | `chore/husky-commitlint` |
| `docs/<description>` | `docs/contribution-guide` |

`<scope>` is optional but helpful: `api`, `web`, `db`, `infra`, etc.

## Commit messages (Conventional Commits)

Every commit must follow [Conventional Commits](https://www.conventionalcommits.org/). Husky runs **Commitlint** on `commit-msg` and will reject invalid messages.

### Format

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or user-facing behaviour |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code change that is not a feat or fix |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or external dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance, tooling, deps |
| `revert` | Reverts a previous commit |

### Rules

- Use the **imperative mood** in the subject: `add webhook handler`, not `added` or `adds`
- Keep the subject **≤ 100 characters**
- Do not end the subject with a period
- Use lowercase for the subject (except proper nouns)
- Reference issues in the footer when relevant: `Closes #12`

### Examples

```bash
feat(api): add Nomba webhook payment handler
fix(reconciliation): apply FIFO when exact match absent
docs: add contribution guide and PR template
chore: setup husky with commitlint
test(api): cover partial payment allocation scenarios
```

### Breaking changes

Add `!` after the type/scope or include a `BREAKING CHANGE:` footer:

```
feat(api)!: rename obligation status enum values

BREAKING CHANGE: UNPAID is now PENDING; update clients accordingly.
```

## Pull requests

1. **Branch from `main`** (or the current default branch).
2. **Keep PRs focused** — one feature or fix per PR when possible.
3. **Fill out the PR template** completely (summary, test plan, checklist).
4. **Link issues** using `Closes #N` or `Relates to #N`.
5. **Request review** from at least one teammate before merge.
6. **Ensure CI passes** (once the pipeline is in place).

### PR title

Use the same Conventional Commits format as commit messages. GitHub often uses the PR title for squash-merge commits.

Good: `feat(api): customer virtual account provisioning`  
Avoid: `WIP`, `updates`, `fix stuff`

## Code standards

- **TypeScript** for backend and frontend (per `TASK.md` stack).
- Match existing patterns in the file you are editing.
- Prefer small, readable changes over large refactors mixed with features.
- Never commit secrets — use `.env` (gitignored) and document keys in `.env.example`.
- Ledger entries and payment events must remain **append-only**; do not add update/delete paths for audit data.

## Project structure (target)

```
ledger-core/
├── apps/api/          # Express reconciliation API
├── apps/web/          # Next.js admin dashboard
├── packages/          # Shared types/utilities (as needed)
├── nomba-server/      # Nomba integration sandbox (legacy/bootstrap)
└── scripts/           # Repo automation
```

Structure may evolve; check open issues for the current epic.

## Questions

Open a GitHub Discussion or comment on the relevant issue. For Nomba API questions, refer to [Nomba Developers](https://developer.nomba.com) documentation.

---

**Ledger-Core** — Nomba x DevCareer Hackathon 2026
