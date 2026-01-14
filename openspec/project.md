# Project Context

## Purpose

Product Lifecycle Management Platform - A comprehensive tool that transforms roadmap management into full product lifecycle management:

1. **Research & Ideate** - AI-powered mind mapping, web search, knowledge base
2. **Plan & Structure** - Features, timeline, dependencies
3. **Review & Gather Feedback** - Stakeholder input (invite-based, public links, iframe)
4. **Execute Collaboratively** - Team assignment, task tracking, real-time collaboration
5. **Test & Iterate** - User feedback collection and analysis
6. **Measure Success** - Analytics, expected vs actual performance tracking

**Current Status**: Week 7/12 Complete + Security Sprint (95% overall)

## Tech Stack

### Core Framework

- **Next.js 16.1.1** - App Router, Server Components
- **TypeScript** - Strict mode, no `any` types
- **Supabase** - PostgreSQL + Real-time + Auth + RLS

### Frontend

- **shadcn/ui** - UI component library (ONLY use this)
- **Tailwind CSS** - Utility-first styling (mobile-first)
- **Lucide React** - Icons
- **XYFlow/ReactFlow** - Mind mapping (custom nodes, AI-powered)
- **Recharts** - Charts (10+ chart types)
- **Zustand** - State management
- **React Query** - Server state & caching

### Backend & Services

- **Vercel** - Serverless deployment
- **Stripe** - Payments (Checkout, Subscriptions, Webhooks)
- **Resend** - Email (Invitations, notifications)
- **OpenRouter** - AI (GLM 4.7, MiniMax M2.1, Gemini 3 Flash, Kimi K2, DeepSeek V3.2)

### Testing & Quality

- **Playwright** - E2E testing (Chromium-only CI)
- **Greptile** - AI-powered PR reviews

### MCP Servers (3 Active)

- **Supabase** - Migrations, queries, RLS, real-time, TypeScript types
- **shadcn/ui** - Component installation, multi-registry access
- **Context7** - Fetch up-to-date documentation for libraries/frameworks

## Project Conventions

### Code Style

**ID Generation**:

- Always use `Date.now().toString()` for IDs
- NEVER use UUID

**TypeScript**:

- Strict mode enabled
- Use interfaces, never `any` type
- Explicit error handling

**Naming Conventions**:

| Entity Type     | Convention    | Example                   |
| --------------- | ------------- | ------------------------- |
| Components      | PascalCase    | `WorkItemCard.tsx`        |
| Files           | kebab-case    | `work-item-card.tsx`      |
| API routes      | kebab-case    | `api/work-items/route.ts` |
| Database tables | snake_case    | `work_items`              |
| TypeScript      | PascalCase    | `WorkItem`                |

**Imports**:

```typescript
import { Button } from '@/components/ui/button'
```

### Architecture Patterns

**Two-Layer System**:

```text
WORKSPACE (Aggregation View)
├── mode: development | launch | growth | maintenance
├── Shows: Phase DISTRIBUTION across all work items
│
└── WORK ITEMS (Individual Phase Tracking)
    ├── phase: research | planning | execution | review | complete
    │         ↑ THIS IS THE STATUS - No separate status field!
    │
    └── TIMELINE ITEMS (MVP/SHORT/LONG breakdowns)
        └── status: not_started | in_progress | blocked | completed
```

**Multi-Tenancy**:

- All tables have `team_id TEXT NOT NULL` for data separation
- Row-Level Security (RLS) policies enforce access control
- ALWAYS filter queries by `team_id`

**Data Sync Strategy**:

1. Write: Save to Supabase immediately (no localStorage)
2. Read: Load from Supabase, cache in React Query
3. Real-time: Subscribe to Supabase Realtime for live updates
4. Conflict resolution: Last write wins (timestamp-based)

**Critical Architecture Decisions** (DO NOT DEVIATE):

| Decision          | Correct Approach                            | WRONG Approach                     |
| ----------------- | ------------------------------------------- | ---------------------------------- |
| Phase vs Status   | Phase IS the status for work items          | Separate phase and status fields   |
| Workspace Display | Shows AGGREGATION (distribution)            | Has single stage/phase value       |
| Timeline Items    | Have SEPARATE status field                  | Share status with work items       |
| Design Thinking   | METHODOLOGY for how to work                 | Lifecycle stages to progress       |

### Testing Strategy

**E2E Testing with Playwright**:

- Use `test.describe()` for test grouping
- Test complete user flows end-to-end
- Chromium-only in CI for consistency

**Test Commands**:

```bash
npm run test:e2e    # Playwright E2E tests
npm run test        # Jest unit tests
```

### Git Workflow

**Branch Naming**:

| Type     | Format              | Example                        |
| -------- | ------------------- | ------------------------------ |
| Feature  | `feat/description`  | `feat/work-item-review-system` |
| Bug fix  | `fix/description`   | `fix/timeline-calculation`     |
| Docs     | `docs/description`  | `docs/update-api-reference`    |
| Refactor | `refactor/desc`     | `refactor/auth-service`        |
| Test     | `test/description`  | `test/e2e-workspace-crud`      |

**Commit Format**:

```text
<type>: <short description (50 chars max)>

[Optional body explaining WHY]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Workflow**:

1. Main branch is ALWAYS production-ready
2. Never commit directly to main
3. Create feature branch → Develop → Push → PR → Self-review → Merge

## Domain Context

**Terminology**:

| Concept            | DB Name         | UI Label     |
| ------------------ | --------------- | ------------ |
| Organization       | `team`          | "Team"       |
| Product/Project    | `workspace`     | "Workspace"  |
| Feature/Bug/etc    | `work_item`     | "Work Item"  |
| Timeline breakdown | `timeline_item` | "Timeline"   |
| Execution task     | `product_task`  | "Task"       |
| Dependency         | `linked_item`   | "Dependency" |

**Workspace Modes**: development, launch, growth, maintenance

**Work Item Phases**: research → planning → execution → review → complete

**Work Item Types**: concept, feature, bug, enhancement

**Strategy Hierarchy**: Pillar (Org) → Objective (Team) → Key Result → Initiative

## Important Constraints

**Technical Constraints**:

- Use `Date.now().toString()` for IDs (NEVER UUID)
- Filter ALL queries by `team_id`
- Enable RLS on ALL tables
- `team_id TEXT NOT NULL` in all multi-tenant tables
- shadcn/ui components only (no custom CSS files)
- Mobile-first responsive design

**Security Constraints**:

- Row-Level Security (RLS) on all tables
- Never hardcode API keys
- Check Pro tier feature gates before Pro-only features

**AI Model Routing**:

- AVOID Claude Sonnet models (too costly)
- Primary models: GLM 4.7, MiniMax M2.1, Gemini 3 Flash, Kimi K2

## External Dependencies

**Database & Auth**:

- Supabase (PostgreSQL, Auth, Real-time, Storage)

**Payments**:

- Stripe (Checkout, Subscriptions, Webhooks)

**Email**:

- Resend (Transactional emails)

**AI Services**:

- OpenRouter (Multi-model AI routing)

**Deployment**:

- Vercel (Serverless functions, edge network)

**Code Quality**:

- Greptile (AI PR reviews)
