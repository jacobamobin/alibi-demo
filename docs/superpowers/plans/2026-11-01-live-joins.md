# Live joins implementation plan

Goal: prove agent invitations, unnamed role generation, and background synthetic portraits in the existing no-backend app.
Spec: docs/superpowers/specs/2026-11-01-live-joins-design.md
Use executing-plans inline, then one requesting-code-review pass.

- [ ] Add portrait request + bounded background jobs with privacy, invalid response, dedup and cancellation tests. Extend roster to update portraits without changing voice bindings.
- [ ] Make the agent invent unnamed roles and confirm shared scenes naturally. Trigger portrait creation after successful fictional joins. Add profile retry and Context text fallback.
- [ ] Run suite/typecheck/build and review, publish same Site, then use real entered keys to prove Owen → Maya → Jamie and a newly invented DJ. Preserve monograms on image failure. Report observed evidence and remaining phone/audio limits.
