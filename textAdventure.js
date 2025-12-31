class textAdventureEngine {
    #database = undefined;
    #gameState = {
        locations: {},
        inventory: [],
        currentLocation: null,
    };

    showGameInfo = true;

    constructor(outputFunction, clearOutputFunction, analyticsFunction = null) {
        this.outputAddLines = outputFunction;
        this.outputClear = clearOutputFunction;
        this.analyticsFunction = analyticsFunction;
    }

    async loadDatabaseFromFile(gamedatabasePath, showGameInfo = true) {
        this.showGameInfo = showGameInfo;
        try {
            this.outputClear();
            this.#writeOutputLines("Initializing Text Adventure Engine...");
            const response = await fetch(gamedatabasePath);
            const json = await response.json();
            this.outputClear();
            this.#initDatbase(json);
        } catch (err) {
            console.error(err);
            this.#writeOutputLines("Error loading game database!");
        }
    }

    loadDatabaseFromObject(json) {
        try {
            this.outputClear();
            this.#initDatbase(json);
        } catch (err) {
            console.error(err);
            this.#writeOutputLines("Error loading game database!");
        }
    }

    input(cmd) {
        this.#praseCommand(cmd);
    }

    #initDatbase(gameDatabaseObject) {
        this.#database = gameDatabaseObject;

        if (
            this.#database.general.continue_enabled === false ||
            !this.#loadToGameStateFromStorage()
        ) {
            this.#resetGame();
        } else {
            this.#writeOutputLines(["Resuming from previous session...", " "]);
            const currentRoomState = this.#getLocationState(
                this.#gameState.currentLocation
            );
            this.#writeLocationDescription(currentRoomState.objects);
        }
    }

    #showRequest() {
        this.#writeOutputLines(this.#database.general.request);
    }

    #removeFromString(arr, str) {
        const regex = new RegExp("\\b" + arr.join("|") + "\\b", "gi");
        const removed = str.replace(regex, "");
        return removed.replace(/\s\s+/g, " ");
    }

    #praseCommand(cmd) {
        cmd = cmd.toLowerCase();

        // remove ignored words from command
        cmd = this.#removeFromString(
            this.#database.general.parser_ignored_words,
            cmd
        );
        cmd = cmd.trim();
        console.log("Stripped command of parser: '" + cmd + "'");

        if (
            cmd == "help" ||
            cmd == "?" ||
            cmd == "what" ||
            cmd == "how" ||
            cmd == "what do"
        ) {
            let allVerbs = "";
            const that = this;
            Object.keys(this.#database.verbs).forEach(function (name, index) {
                const val = that.#database.verbs[name];
                if (allVerbs != "") {
                    allVerbs += ", " + name;
                } else {
                    allVerbs += name;
                }
            });
            this.#writeOutputLines([
                "Enter simple directions like",
                "<i>look at wall</i>",
            ]);
            this.#writeOutputLines("Commonly used verbs are: " + allVerbs);
        } else {
            const words = cmd.split(" ");

            // deconstruct tuple return from checkForVerb and checkForObject
            const verbInfo = this.#checkForVerb(words);
            const verb = this.#database.verbs[verbInfo.id];

            const objectInfo = this.#checkForObject(words);

            const object = this.#database.objects[objectInfo.id];

            //no action
            if (verb == undefined && object != undefined) {
                this.#writeOutputLines(
                    this.#database.general.parser_unknown_verb_text
                );
                this.#analyticsEvent("unknown_verb", {
                    input: cmd,
                });
                return;
            }

            // verb as standalone action
            if (verb != undefined && words.length === 1) {
                console.log("Standalone Action: " + verbInfo.id);
                this.#writeOutputLines(
                    this.#database.verbs[verbInfo.id].standalone_action.text,
                    { verb: verbInfo.word }
                );
                this.#runActions(
                    undefined,
                    this.#database.verbs[verbInfo.id].standalone_action.commands
                );
                this.#analyticsEvent("command", {
                    input: cmd,
                });
                this.#showRequest();
                return;
            }

            //no object
            if (verb != undefined && object == undefined) {
                console.log("object is undefined");
                this.#writeOutputLines(verb.failure, { verb: verbInfo.word });
                this.#analyticsEvent("unknown_object", {
                    input: cmd,
                });
                this.#showRequest();
                return;
            }

            //Do a regular Action (verb)
            if (verb != undefined && object != undefined) {
                console.log("Action: " + verb.words);
                console.log("Object: " + objectInfo.id);
                const result = object.actions[verbInfo.id];

                if (result != undefined) {
                    const objectVerbAction = object.actions[verbInfo.id];
                    this.#writeOutputLines(objectVerbAction.text, {
                        verb: verbInfo.word,
                        object: objectInfo.word,
                    });
                    this.#runActions(objectInfo.id, objectVerbAction.commands);
                    this.#analyticsEvent("command", {
                        input: cmd,
                    });
                    if (verbInfo.id !== "look") {
                        // Auto Save
                        if (this.#database.general.continue_enabled == true) {
                            this.#saveGameStateToStorage();
                        }
                    }
                } else {
                    this.#writeOutputLines(verb.failure, {
                        verb: verbInfo.word,
                        object: objectInfo.word,
                    });
                    this.#analyticsEvent("unknown_verb_for_object", {
                        input: cmd,
                    });
                }
                this.#showRequest();
                return;
            }
            this.#writeOutputLines(this.#database.general.parser_error_text);
            this.#analyticsEvent("unknown_command", {
                input: cmd,
            });
        }
        this.#showRequest();
    }

    #analyticsEvent(eventName, eventData = {}) {
        if (this.analyticsFunction) {
            const additionalData = {
                currentLocation: this.#gameState.currentLocation,
                location:
                    this.#gameState.locations[this.#gameState.currentLocation]
                        .objects,
                inventory: this.#gameState.inventory,
            };
            eventData = { ...eventData, ...additionalData };
            this.analyticsFunction(eventName, eventData);
        }
    }

    #writeLocationDescription(objectsInLocation) {
        let fullLocationDescription = "";
        for (let i = 0; i < objectsInLocation.length; i++) {
            const thisObject = this.#database.objects[objectsInLocation[i]];
            if (thisObject.locationDescription.length > 0) {
                if (fullLocationDescription.length !== 0) {
                    fullLocationDescription += " ";
                }
                fullLocationDescription += thisObject.locationDescription;
            }
        }
        this.#writeOutputLines(fullLocationDescription);

        if (this.#gameState.inventory.length > 0) {
            for (let i = 0; i < this.#gameState.inventory.length; i++) {
                const objectId = this.#gameState.inventory[i];
                const currentItemDescription =
                    this.#getObject(objectId).locationDescription;
                if (currentItemDescription.length > 0) {
                    this.#writeOutputLines(currentItemDescription);
                }
            }
        }
    }

    #runActions(callingObjectName, actions) {
        if (!actions) {
            return;
        }
        if (Array.isArray(actions)) {
            for (let i = 0; i < actions.length; i++) {
                this.#parseActionString(callingObjectName, actions[i]);
            }
        } else {
            this.#parseActionString(callingObjectName, actions);
        }
    }

    #parseActionString(callingObjectName, actionString) {
        if (!actionString) {
            return;
        }
        const acts = actionString.split(" ");
        for (let i = 1; i < acts.length; i++) {
            if (acts[i].trim() == "this") {
                if (callingObjectName != undefined) {
                    acts[i] = callingObjectName;
                } else {
                    console.error(
                        "Action " +
                            acts[0] +
                            " had parameter 'this' but no calling object name was defined!"
                    );
                    return;
                }
            }
        }
        if (acts[0] == "objectRemoveFromLocation") {
            console.log("removing Object from Location: " + acts[1]);
            const index = this.#getLocationState(
                this.#gameState.currentLocation
            ).objects.indexOf(acts[1]);
            if (index > -1) {
                this.#getLocationState(
                    this.#gameState.currentLocation
                ).objects.splice(index, 1);
                console.log("Removed object with index: " + index);
            } else {
                console.log("Object not found in location: " + acts[1]);
            }
        } else if (acts[0] == "objectAddToLocation") {
            console.log("adding Object to Location:" + acts[1]);
            this.#getLocationState(
                this.#gameState.currentLocation
            ).objects.push(acts[1]);
        } else if (acts[0] == "objectReplaceInLocation") {
            const index = this.#getLocationState(
                this.#gameState.currentLocation
            ).objects.indexOf(acts[1]);
            if (index > -1) {
                this.#getLocationState(
                    this.#gameState.currentLocation
                ).objects.splice(index, 1);
                console.log("Removed object with index: " + index);
            } else {
                console.log("Object not found in location: " + acts[1]);
            }
            this.#getLocationState(
                this.#gameState.currentLocation
            ).objects.push(acts[2]);
        } else if (acts[0] == "gotoLocation") {
            console.log("SIWTCHING LOCATION TO:" + acts[1]);
            this.#gameState.currentLocation = acts[1];
            const currentRoomState = this.#getLocationState(
                this.#gameState.currentLocation
            );
            this.#writeLocationDescription(currentRoomState.objects);
        } else if (acts[0] == "showLocationDescription") {
            const currentRoomState = this.#getLocationState(
                this.#gameState.currentLocation
            );
            this.#writeLocationDescription(currentRoomState.objects);
        } else if (acts[0] == "inventoryAdd") {
            console.log("Add or replace inventory item: " + acts[1]);
            this.#gameState.inventory.push(acts[1]);
        } else if (acts[0] == "inventoryRemove") {
            console.log("Remove inventory object, if it exists " + acts[1]);
            const index = this.#gameState.inventory.indexOf(acts[1]);
            if (index >= 0) {
                this.#gameState.inventory.splice(index, 1);
            }
        } else if (acts[0] == "restartGame") {
            console.log("Restarting game");
            this.#resetGame();
        }
    }

    #getLocationState(location) {
        return this.#gameState.locations[location];
    }

    #getObject(object) {
        if (typeof object === "string" || object instanceof String) {
            return this.#database.objects[object];
        } else {
            return object;
        }
    }

    #checkForVerb(words) {
        let verbId = undefined;
        let usedWord = undefined;
        const that = this;
        for (let i = 0; i < words.length && verbId === undefined; i++) {
            Object.keys(this.#database.verbs).forEach(function (key, index) {
                const test = that.#database.verbs[key].words.indexOf(words[i]);
                if (test >= 0) {
                    verbId = key;
                    usedWord = words[i];
                    return;
                }
            });
        }
        return { id: verbId, word: usedWord };
    }

    #checkForObject(words) {
        const locationState = this.#getLocationState(
            this.#gameState.currentLocation
        );
        let objectId = undefined;
        let usedWord = undefined;
        // Check room Items
        for (let i = 0; i < words.length; i++) {
            // Check inventory item
            if (this.#gameState.inventory.length > 0) {
                for (
                    let invIndex = 0;
                    invIndex < this.#gameState.inventory.length;
                    invIndex++
                ) {
                    const test = this.#getObject(
                        this.#gameState.inventory[invIndex]
                    ).words.indexOf(words[i]);
                    if (test >= 0) {
                        objectId = this.#gameState.inventory[invIndex];
                        usedWord = words[i];
                        return { id: objectId, word: usedWord };
                    }
                }
            }
            // check for objects in room
            const that = this;
            locationState.objects.forEach(function (name, index) {
                const test = that.#getObject(name).words.indexOf(words[i]);
                if (test >= 0) {
                    objectId = name;
                    usedWord = words[i];
                    return; // break out of forEach
                }
            });
            if (objectId != undefined) {
                break;
            }
        }
        return { id: objectId, word: usedWord };
    }

    #writeOutputLines(lines, placeholderValues = undefined) {
        if (!lines) {
            return;
        }
        if (!Array.isArray(lines)) {
            lines = [lines];
        }
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            // replace placeholders
            if (placeholderValues) {
                Object.keys(placeholderValues).forEach(function (key, index) {
                    const regex = new RegExp("\\{" + key + "\\}", "gi");
                    line = line.replace(regex, placeholderValues[key]);
                });
            }
            this.outputAddLines(line);
        }
    }

    #getGameId() {
        return (this.#database.author + "_" + this.#database.general.title)
            .replace(/\s+/g, "_")
            .toLowerCase();
    }
    #saveGameStateToStorage() {
        localStorage.setItem(
            this.#getGameId(),
            JSON.stringify(this.#gameState)
        );
        console.log("Game state saved to local storage.");
    }
    #loadToGameStateFromStorage() {
        const stored = localStorage.getItem(this.#getGameId());
        if (stored == undefined) {
            return false;
        }
        this.#gameState = JSON.parse(stored);
        return true;
    }
    #deleteGameStateFromStorage() {
        localStorage.removeItem(this.#getGameId());
    }
    #resetGame() {
        this.#deleteGameStateFromStorage();
        this.#gameState = {
            locations: {},
            inventory: [],
            currentLocation: null,
        };
        const that = this;
        Object.keys(this.#database.locations).forEach(function (key, index) {
            const val = that.#database.locations[key];
            that.#gameState.locations[key] = JSON.parse(JSON.stringify(val)); // deep copy
        });

        this.outputClear();
        if (this.showGameInfo) {
            this.#writeOutputLines([
                "Game: " + this.#database.general.title,
                "Version: " + this.#database.general.version,
                "Author: " + this.#database.general.author,
            ]);
            if (this.#database.general.continue_enabled == true) {
                this.#writeOutputLines("This game saves automatically.");
            }
            this.#writeOutputLines(" ");
        }
        this.#gameState.inventory = [];
        if (this.#database.general.start.text.length > 0) {
            this.#writeOutputLines(this.#database.general.start.text);
        }
        this.#runActions(undefined, this.#database.general.start.commands);
    }

    devGetGameState() {
        return this.#gameState;
    }
    devResetRoom() {
        this.#gameState.locations[this.#gameState.currentLocation] = JSON.parse(
            JSON.stringify(
                this.#database.locations[this.#gameState.currentLocation]
            )
        ); // deep copy
        this.#praseCommand("look");
    }
}

// Export for Node.js (required for tests)
if (typeof module !== "undefined" && module.exports) {
    module.exports = textAdventureEngine;
}
