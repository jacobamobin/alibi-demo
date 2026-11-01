// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AlibiCore",
    platforms: [.iOS("26.0"), .macOS(.v13)],
    products: [.library(name: "AlibiCore", targets: ["AlibiCore"])],
    targets: [
        .target(name: "AlibiCore"),
        .executableTarget(name: "AlibiCoreChecks", dependencies: ["AlibiCore"], path: "Tests/AlibiCoreChecks"),
        .testTarget(name: "AlibiCoreTests", dependencies: ["AlibiCore"])
    ]
)
