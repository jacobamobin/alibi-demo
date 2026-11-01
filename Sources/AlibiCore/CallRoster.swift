import Foundation

public enum RosterError: Error, Equatable, LocalizedError, Sendable {
    case invalidPreparedRoster, voiceNotPrepared, voiceAlreadyAssigned, noAvailableVoice, conflictingToolCall, invalidCharacter

    public var errorDescription: String? {
        switch self {
        case .invalidPreparedRoster: return "Prepare 1–10 distinct voices with unique, simple labels in Settings."
        case .voiceNotPrepared: return "This person's saved voice wasn't prepared. Add it to the voice roster before a new call."
        case .voiceAlreadyAssigned: return "That voice already belongs to another person in this call."
        case .noAvailableVoice: return "All prepared voices are assigned. A call supports up to 10 distinct voices."
        case .conflictingToolCall: return "This join request conflicts with an earlier request."
        case .invalidCharacter: return "A person needs a name and personality before joining."
        }
    }
}

public struct CallParticipant: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID { profile.id }
    public var profile: CharacterProfile
    public var voice: PreparedVoice
    public var joinedAt: Date
}

public struct CallRoster: Sendable {
    public let voices: [PreparedVoice]
    public private(set) var participants: [CallParticipant] = []
    private var bindings: [UUID: CallParticipant] = [:]
    private var toolCalls: [String: UUID] = [:]

    public init(voices: [PreparedVoice]) throws {
        let validLabels = voices.allSatisfy {
            $0.label.range(of: "^[A-Za-z][A-Za-z0-9_]{0,31}$", options: .regularExpression) != nil
                && !$0.voiceID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        guard (1...10).contains(voices.count), validLabels,
              Set(voices.map(\.voiceID)).count == voices.count,
              Set(voices.map(\.label)).count == voices.count else { throw RosterError.invalidPreparedRoster }
        self.voices = voices
    }

    @discardableResult
    public mutating func join(_ profile: CharacterProfile, toolCallID: String) throws -> CallParticipant {
        guard !profile.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !profile.personality.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              profile.name.count <= 100, profile.personality.count <= 2000 else { throw RosterError.invalidCharacter }
        if let prior = toolCalls[toolCallID], prior != profile.id { throw RosterError.conflictingToolCall }
        if let existing = bindings[profile.id] {
            toolCalls[toolCallID] = profile.id
            if !participants.contains(where: { $0.id == profile.id }) { participants.append(existing) }
            return existing
        }
        let assigned = Set(bindings.values.map { $0.voice.voiceID })
        let voice: PreparedVoice
        if let savedID = profile.voiceID, !savedID.isEmpty {
            guard let exact = voices.first(where: { $0.voiceID == savedID }) else { throw RosterError.voiceNotPrepared }
            guard !assigned.contains(savedID) else { throw RosterError.voiceAlreadyAssigned }
            voice = exact
        } else {
            guard let available = voices.first(where: { !assigned.contains($0.voiceID) }) else { throw RosterError.noAvailableVoice }
            voice = available
        }
        var boundProfile = profile
        boundProfile.voiceID = voice.voiceID
        let participant = CallParticipant(profile: boundProfile, voice: voice, joinedAt: Date())
        bindings[profile.id] = participant
        toolCalls[toolCallID] = profile.id
        participants.append(participant)
        return participant
    }

    public mutating func leave(_ id: UUID) { participants.removeAll { $0.id == id } }

    public var availableVoices: [PreparedVoice] {
        let assigned = Set(bindings.values.map { $0.voice.voiceID })
        return voices.filter { !assigned.contains($0.voiceID) }
    }
}

public struct SessionEpoch: Sendable {
    public private(set) var current: UUID?
    public init() {}
    @discardableResult public mutating func begin() -> UUID { let id = UUID(); current = id; return id }
    public mutating func end() { current = nil }
    public func accepts(_ id: UUID) -> Bool { current == id }
}
