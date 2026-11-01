import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct ProviderFailure: LocalizedError, Sendable {
    public let status: Int
    public init(status: Int) { self.status = status }
    public var errorDescription: String? {
        switch status {
        case 401, 403: return "The provider rejected access. Check your API key and permissions in Settings."
        case 402, 429: return "The provider's usage or rate limit was reached. Check your account and try again."
        case 404: return "The selected agent, model, or voice wasn't found. Check Settings."
        case 400, 422: return "The provider couldn't accept this configuration. Check the selected voices and agent setup."
        default: return "The provider couldn't complete the request. Please try again."
        }
    }
}

public enum ProviderRequests {
    public static func conversationToken(agentID: String, key: String) throws -> URLRequest {
        var components = URLComponents(string: "https://api.elevenlabs.io/v1/convai/conversation/token")!
        components.queryItems = [.init(name: "agent_id", value: agentID)]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue(key, forHTTPHeaderField: "xi-api-key")
        request.timeoutInterval = 30
        return request
    }
}
