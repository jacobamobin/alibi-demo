import Foundation
import AlibiCore

struct CheckFailure: Error { let message: String }
var checks = 0
func expect(_ condition: @autoclosure () throws -> Bool, _ message: String) throws {
    checks += 1
    if try !condition() { throw CheckFailure(message: message) }
}
func expectError(_ expected: RosterError, _ operation: () throws -> Void) throws {
    checks += 1
    do { try operation(); throw CheckFailure(message: "Expected \(expected)") }
    catch let error as RosterError {
        if error != expected { throw CheckFailure(message: "Expected \(expected), got \(error)") }
    }
}
func v(_ index: Int) -> PreparedVoice {
    .init(label: "Voice\(index)", voiceID: "voice-\(index)", name: "Voice \(index)")
}
func p(_ name: String, voiceID: String? = nil) -> CharacterProfile {
    .init(name: name, personality: "Warm and quick-witted", voiceID: voiceID)
}

do {
    var roster = try CallRoster(voices: [v(1), v(2), v(3)])
    let owen = p("Owen Brooks")
    let first = try roster.join(owen, toolCallID: "one")
    try expect(roster.participants.count == 1, "A call starts with one person")
    try expect(try roster.join(owen, toolCallID: "one") == first, "Replay must be idempotent")
    try expect(try roster.join(owen, toolCallID: "again") == first, "A second request for the same person must not duplicate them")
    let maya = try roster.join(p("Maya Chen"), toolCallID: "two")
    let leo = try roster.join(p("Leo Martin"), toolCallID: "three")
    try expect(roster.participants.count == 3, "Dynamic joins must add two people")
    try expect([first.voice.voiceID, maya.voice.voiceID, leo.voice.voiceID] == ["voice-1", "voice-2", "voice-3"], "Each character must have a distinct prepared voice")
    try expectError(.conflictingToolCall) { _ = try roster.join(p("Other"), toolCallID: "one") }
    try expectError(.noAvailableVoice) { _ = try roster.join(p("Fourth"), toolCallID: "four") }
    roster.leave(owen.id)
    try expect(roster.participants.count == 2, "Leaving must remove the active tile")
    try expectError(.noAvailableVoice) { _ = try roster.join(p("Replacement"), toolCallID: "five") }
    try expect(try roster.join(owen, toolCallID: "return").voice == first.voice, "Rejoining must retain the original voice")

    var saved = try CallRoster(voices: [v(1), v(2)])
    try expectError(.voiceNotPrepared) { _ = try saved.join(p("Saved", voiceID: "custom"), toolCallID: "saved") }
    _ = try saved.join(p("First", voiceID: "voice-1"), toolCallID: "first")
    try expectError(.voiceAlreadyAssigned) { _ = try saved.join(p("Second", voiceID: "voice-1"), toolCallID: "second") }
    try expectError(.invalidPreparedRoster) { _ = try CallRoster(voices: (1...11).map(v)) }
    try expectError(.invalidPreparedRoster) { _ = try CallRoster(voices: []) }
    try expectError(.invalidPreparedRoster) { _ = try CallRoster(voices: [v(1), v(1)]) }
    try expectError(.invalidPreparedRoster) { _ = try CallRoster(voices: [.init(label: "bad><tag", voiceID: "v", name: "Bad")]) }
    var ten = try CallRoster(voices: (1...10).map(v))
    for index in 1...10 { _ = try ten.join(p("Person \(index)"), toolCallID: "p\(index)") }
    try expect(ten.participants.count == 10, "The default voice counts toward the ten-person limit")
    try expectError(.noAvailableVoice) { _ = try ten.join(p("Eleventh"), toolCallID: "eleven") }

    var john = p("John Carter")
    john.aliases = ["JC"]
    let john2 = p("John Smith")
    let people = [john, john2]
    try expect(CharacterLibrary.resolve("john carter", in: people) == .match(john.id), "Full name match")
    try expect(CharacterLibrary.resolve("  JC  ", in: people) == .match(john.id), "Trimmed alias match")
    if case .ambiguous(let ids) = CharacterLibrary.resolve("John", in: people) {
        try expect(Set(ids) == Set([john.id, john2.id]), "Ambiguous first names must keep both candidates")
    } else { throw CheckFailure(message: "Two Johns must require disambiguation") }
    try expect(CharacterLibrary.resolve("Nobody", in: people) == .none, "Unknown person")

    var epoch = SessionEpoch()
    let old = epoch.begin()
    try expect(epoch.accepts(old), "Current callback accepted")
    epoch.end()
    try expect(!epoch.accepts(old), "Ended session callback rejected")
    let next = epoch.begin()
    try expect(!epoch.accepts(old) && epoch.accepts(next), "New calls must reject old callbacks")
    let definition = try AgentDefinition.configuration(voices: [v(1), v(2), v(3)], toolIDs: ["tool_lookup", "tool_join"])
    let body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(definition)) as! [String: Any]
    let config = body["conversation_config"] as! [String: Any]
    let tts = config["tts"] as! [String: Any]
    try expect(tts["voice_id"] as? String == "voice-1", "Default voice must be the first prepared voice")
    let extraVoices = tts["supported_voices"] as! [[String: Any]]
    try expect(extraVoices.count == 2, "Default voice must not be duplicated among additional voices")
    try expect(extraVoices[0]["label"] as? String == "Voice2", "Exact voice label must survive serialization")
    let platform = body["platform_settings"] as! [String: Any]
    try expect((platform["auth"] as? [String: Any])?["enable_auth"] as? Bool == true, "Dedicated agents must require authentication")
    let agent = config["agent"] as! [String: Any]
    let prompt = agent["prompt"] as! [String: Any]
    try expect(prompt["tool_ids"] as? [String] == ["tool_lookup", "tool_join"], "Agent must refer to registered client tools")
    let tokenRequest = try ProviderRequests.conversationToken(agentID: "agent_fixture", key: "owner-key-fixture")
    try expect(tokenRequest.httpMethod == "GET", "Conversation token uses GET")
    try expect(tokenRequest.value(forHTTPHeaderField: "xi-api-key") == "owner-key-fixture", "Owner credential belongs in the authorization header")
    try expect(!tokenRequest.url!.absoluteString.contains("owner-key-fixture"), "Key must not enter the URL")
    try expect(tokenRequest.url!.path == "/v1/convai/conversation/token", "Use documented WebRTC token endpoint")
    try expectError(.invalidCharacter) { _ = try AgentToolArguments.join(from: "{\"name\":\"\",\"personality\":\"x\"}") }
    let join = try AgentToolArguments.join(from: "{\"name\":\"John Carter\",\"personality\":\"Quiet and dry\",\"pronouns\":\"he/him\"}")
    try expect(join.name == "John Carter" && join.personality == "Quiet and dry", "Tool arguments must retain character identity")
    try expect(ProviderFailure(status: 401).localizedDescription.contains("Settings"), "Rejected credentials must explain how to recover")
    print("PASS: \(checks) portable core behavior checks")
} catch {
    fputs("FAIL: \(error)\n", stderr)
    exit(1)
}
