import AlibiCore
import Combine
import Foundation
import UIKit

struct AppSettings: Codable {
    var agentID = ""
    var managedAgent = false
    var toolIDs: [String: String] = [:]
    var preparedSignature = ""
    var voices = Fixtures.voices
    var scene = Fixtures.scene
    var profileModel = "gpt-5-mini"
    var imageModel = "gpt-image-2.5-flare"
    var automaticPortraits = false
    var voiceSignature: String { voices.map { "\($0.label):\($0.voiceID)" }.joined(separator: "|") }
}

struct RecentCall: Identifiable, Codable {
    var id = UUID()
    let date: Date
    let names: [String]
    let duration: Int
}

@MainActor
final class AppStoreModel: ObservableObject {
    @Published var people: [CharacterProfile] = Fixtures.people
    @Published var settings = AppSettings()
    @Published var recents: [RecentCall] = []
    @Published var showSettings = false
    @Published var showNewCall = false
    @Published var showNewPerson = false
    @Published var callPresented = false
    let credentials = KeychainCredentialStore()
    let api = ElevenLabsAPI()
    let isUITesting: Bool
    lazy var call = CallSession(store: self)
    private let directory: URL

    init() {
        isUITesting = ProcessInfo.processInfo.arguments.contains("--ui-testing")
        directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Alibi", isDirectory: true)
        if !isUITesting {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            if let data = UserDefaults.standard.data(forKey: "alibi.settings"), let decoded = try? JSONDecoder().decode(AppSettings.self, from: data) { settings = decoded }
            if let data = try? Data(contentsOf: directory.appendingPathComponent("people.json")), let decoded = try? JSONDecoder().decode([CharacterProfile].self, from: data) { people = decoded }
            if let data = try? Data(contentsOf: directory.appendingPathComponent("recents.json")), let decoded = try? JSONDecoder().decode([RecentCall].self, from: data) { recents = decoded }
        }
    }

    func persist() {
        guard !isUITesting else { return }
        if let data = try? JSONEncoder().encode(settings) { UserDefaults.standard.set(data, forKey: "alibi.settings") }
        if let data = try? JSONEncoder().encode(people) { try? data.write(to: directory.appendingPathComponent("people.json"), options: [.atomic, .completeFileProtection]) }
        if let data = try? JSONEncoder().encode(recents) { try? data.write(to: directory.appendingPathComponent("recents.json"), options: [.atomic, .completeFileProtection]) }
    }

    func upsert(_ person: CharacterProfile) {
        if let index = people.firstIndex(where: { $0.id == person.id }) { people[index] = person }
        else { people.append(person) }
        persist()
    }

    func saveAvatar(_ data: Data, for id: UUID) throws -> String {
        let folder = directory.appendingPathComponent("Portraits", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent("\(id.uuidString).jpg")
        guard let image = UIImage(data: data), let jpeg = image.jpegData(compressionQuality: 0.85) else { throw RosterError.invalidCharacter }
        try jpeg.write(to: url, options: [.atomic, .completeFileProtection])
        return url.path
    }

    func startCall(_ person: CharacterProfile, preview: Bool = false) {
        showNewCall = false
        if !preview && ((credentials.read(.elevenLabs) ?? "").isEmpty || settings.agentID.isEmpty) { showSettings = true; return }
        callPresented = true
        Task { await call.start(with: person, preview: preview) }
    }

    func recordCall(names: [String], duration: Int) {
        recents.insert(.init(date: Date(), names: names, duration: duration), at: 0)
        recents = Array(recents.prefix(50))
        persist()
    }
}
