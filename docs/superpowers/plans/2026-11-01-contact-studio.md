# Contact studio implementation plan

> Execute inline with superpowers:executing-plans; final independent review through requesting-code-review.

Goal: Add, import, draft, preview, save and call custom contact personas without a backend.
Architecture: typed profile/import/AI utilities, IndexedDB persistence, an isolated editor component, existing roster and agent integration.
Tech: React 19, Next static export, TypeScript, OpenAI Responses, existing ElevenLabs voices.
Spec: docs/superpowers/specs/2026-11-01-contact-studio-design.md

Global constraints: keys in memory; no backend; ten distinct voice slots; no face-based sensitive identity inference; photographs excluded from call prompts.
Review focus: malformed vCards/photos; stale AI completions overwriting edits; failed browser persistence; oversized image prompts; preferred voice already occupied.

- [x] Task 1: Profile, vCard and AI boundary. Create web/lib/contacts.ts and contact-ai.ts, add meaningful parser/validation/request tests, observe failures then implement. Extend Person/Voice and strip photo data from agent prompt/tool results.
- [x] Task 2: Persistence and editor. Create contact-store.ts, contact-editor.tsx, integrate save/edit/delete into use-alibi.ts, home/page/settings, preserve existing people. Browser-check file upload, manual review, preview, save/reload and invitation.
- [ ] Task 3: Verify and publish. Run unit suite/typecheck/static build; independent review; browser-check mobile/desktop and provider failure UX; publish same private Site; request OpenAI key in app only if needed for live AI verification.
