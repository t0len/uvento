# Git Workflow

## Branching Strategy

We use a simplified Git Flow suitable for a small team (2 developers):

```
main          ← production-ready code
  └── feature/*   ← new features
  └── fix/*       ← bug fixes
  └── docs/*      ← documentation changes
```

### Branch Naming

```
feature/short-description    — e.g. feature/event-creation
fix/short-description        — e.g. fix/login-redirect
docs/short-description       — e.g. docs/api-contracts
```

## Workflow

### 1. Starting Work

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

### 2. Making Changes

- Commit often with clear messages
- Keep commits focused on a single change

### 3. Commit Message Format

```
<type>: <short description>

<optional body explaining why>
```

**Types:**
| Type | When to Use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring without behavior change |
| `style` | Formatting, whitespace |
| `chore` | Dependencies, config, tooling |

**Examples:**
```
feat: add event creation form
fix: resolve login redirect loop
docs: add API contracts documentation
chore: update prisma to v6.10
```

### 4. Pull Requests

```bash
git push -u origin feature/my-feature
```

Then create a PR on GitHub:
- Title matches the main commit message
- Description explains **what** and **why**
- Request review from the other developer
- At least 1 approval required before merge

### 5. Merging

- Use **Squash and Merge** for feature branches (keeps main history clean)
- Delete the branch after merge

## Rules

1. Never push directly to `main`
2. Always create a PR for changes
3. Keep PRs small and focused (one feature/fix per PR)
4. Resolve merge conflicts locally before requesting review
5. Run `npm run build` before pushing to verify no build errors
