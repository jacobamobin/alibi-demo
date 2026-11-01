import XCTest

final class AlibiUITests: XCTestCase {
    func testPreviewSupportsThreeDistinctParticipantsAndEndCall() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        app.buttons["previewCall"].tap()
        XCTAssertTrue(app.staticTexts["Preview · no live audio"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.otherElements["participant-Owen"].exists)
        app.buttons["addPeople"].tap()
        app.buttons["join-Maya"].tap()
        XCTAssertTrue(app.otherElements["participant-Maya"].waitForExistence(timeout: 3))
        app.buttons["addPeople"].tap()
        app.buttons["join-Leo"].tap()
        XCTAssertTrue(app.otherElements["participant-Leo"].waitForExistence(timeout: 3))
        app.buttons["endCall"].tap()
        XCTAssertTrue(app.buttons["newCall"].waitForExistence(timeout: 3))
    }

    func testSettingsHasSecureProviderKeyFields() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        app.buttons["settings"].tap()
        XCTAssertTrue(app.secureTextFields["elevenLabsKey"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.secureTextFields["openAIKey"].exists)
        XCTAssertTrue(app.buttons["saveKeys"].exists)
    }
}
