# Tasks: Complete BlockSuite Phase 6

**Change ID:** `complete-blocksuite-phase-6`
**Status:** Pending

---

## Phase 6A: Production Hardening (Rate Limiting)

- [ ] 6A.1 Install @upstash/ratelimit and @upstash/redis
- [ ] 6A.2 Create `lib/rate-limiter.ts` with sliding window config
- [ ] 6A.3 Update `state/route.ts` with rate limiting
- [ ] 6A.4 Add rate limit headers to responses (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- [ ] 6A.5 Test rate limiting with curl commands

## Phase 6B: Node Selection

- [ ] 6B.1 Add selection state tracking to mind-map-canvas.tsx
- [ ] 6B.2 Subscribe to `host.selection.slots.changed` event
- [ ] 6B.3 Extract mindmap element from SurfaceSelection
- [ ] 6B.4 Call onNodeSelect callback with node ID and text
- [ ] 6B.5 Remove console.warn about unimplemented feature
- [ ] 6B.6 Test selection in /test/blocksuite page

## Phase 6C: Toolbar Migration

- [ ] 6C.1 Create `components/blocksuite/mindmap-toolbar.tsx` with shadcn/ui
- [ ] 6C.2 Implement add node functionality (child and sibling)
- [ ] 6C.3 Implement delete node functionality
- [ ] 6C.4 Implement zoom controls
- [ ] 6C.5 Implement style/layout selectors
- [ ] 6C.6 Integrate toolbar with MindMapCanvas component

## Phase 6D: Storage Cleanup (Optional)

- [ ] 6D.1 Choose implementation: Supabase Cron vs Vercel Cron
- [ ] 6D.2 Create cleanup function/route
- [ ] 6D.3 Add audit logging for deletions
- [ ] 6D.4 Implement 24-hour grace period
- [ ] 6D.5 Test with dry-run mode
- [ ] 6D.6 Schedule daily execution at 3 AM UTC

## Validation

- [ ] V.1 Verify node selection fires onNodeSelect callback
- [ ] V.2 Verify toolbar add/delete works correctly
- [ ] V.3 Verify rate limiting returns 429 after threshold
- [ ] V.4 Run existing tests (npm run test)
- [ ] V.5 Test real-time sync between browser tabs

---

## Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 6A: Rate Limiting | Pending | 0% |
| Phase 6B: Node Selection | Pending | 0% |
| Phase 6C: Toolbar Migration | Pending | 0% |
| Phase 6D: Storage Cleanup | Pending | 0% |
| **Overall** | **Pending** | **0%** |
