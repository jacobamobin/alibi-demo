import AlibiCore
import Foundation

struct VoiceOption: Decodable, Identifiable {
    let voiceID: String
    let name: String
    let labels: [String: String]?
    let previewURL: String?
    var id: String { voiceID }
    enum CodingKeys: String, CodingKey { case voiceID = "voice_id", name, labels, previewURL = "preview_url" }
}

struct ElevenLabsAPI {
    private let session = URLSession.shared

    func voices(key: String) async throws -> [VoiceOption] {
        let data = try await request(path: "/v2/voices?page_size=100", method: "GET", key: key)
        struct Response: Decodable { let voices: [VoiceOption] }
        return try JSONDecoder().decode(Response.self, from: data).voices
    }

    func createTool(_ tool: JSONValue, key: String) async throws -> String {
        let data = try await request(path: "/v1/convai/tools", method: "POST", key: key, body: ["tool_config": tool])
        struct Response: Decodable { let id: String }
        return try JSONDecoder().decode(Response.self, from: data).id
    }

    func prepareAgent(id: String?, voices: [PreparedVoice], toolIDs: [String], key: String) async throws -> String {
        let config = try AgentDefinition.configuration(voices: voices, toolIDs: toolIDs)
        let existing = id.flatMap { $0.isEmpty ? nil : $0 }
        let path = existing.map { "/v1/convai/agents/\($0)" } ?? "/v1/convai/agents/create"
        let data = try await request(path: path, method: existing == nil ? "POST" : "PATCH", key: key, body: config)
        struct Response: Decodable { let agent_id: String }
        return try JSONDecoder().decode(Response.self, from: data).agent_id
    }

    func token(agentID: String, key: String) async throws -> String {
        let request = try ProviderRequests.conversationToken(agentID: agentID, key: key)
        let (data, response) = try await session.data(for: request)
        try validate(response)
        struct Response: Decodable { let token: String }
        return try JSONDecoder().decode(Response.self, from: data).token
    }

    private func request(path: String, method: String, key: String, body: JSONValue? = nil) async throws -> Data {
        guard let url = URL(string: "https://api.elevenlabs.io" + path), url.host == "api.elevenlabs.io" else { throw ProviderFailure(status: 400) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 45
        request.setValue(key, forHTTPHeaderField: "xi-api-key")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }
        let (data, response) = try await session.data(for: request)
        try validate(response)
        return data
    }

    private func validate(_ response: URLResponse) throws {
        let status = (response as? HTTPURLResponse)?.statusCode ?? 500
        guard (200...299).contains(status) else { throw ProviderFailure(status: status) }
    }
}
