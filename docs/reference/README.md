# Technical Reference Documentation

> **Purpose**: Technical specifications, API docs, patterns, and guides
> **Last Updated**: 2025-01-14

[← Back to Docs Index](../INDEX.md) | [← Back to Root](../../README.md)

---

## Overview

This folder contains technical reference documentation for the Product Lifecycle Management Platform. For architecture decisions, see [ARCHITECTURE_CONSOLIDATION.md](../ARCHITECTURE_CONSOLIDATION.md).

---

## 📂 Split Versions (AI-Friendly)

Large documents have been split into smaller files (<800 lines) for better AI readability:

| Document | Split Directory | Files |
| -------- | --------------- | ----- |
| API_REFERENCE.md | [api-reference/](api-reference/README.md) | 5 endpoint categories |
| CHANGELOG.md | [changelog/](changelog/README.md) | 3 time periods |
| CODE_PATTERNS.md | [code-patterns/](code-patterns/README.md) | 2 parts |
| SHADCN_REGISTRY_COMPONENT_GUIDE.md | [shadcn/](shadcn/README.md) | 2 parts |

> **Tip**: Use split versions when working with AI assistants for better context handling.

---

## Core References

### API & Architecture

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [API_REFERENCE.md](API_REFERENCE.md) | Complete API documentation (20+ endpoints) | ~2,500 |
| [CHANGELOG.md](CHANGELOG.md) | Migration history, feature tracking, breaking changes | ~2,100 |
| [CODE_PATTERNS.md](CODE_PATTERNS.md) | TypeScript, Next.js, Supabase patterns | ~1,000 |

### Developer Guides

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) | 8-step professional workflow guide | ~900 |
| [TEAM_GIT_WORKFLOW_GUIDE.md](TEAM_GIT_WORKFLOW_GUIDE.md) | Git workflow best practices | ~540 |
| [GITHUB_SETUP.md](GITHUB_SETUP.md) | GitHub configuration guide | ~425 |
| [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) | CI/CD configuration | ~230 |

### Phase System

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [PHASE_PERMISSIONS_GUIDE.md](PHASE_PERMISSIONS_GUIDE.md) | Phase-based access control | ~770 |
| [PHASE_PERMISSIONS_ERD.md](PHASE_PERMISSIONS_ERD.md) | ERD diagrams for phase system | ~530 |

### AI & MCP

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [AI_MODELS.md](AI_MODELS.md) | Model routing, capabilities | ~410 |
| [AGENTS.md](AGENTS.md) | Claude agents by phase | ~470 |
| [MCP_USAGE_GUIDE.md](MCP_USAGE_GUIDE.md) | Supabase, shadcn/ui, Context7 MCP | ~460 |
| [PARALLEL_SEARCH.md](PARALLEL_SEARCH.md) | Parallel AI search patterns | ~240 |

### UI Components

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [SHADCN_REGISTRY_COMPONENT_GUIDE.md](SHADCN_REGISTRY_COMPONENT_GUIDE.md) | 14 registries, 1000+ components | ~1,060 |
| [SHADCN_REGISTRIES.md](SHADCN_REGISTRIES.md) | Registry configuration | ~210 |
| [COMPONENT_SELECTION_QUICK_REFERENCE.md](COMPONENT_SELECTION_QUICK_REFERENCE.md) | Quick component lookup | ~200 |
| [SIDEBAR_IMPLEMENTATION.md](SIDEBAR_IMPLEMENTATION.md) | Sidebar component guide | ~160 |

### Security & Quality

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [SECURITY.md](SECURITY.md) | Security patterns, audit findings | ~470 |
| [AUTOMATED_VERIFICATION_REPORT.md](AUTOMATED_VERIFICATION_REPORT.md) | Automated test results | ~400 |

### Other

| Document | Purpose | Lines |
| -------- | ------- | ----- |
| [ORGANIZATIONAL_MERGE_STRATEGY.md](ORGANIZATIONAL_MERGE_STRATEGY.md) | Organization merge strategy | ~390 |
| [SPEED_INSIGHTS_INTEGRATION.md](SPEED_INSIGHTS_INTEGRATION.md) | Vercel Speed Insights | ~150 |

---

## Quick Links

### Common API Routes

```text
POST /api/auth/signup           - Create user account
POST /api/teams                 - Create team
POST /api/workspaces            - Create workspace
POST /api/features              - Create feature
POST /api/mind-maps/:id/convert - Convert nodes to features
POST /api/ai/chat               - Send AI chat message (streaming)
```

### Key Code Patterns

- ID Generation: `Date.now().toString()` (NEVER UUID)
- All queries filter by `team_id`
- RLS enabled on all tables
- TypeScript strict mode, no `any`

### Workflow Commands

```bash
/status-check    → /research-plan → /parallel-dev
/quality-review  → /test          → /deploy → /merge
```

---

## Related Documentation

- [Architecture](../architecture/README.md) - System diagrams, database schema
- [Implementation](../implementation/README.md) - Week-by-week build guide
- [Planning](../planning/README.md) - Progress tracking, roadmap

---

## Total Files: 21

All reference documents listed above are actively maintained.

---

[← Back to Docs Index](../INDEX.md) | [← Back to Root](../../README.md)
