# Alibi Native Phone Proof Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current chat. Steps use checkbox syntax for progress. The user approved the design and explicitly authorized implementation, Xcode setup, simulator testing, and physical-iPhone testing.

**Goal:** Build a native FaceTime-style iOS application and demonstrate three distinct voiced characters joining one live ElevenLabs conversation on the user's iPhone.

**Architecture:** SwiftUI owns the native call UI, local people/context, and Settings. A platform-independent Swift package owns character matching, prepared voice slots, join idempotency, and agent tool schemas. One ElevenLabs Swift SDK conversation supplies the live voice agent; the phone calls provider APIs directly with owner-supplied keys stored in Keychain.

**Tech Stack:** SwiftUI, Swift Package Manager, ElevenLabs Swift SDK v3.4.0 (release to inspect and pin), Combine, AVFoundation, Security/Keychain, ContactsUI, PhotosUI, URLSession, XcodeGen, XCTest.

**Spec:** `docs/superpowers/specs/2026-11-01-alibi-ios-design.md` (approved November 1, 2026).

## Global Constraints

- Native iOS application; initial physical phone runs iOS 26.0.
- No application backend, proxy, serverless function, or hosted database.
- One live agent; maximum 10 configured voices including the default voice.
- Distinct voice ID and personality per active character; prepare voices before the audio session.
- Two synthetic-character sources: imported test contacts/photos and fictional characters generated on demand.
- Credentials are entered on the device and kept in Keychain; no secrets in repository, logs, screenshots, preferences, or prompts.
- Simulator/demo behavior must be labeled separately from live provider and physical-device evidence.
- Plan approval already authorizes this implementation; do not request another implementation-method approval.

## Review Focus

- Duplicate/replayed join calls must not add duplicate tiles or consume extra voice slots.
- A saved character with a voice absent from the prepared roster must fail visibly rather than silently change voice.
- Late provider callbacks after ending a call must not restart audio or mutate a subsequent call.
- Missing or rejected credentials must produce an actionable Settings error without revealing key or response-body secrets.
- Microphone denial, audio interruption, and network failure must return the app to a recoverable state.

## Files and responsibilities

- `Package.swift`, `Sources/AlibiCore/`: portable character, voice-roster, prompt, and tool contracts.
- `Tests/AlibiCoreTests/`: real state-transition, boundary, and schema tests.
- `Alibi/App/`: application composition, persistence, routing, and startup modes.
- `Alibi/Features/Calls/`: recents, active call grid, controls, participant sheet, transcript/context.
- `Alibi/Features/People/`: synthetic fixtures, person editor, Photos/Contacts pickers.
- `Alibi/Features/Settings/`: secure key entry, provider validation, agent setup, voice selections.
- `Alibi/Services/`: Keychain, ElevenLabs REST administration/authentication, live conversation adapter, optional OpenAI profile/portrait integration.
- `Alibi/Resources/`: asset catalog and app-owned fixtures only.
- `AlibiUITests/`: simulator flows and native UI assertions.
- `project.yml`, `Alibi.xcodeproj/`: reproducible native project and shared schemes.
- `docs/testing/`: sanitized toolchain, simulator, and device evidence with explicit pending checks.

### Task 1: Toolchain and reproducible native project

**Interfaces:** Produces `Alibi.xcodeproj`, shared `Alibi` scheme, bundle ID `ai.alibi.ios`, iOS 26.0 target, microphone usage text, and a Swift package product `AlibiCore`.

- [ ] Install full Xcode from Apple. Hand Apple-controlled authentication, license acceptance, or privileged authorization to the user when actually prompted; continue independent code work.
- [ ] Select the installed Xcode using a per-command `DEVELOPER_DIR` if global selection requires privileged authorization.
- [ ] Install XcodeGen from Homebrew and generate a committed project from `project.yml`.
- [ ] Add the pinned ElevenLabs package, local core package, app target, unit/UI test target, schemes, and app asset catalog.
- [ ] Run `xcodebuild -list -project Alibi.xcodeproj` and resolve package dependencies. Expected: Alibi targets/schemes and no unresolved packages.
- [ ] Install one compatible iOS simulator runtime, create/boot an iPhone simulator, and record versions and device identifiers without personal secrets.

### Task 2: Character library and prepared call roster

**Interfaces:** `CharacterProfile`, `PreparedVoice`, `CallRoster`, `NameResolution`; `CallRoster.join(_:toolCallID:)`, `leave(_:)`, and `resolve(_:)` supply the state contract used by UI and agent tools.

- [ ] Write failing tests for unique/ambiguous name resolution, three distinct prepared voices, duplicate-tool idempotency, missing exact voice refusal, ten-voice limit including default, and no slot recycling in one session.
- [ ] Run `swift test` and observe missing/unimplemented behavior fail before adding implementation.
- [ ] Implement Codable/Sendable models, deterministic roster allocation, alias matching, and explicit errors.
- [ ] Run `swift test`; expected: all roster and name-resolution tests pass.
- [ ] Commit core behavior and tests on `codex/native-ios` when local Git identity is available; never overwrite user changes.

### Task 3: Direct provider configuration and secure Settings

**Interfaces:** `CredentialStore` stores provider secrets; `ElevenLabsAPI` validates account voices, configures a dedicated agent's prepared voices/client tools, and obtains a conversation token. `AppSettings` stores non-secret agent/model/voice choices.

- [ ] Write failing tests for tool configuration JSON, multi-voice label-to-ID mapping, private authentication request construction, and provider-error redaction using offline fixtures.
- [ ] Implement Keychain-backed secure fields, save/remove/validate controls, provider-scoped request building, and narrow error messages.
- [ ] Add three configurable voice IDs with suggested stock voices; a dedicated agent can be created/configured after the user enters their key and explicitly uses the setup control.
- [ ] Make network tests use a URLProtocol fixture so no credentials or billable requests are required for unit verification.
- [ ] Run the core/service tests. Expected: correct documented request shapes; secrets absent from serialized context and surfaced errors.

### Task 4: Live conversation and dynamic client tools

**Interfaces:** `CallSession` exposes status, participants, agent speaking/listening state, elapsed time, transcript, mute, start/end, add, and leave. `ElevenLabsConversationAdapter` owns exactly one SDK `Conversation` per active generation.

- [ ] Write failing tests for strict client-tool argument parsing, unsupported tools, duplicate joins, and stale-session event refusal.
- [ ] Implement a prompt carrying distinct character personalities and the exact prepared voice labels; keep imported scene material separate from instructions.
- [ ] Connect SDK callbacks and client-tool responses; use the pinned Swift SDK's actual contextual-update method and token API.
- [ ] Add microphone permission, mute, native audio routing, barge-in, and explicit cleanup on end/disconnect.
- [ ] Run unit tests and an iOS simulator build. Expected: no compile errors and passing state/tool tests; live audio remains pending user key.

### Task 5: FaceTime-style native UI and local people/context

**Interfaces:** SwiftUI views consume `CallSession` and local `CharacterProfile` data, with Settings injecting credentials only into the service layer.

- [ ] Build a native recents screen, add-call flow, dark rounded call tiles, profile pictures/initials, floating call controls, participant picker, and context/transcript sheet.
- [ ] Add three fictional fixture people with distinct personalities and editable voice bindings.
- [ ] Add PhotosPicker and contact picker imports for synthetic test data, keeping original imported fields separate from generated profile attributes.
- [ ] Add optional OpenAI profile/portrait requests behind explicit app controls, with synthetic provenance, cached outputs, and cancellation/deduplication.
- [ ] Keep preview mode clearly marked and disconnected from live proof. A simulator launch argument may populate a call for UI verification; it must not imply provider success.
- [ ] Build and run UI tests covering launch, Settings, entering/exiting a preview call, joining/removing people, and absence of overflow at the target iPhone size.

### Task 6: Simulator and physical-device proof

**Interfaces:** Produces `docs/testing/native-phone-proof.md` and local screenshots/recordings, separating core tests, simulator UI, live provider, and physical device results.

- [ ] Run the complete core and iOS test suites, install/launch the app in Simulator, inspect the native UI, and save reviewed screenshots.
- [ ] Have the user enter the required key(s) through Settings and connect their iPhone; perform Xcode pairing/signing without collecting their password or private signing keys.
- [ ] With live credentials, prove a three-person call in the simulator where its audio environment permits, then on the physical iPhone. Add two people during the same session, verify distinct voices/personalities and recall of an earlier scene fact.
- [ ] Verify mute, interruption, end-call audio cleanup, and a recoverable disconnected state. Record measured observations; do not label prerecorded or preview output as live success.
- [ ] If user-controlled credentials/pairing/signing are pending, leave the runnable project and exact next action ready, explicitly record unverified checks, and continue all work that does not depend on them.
- [ ] Run one fresh whole-branch review under the executing-plans skill, fix material findings with regression tests, and rerun the full suite before claiming completion.
