import AlibiCore
import Foundation

enum Fixtures {
    static let voices = [
        PreparedVoice(label: "default", voiceID: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, grounded, conversational male voice"),
        PreparedVoice(label: "Maya", voiceID: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Bright, expressive female voice"),
        PreparedVoice(label: "Leo", voiceID: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Easygoing, energetic male voice")
    ]
    static let people = [
        CharacterProfile(id: UUID(uuidString: "A11B1000-0000-4000-8000-000000000001")!, name: "Owen Brooks",
                         personality: "The laid-back friend hosting board-game night. Warm, grounded, mildly sarcastic. Gives short, specific answers and remembers the scene.",
                         relationship: "Friend · the host", pronouns: "he/him", voiceID: voices[0].voiceID, origin: .fixture),
        CharacterProfile(id: UUID(uuidString: "A11B1000-0000-4000-8000-000000000002")!, name: "Maya Chen",
                         personality: "Quick-witted, competitive, and observant. Won the last game and will lightly tease the others about it. Never contradict established scene facts.",
                         relationship: "Friend · competitive energy", pronouns: "she/her", voiceID: voices[1].voiceID, origin: .fixture),
        CharacterProfile(id: UUID(uuidString: "A11B1000-0000-4000-8000-000000000003")!, name: "Leo Martin",
                         personality: "The upbeat music friend who made tonight's playlist. Friendly and animated, occasionally adds a funny detail without changing established facts.",
                         relationship: "Friend · made the playlist", pronouns: "he/him", voiceID: voices[2].voiceID, origin: .fixture)
    ]
    static let scene = "A fictional board-game night at Owen's apartment. You ordered pizza, Maya won Catan, and Leo made the playlist. Everyone is relaxed and knows each other."
}
