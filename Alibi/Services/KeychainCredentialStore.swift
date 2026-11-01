import Foundation
import Security

enum ProviderCredential: String { case elevenLabs, openAI }

struct KeychainCredentialStore {
    private let service = "ai.alibi.ios.credentials"

    func read(_ provider: ProviderCredential) -> String? {
        var query = baseQuery(provider)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func save(_ rawValue: String, for provider: ProviderCredential) throws {
        let value = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { remove(provider); return }
        let attributes: [String: Any] = [kSecValueData as String: Data(value.utf8)]
        let status = SecItemUpdate(baseQuery(provider) as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = baseQuery(provider)
            item[kSecValueData as String] = Data(value.utf8)
            item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw CredentialStoreError.unavailable }
        } else if status != errSecSuccess { throw CredentialStoreError.unavailable }
    }

    func remove(_ provider: ProviderCredential) { SecItemDelete(baseQuery(provider) as CFDictionary) }

    private func baseQuery(_ provider: ProviderCredential) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
         kSecAttrAccount as String: provider.rawValue]
    }
}

enum CredentialStoreError: LocalizedError {
    case unavailable
    var errorDescription: String? { "Keychain couldn't save the credential. Unlock your iPhone and try again." }
}
