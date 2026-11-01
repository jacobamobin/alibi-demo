import Foundation

public struct CharacterProfile: Identifiable, Codable, Hashable, Sendable {
    public enum Origin: String, Codable, Sendable { case fixture, importedSynthetic, generatedSynthetic }
    public var id: UUID
    public var name: String
    public var aliases: [String]
    public var personality: String
    public var relationship: String
    public var pronouns: String
    public var voiceID: String?
    public var avatarPath: String?
    public var contactIdentifier: String?
    public var origin: Origin
    public var traits: FictionalTraits?

    public init(id: UUID = UUID(), name: String, aliases: [String] = [], personality: String,
                relationship: String = "Friend", pronouns: String = "", voiceID: String? = nil,
                avatarPath: String? = nil, contactIdentifier: String? = nil,
                origin: Origin = .generatedSynthetic, traits: FictionalTraits? = nil) {
        self.id = id; self.name = name; self.aliases = aliases; self.personality = personality
        self.relationship = relationship; self.pronouns = pronouns; self.voiceID = voiceID
        self.avatarPath = avatarPath; self.contactIdentifier = contactIdentifier
        self.origin = origin; self.traits = traits
    }

    public var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
    public var initials: String {
        name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
    }
}

/// Model-authored attributes for the demo's fictional, synthetic people.
public struct FictionalTraits: Codable, Hashable, Sendable {
    public var ageRange: String
    public var raceEthnicity: String
    public var nationality: String
    public var gender: String
    public var accent: String
    public var voiceDescription: String

    public init(ageRange: String = "", raceEthnicity: String = "", nationality: String = "",
                gender: String = "", accent: String = "", voiceDescription: String = "") {
        self.ageRange = ageRange; self.raceEthnicity = raceEthnicity; self.nationality = nationality
        self.gender = gender; self.accent = accent; self.voiceDescription = voiceDescription
    }
}

public struct PreparedVoice: Identifiable, Codable, Hashable, Sendable {
    public var id: String { voiceID }
    public var label: String
    public var voiceID: String
    public var name: String
    public var description: String

    public init(label: String, voiceID: String, name: String, description: String = "") {
        self.label = label; self.voiceID = voiceID; self.name = name; self.description = description
    }
}

public enum NameResolution: Equatable, Sendable {
    case none
    case match(UUID)
    case ambiguous([UUID])
}

public enum CharacterLibrary {
    public static func resolve(_ name: String, in characters: [CharacterProfile]) -> NameResolution {
        let query = normalize(name)
        guard !query.isEmpty else { return .none }
        let exact = characters.filter { normalize($0.name) == query || $0.aliases.contains { normalize($0) == query } }
        let matches = exact.isEmpty ? characters.filter { normalize($0.firstName) == query } : exact
        let ids = Array(Set(matches.map(\.id))).sorted { $0.uuidString < $1.uuidString }
        if ids.count == 1 { return .match(ids[0]) }
        return ids.isEmpty ? .none : .ambiguous(ids)
    }

    private static func normalize(_ value: String) -> String {
        value.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .split(whereSeparator: \.isWhitespace).joined(separator: " ")
    }
}
