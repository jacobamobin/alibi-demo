import XCTest
@testable import AlibiCore

final class CallRosterTests: XCTestCase {
    private func voice(_ number: Int) -> PreparedVoice {
        PreparedVoice(label: "Voice\(number)", voiceID: "voice-\(number)", name: "Voice \(number)")
    }

    private func person(_ name: String, voiceID: String? = nil) -> CharacterProfile {
        CharacterProfile(name: name, personality: "Warm and quick-witted", voiceID: voiceID)
    }

    func testThreeDynamicJoinsKeepDistinctPreparedVoices() throws {
        var roster = try CallRoster(voices: [voice(1), voice(2), voice(3)])
        let first = try roster.join(person("Owen Brooks"), toolCallID: "join-1")
        XCTAssertEqual(roster.participants.count, 1)
        let second = try roster.join(person("Maya Chen"), toolCallID: "join-2")
        let third = try roster.join(person("Leo Martin"), toolCallID: "join-3")
        XCTAssertEqual(roster.participants.count, 3)
        XCTAssertEqual([first.voice.voiceID, second.voice.voiceID, third.voice.voiceID], ["voice-1", "voice-2", "voice-3"])
    }

    func testReplayedJoinDoesNotAddAnotherParticipantOrConsumeAVoice() throws {
        var roster = try CallRoster(voices: [voice(1), voice(2)])
        let owen = person("Owen Brooks")
        let first = try roster.join(owen, toolCallID: "same-call")
        XCTAssertEqual(try roster.join(owen, toolCallID: "same-call"), first)
        XCTAssertEqual(try roster.join(owen, toolCallID: "different-call"), first)
        XCTAssertEqual(roster.participants.count, 1)
        XCTAssertEqual(try roster.join(person("Maya Chen"), toolCallID: "next").voice.voiceID, "voice-2")
    }

    func testToolCallIDCannotBeReusedForAnotherCharacter() throws {
        var roster = try CallRoster(voices: [voice(1), voice(2)])
        _ = try roster.join(person("Owen Brooks"), toolCallID: "replay")
        XCTAssertThrowsError(try roster.join(person("Someone Else"), toolCallID: "replay")) {
            XCTAssertEqual($0 as? RosterError, .conflictingToolCall)
        }
        XCTAssertEqual(roster.participants.count, 1)
    }

    func testSavedVoiceIsNeverSilentlySubstituted() throws {
        var roster = try CallRoster(voices: [voice(1)])
        XCTAssertThrowsError(try roster.join(person("Owen Brooks", voiceID: "custom-unprepared"), toolCallID: "one")) {
            XCTAssertEqual($0 as? RosterError, .voiceNotPrepared)
        }
        XCTAssertTrue(roster.participants.isEmpty)
    }

    func testDifferentCharactersCannotShareOneVoice() throws {
        var roster = try CallRoster(voices: [voice(1), voice(2)])
        _ = try roster.join(person("Owen Brooks", voiceID: "voice-1"), toolCallID: "one")
        XCTAssertThrowsError(try roster.join(person("Maya Chen", voiceID: "voice-1"), toolCallID: "two")) {
            XCTAssertEqual($0 as? RosterError, .voiceAlreadyAssigned)
        }
    }

    func testTenVoiceLimitIncludesDefaultVoice() throws {
        XCTAssertThrowsError(try CallRoster(voices: (1...11).map(voice))) {
            XCTAssertEqual($0 as? RosterError, .invalidPreparedRoster)
        }
        var roster = try CallRoster(voices: (1...10).map(voice))
        for index in 1...10 {
            _ = try roster.join(person("Person \(index)"), toolCallID: "join-\(index)")
        }
        XCTAssertThrowsError(try roster.join(person("Person 11"), toolCallID: "eleven")) {
            XCTAssertEqual($0 as? RosterError, .noAvailableVoice)
        }
        XCTAssertEqual(roster.participants.count, 10)
    }

    func testLeavingPreservesVoiceBindingAndDoesNotRecycleItsSlot() throws {
        var roster = try CallRoster(voices: [voice(1)])
        let owen = person("Owen Brooks")
        let original = try roster.join(owen, toolCallID: "one")
        roster.leave(owen.id)
        XCTAssertTrue(roster.participants.isEmpty)
        XCTAssertThrowsError(try roster.join(person("New Person"), toolCallID: "two"))
        XCTAssertEqual(try roster.join(owen, toolCallID: "three").voice, original.voice)
    }

    func testPreparedRosterRejectsDuplicateVoicesAndUnsafeXMLLabels() {
        XCTAssertThrowsError(try CallRoster(voices: [voice(1), voice(1)]))
        XCTAssertThrowsError(try CallRoster(voices: [.init(label: "bad><tag", voiceID: "v", name: "Bad")]))
        XCTAssertThrowsError(try CallRoster(voices: []))
    }

    func testNameResolutionUsesExactNamesAliasesAndAmbiguousFirstNames() {
        var john = person("John Carter")
        john.aliases = ["JC"]
        let other = person("John Smith")
        let library = [john, other]
        XCTAssertEqual(CharacterLibrary.resolve("john carter", in: library), .match(john.id))
        XCTAssertEqual(CharacterLibrary.resolve("  jc  ", in: library), .match(john.id))
        guard case .ambiguous(let ids) = CharacterLibrary.resolve("John", in: library) else {
            return XCTFail("Two Johns must require disambiguation")
        }
        XCTAssertEqual(Set(ids), Set([john.id, other.id]))
        XCTAssertEqual(CharacterLibrary.resolve("Maya", in: library), .none)
    }

    func testEndingAndStartingASessionRejectsOldCallbacks() {
        var epoch = SessionEpoch()
        let first = epoch.begin()
        XCTAssertTrue(epoch.accepts(first))
        epoch.end()
        XCTAssertFalse(epoch.accepts(first))
        let second = epoch.begin()
        XCTAssertFalse(epoch.accepts(first))
        XCTAssertTrue(epoch.accepts(second))
    }
}
