class textAdventureEngine {
    TBA_DEBUG = false;

    #database = undefined;

    #gameState = {
        locations: {},
        inventory: {},
        currentLocation: null,
    };

    constructor(outputFunction, clearOutputFunction, analyticsFunction = null) {
        this.outputAddLines = outputFunction;
        this.outputClear = clearOutputFunction;
        this.analyticsFunction = analyticsFunction;
    }

    loadDatabaseFromFile(gamedatabasePath, showGameName = true) {
        this.outputClear();
        this.#writeOutputLines("Initializing Text Adventure Engine...");
        let base = this;
        $.getJSON(gamedatabasePath)
            .done(function (json) {
                base.#initDatbase(json, showGameName);
            })
            .fail(function (jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                console.log("Request Failed: " + err);
                base.outputAddLines("Failed to Load json");
            });
    }

    loadDatabaseFromObject(json, showGameName = true) {
        this.outputClear();
        this.#writeOutputLines("Initializing Text Adventure Engine...");
        this.#initDatbase(json, showGameName);
    }

    input(cmd) {
        this.#praseCommand(cmd);
    }

    #initDatbase(gameDatabaseObject, showGameName = true) {
        this.#database = gameDatabaseObject;
        var base = this;

        // init runtime locations
        $.each(this.#database.locations, function (key, val) {
            base.#gameState.locations[key] = JSON.parse(JSON.stringify(val)); // deep copy
        });

        if (this.TBA_DEBUG) {
            $.each(this.#database.verbs, function (name, item) {
                base.outputAddLines("Loaded Action: " + name);
            });
            $.each(this.#database.objects, function (name, item) {
                base.outputAddLines("Loaded Object: " + name);
            });
            $.each(this.#gameState.locations, function (name, item) {
                base.outputAddLines("Loaded Location: " + name);
            });

            this.#writeOutputLines("Loading done.");
        }
        if (showGameName) {
            this.outputClear();
            this.#writeOutputLines([
                "Game: " + this.#database.general.title,
                "Version: " + this.#database.general.version,
                "Author: " + this.#database.general.author,
                "",
            ]);
        } else {
            this.outputClear();
        }
        this.#praseCommand("welcome");
    }

    #showRequest() {
        this.#writeOutputLines(this.#database.general.request);
    }

    #removeFromString(arr, str) {
        let regex = new RegExp("\\b" + arr.join("|") + "\\b", "gi");
        let removed = str.replace(regex, "");
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

        if (cmd == "welcome") {
            this.#gameState.inventory = {};
            if (this.#database.general.start.text.length > 0) {
                this.#writeOutputLines(this.#database.general.start.text);
            }
            this.#runActions(undefined, this.#database.general.start.commands);
        } else if (cmd == "debug") {
            if (this.TBA_DEBUG == true) {
                this.TBA_DEBUG = true;
            } else {
                this.TBA_DEBUG = false;
            }
        } else if (
            cmd == "help" ||
            cmd == "?" ||
            cmd == "what" ||
            cmd == "how" ||
            cmd == "what do"
        ) {
            var allVerbs = "";
            $.each(this.#database.verbs, function (name, val) {
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

            let object = undefined;
            if (this.#gameState.inventory[objectInfo.id] != undefined) {
                object = this.#gameState.inventory[objectInfo.id];
            } else {
                object = this.#database.objects[objectInfo.id];
            }

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
                var result = object.actions[verbInfo.id];
                if (this.TBA_DEBUG == true) {
                    console.log(result);
                    this.#writeOutputLines("Action: " + verbInfo.id);
                    this.#writeOutputLines("Object: " + objectInfo.id);
                }

                if (result != undefined) {
                    let objectVerbAction = object.actions[verbInfo.id];
                    this.#writeOutputLines(objectVerbAction.text, {
                        verb: verbInfo.word,
                        object: objectInfo.word,
                    });
                    this.#runActions(objectInfo.id, objectVerbAction.commands);
                    this.#analyticsEvent("command", {
                        input: cmd,
                    });
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
                inventory: Object.keys(this.#gameState.inventory), // TODO: Object.Keys not needed, once inventory only stores names
            };
            eventData = { ...eventData, ...additionalData };
            this.analyticsFunction(eventName, eventData);
        }
    }

    #writeLocationDescription(objectsInLocation) {
        var fullLocationDescription = "";
        for (var i = 0; i < objectsInLocation.length; i++) {
            let thisObject = this.#database.objects[objectsInLocation[i]];
            if (thisObject.locationDescription.length > 0) {
                if (fullLocationDescription.length !== 0) {
                    fullLocationDescription += " ";
                }
                fullLocationDescription += thisObject.locationDescription;
            }
        }
        this.#writeOutputLines(fullLocationDescription);

        if (Object.keys(this.#gameState.inventory).length > 0) {
            for (var index in this.#gameState.inventory) {
                let currentItemDescription =
                    this.#gameState.inventory[index].locationDescription;
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
        if ($.isArray(actions)) {
            for (var i = 0; i < actions.length; i++) {
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
        var acts = actionString.split(" ");
        for (var i = 1; i < acts.length; i++) {
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
            var index = this.#getLocationState(
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
            var index = this.#getLocationState(
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
            var currentRoomState = this.#getLocationState(
                this.#gameState.currentLocation
            );
            this.#writeLocationDescription(currentRoomState.objects);
        } else if (acts[0] == "showLocationDescription") {
            var currentRoomState = this.#getLocationState(
                this.#gameState.currentLocation
            );
            this.#writeLocationDescription(currentRoomState.objects);
        } else if (acts[0] == "inventoryAdd") {
            console.log("Add or replace inventory item: " + acts[1]);
            this.#gameState.inventory[acts[1]] =
                this.#database.objects[acts[1]]; //TODO: it would be enough to just store the name, just like with locations
        } else if (acts[0] == "inventoryRemove") {
            console.log("Remove inventory object, if it exists " + acts[1]);
            delete this.#gameState.inventory[acts[1]];
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
        for (var i = 0; i < words.length && verbId === undefined; i++) {
            $.each(this.#database.verbs, function (key, val) {
                let test = $.inArray(words[i], val.words);
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
        var locationState = this.#getLocationState(
            this.#gameState.currentLocation
        );
        let objectId = undefined;
        let usedWord = undefined;
        // Check room Items
        for (var i = 0; i < words.length; i++) {
            // Check inventory item
            if (Object.keys(this.#gameState.inventory).length > 0) {
                for (var name in this.#gameState.inventory) {
                    let test = $.inArray(
                        words[i],
                        this.#getObject(this.#gameState.inventory[name]).words
                    );
                    if (test >= 0) {
                        objectId = name;
                        usedWord = words[i];
                        return { id: objectId, word: usedWord };
                    }
                }
            }
            // check for objects in room
            var base = this;
            $.each(locationState.objects, function (index, name) {
                let test = $.inArray(words[i], base.#getObject(name).words);
                if (test >= 0) {
                    objectId = name;
                    usedWord = words[i];
                    return; // exit $.each loop
                }
            });
            if (objectId != undefined) {
                break;
            }
        }
        return { id: objectId, word: usedWord };
    }

    #writeOutputLines(lines, placeholderValues = {}) {
        if (!lines) {
            return;
        }
        if (!$.isArray(lines)) {
            lines = [lines];
        }
        for (var i = 0; i < lines.length; i++) {
            let line = lines[i];
            // replace placeholders
            $.each(placeholderValues, function (key, value) {
                let regex = new RegExp("\\{" + key + "\\}", "gi");
                line = line.replace(regex, value);
            });
            this.outputAddLines(line);
        }
    }

    // disabled for now:
    #checkForSecondObject(words) {
        var locationState = this.#getLocationState(
            this.#gameState.currentLocation
        );
        console.log("checking for seconds object");
        var value = undefined;
        var founds = 0;

        for (var i = 0; i < words.length; i++) {
            let isInventoryItem = false;
            // Check inventory item
            if (Object.keys(this.#gameState.inventory).length > 0) {
                for (var index in this.#gameState.inventory) {
                    let test = $.inArray(
                        words[i],
                        this.#getObject(this.#gameState.inventory[index]).words
                    );
                    if (test >= 0) {
                        value = this.#gameState.inventory[index];
                        founds++;
                        isInventoryItem = true;
                    }
                }
            }
            if (!isInventoryItem) {
                // check for objects in room
                var base = this;
                $.each(locationState.objects, function (index, val) {
                    let test = $.inArray(
                        words[i],
                        base.#database.objects[val].words
                    );
                    if (test >= 0) {
                        value = base.#database.objects[val];
                        founds++;
                        return;
                    }
                });
            }
            if (founds >= 2) {
                break;
            }
        }
        return value;
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
