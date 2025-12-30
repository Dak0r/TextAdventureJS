/**
 * TextAdventureJS Player JavaScript Helper Functions
 *
 * The textAdventure Engine is not modifying your page directly, the integration has to provide functions for these tasks.
 * This file provides default implementations which can be that can be used as a reference for building your own player.
 */

var textAdvEngine = undefined;
var messageQueueCount = 0;

/**
 * Function that allows the text Adventure engine to output text to the player
 * @param {string} output The output text
 */
function writeLine(output) {
    const gameLog = document.getElementById("gameLog");
    // delay messages a bit. With jQuery messageQueueCount is not needed, as you could use $(...).delay(100).queue(...)
    messageQueueCount++;
    setTimeout(function () {
        gameLog.innerHTML += output + "<br />";
        // Scroll to the bottom
        gameLog.scrollTop = gameLog.scrollHeight;

        // Enforce focus on the input field, so the user can continue typing
        const playerInput = document.getElementById("playerInput");
        playerInput.focus();
        messageQueueCount--;
    }, 100 * messageQueueCount);
}

/**
 * Function that allows the text Adventure engine to clear the output area
 */
function clearArea() {
    const gameLog = document.getElementById("gameLog");
    messageQueueCount++;
    setTimeout(function () {
        gameLog.innerHTML = "";
        gameLog.scrollTop = gameLog.scrollHeight;
        playerInput.focus();
        messageQueueCount--;
    }, 100 * messageQueueCount);
}

/**
 * Optional function that allows the text Adventure engine to send analytics events
 * @param {string} eventName The name of the event
 * @param {object} eventData Additional data for the event
 */
function analyticsFunction(eventName, eventData) {
    console.log(
        "Analytics event: " + eventName + " " + JSON.stringify(eventData)
    );
}

/**
 * Function to read player input from the input field and send it to the text adventure engine
 */
function readUserInput() {
    const playerSubmitButton = document.getElementById("playerSubmitButton");
    const playerInput = document.getElementById("playerInput");

    const playerInputValue = playerInput.value.trim();
    if (playerInputValue === "") {
        // Ignore empty input
        return;
    }

    // Disable the input field and submit button while processing the input
    playerSubmitButton.disabled = true;
    playerInput.readOnly = true;

    // Output the user input to the output area
    // this is not done by the engine automatically, to allow custom handling and formatting if desired
    writeLine("> " + playerInputValue);

    // Send the input to the text adventure engine for processing
    textAdvEngine.input(playerInputValue);

    // Clear the input field for the next input
    playerInput.value = "";
    playerSubmitButton.disabled = false;
    playerInput.readOnly = false;
}

/**
 * Function to set up the input field and submit button event listeners
 */
function setupInputFieldEventListeners() {
    const playerSubmitButton = document.getElementById("playerSubmitButton");
    const playerInput = document.getElementById("playerInput");

    // Set up submit action for the button
    playerSubmitButton.addEventListener("click", function () {
        readUserInput();
    });

    // Set up submit action for the enter key, so that the button is not needed
    playerInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            readUserInput();
        }
    });

    playerInput.focus();
}

/**
 * Sets up Event Listener for opening any game file json from the UI
 */
function setupEventListenersForGameSelection() {
    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", function () {
        const file = this.files && this.files[0];
        this.value = null;
        if (!file) {
            return;
        }
        reader = new FileReader();
        // Handle successful read and catch JSON/initialization errors
        reader.onload = function (event) {
            try {
                console.log(event.target);
                const jsonObj = JSON.parse(event.target.result);
                textAdvEngine.loadDatabaseFromObject(jsonObj);
            } catch (err) {
                console.error("Error initializing database from file:", err);
                alert(
                    "Error loading file '" +
                        (file && file.name ? file.name : "") +
                        "': " +
                        (err && err.message ? err.message : err)
                );
            }
        };
        reader.readAsText(file);
    });
    const loadGameFileButton = document.getElementById("loadGameFile");
    loadGameFileButton.addEventListener("click", function () {
        fileInput.click();
    });
}

/**
 * Non jquery replacement of jquery's $.ready function
 */
function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
