TBA_DATABASE = undefined;
TBA_DEBUG = false;

var filename = undefined;

var textAdv = undefined;

var previewContainer = undefined;
var previewLog = undefined;
var previewInputText = undefined;
var previewInputButton = undefined;
var previewRestartButton = undefined;
var previewReloadButton = undefined;

const NEWLINE = "\n"; //"&#13;";

const FUNCTIONS = {
    showLocationDescription: [],
    gotoLocation: ["location"],
    objectRemoveFromLocation: ["object"],
    objectAddToLocation: ["object"],
    objectReplaceInLocation: ["object", "object"],
    inventoryAdd: ["object"],
    inventoryRemove: ["object"],
};

var type;

$(document).ready(function () {
    // Create a hidden file input to support click-to-open
    if ($("#fileInput").length === 0) {
        const hiddenFileInput = $(
            '<input type="file" id="fileInput" accept=".json" style="display:none" />'
        );
        $("body").append(hiddenFileInput);
        hiddenFileInput.on("change", function () {
            const file = this.files && this.files[0];
            if (file) importFile(file);
            this.value = null;
        });
    }
    $(".file-drop-area").on("dragenter", (e) => {
        // highlight
        e.preventDefault();
        $(".file-drop-area").addClass("drag-active");
    });

    $(".file-drop-area").on("dragover", (e) => {
        // Prevent navigation and keep highlight
        e.preventDefault();
        $(".file-drop-area").addClass("drag-active");
    });

    $(".file-drop-area").on("dragleave", (e) => {
        // remove highlight
        $(".file-drop-area").removeClass("drag-active");
    });

    $(".file-drop-area").on("drop", async (e) => {
        e.preventDefault();
        $(".file-drop-area").removeClass("drag-active");

        var file = e.originalEvent.dataTransfer.files[0];
        importFile(file);
    });

    // allow clicking the area to open a file picker (hidden input appended below)
    $(".file-drop-area").on("click", function () {
        $("#fileInput").click();
    });
    // keyboard support: Enter or Space opens file picker when area is focused
    $(".file-drop-area").on("keypress", function (e) {
        if (
            e.key === "Enter" ||
            e.key === " " ||
            e.keyCode === 13 ||
            e.keyCode === 32
        ) {
            e.preventDefault();
            $("#fileInput").click();
        }
    });
    $("#btn-new").click(() => {
        // Load the inlined default database JSON
        const defaultJson = getDefaultProjectJson();
        if (defaultJson) {
            tba_init(defaultJson);
        } else {
            alert("Default project JSON not available.");
        }
    });
    $("#btn-save").click(() => {
        download(JSON.stringify(TBA_DATABASE, null, 2), filename, "text/plain");
    });
    $("#btn-close").click(() => {
        if (
            confirm(
                "Are you sure you want to close the current project? Unsaved changes will be lost."
            )
        ) {
            TBA_DATABASE = undefined;
            textAdv = undefined;
            deleteDatabaseFromStorage();
            updateEditorState();
        }
    });
    // Make Save / Close buttons more prominent for quick access
    $("#btn-save").addClass("btn-primary large-action");
    $("#btn-close").addClass("btn-error large-action");

    loadToDatabaseFromStorage();
    updateEditorState();
    if (TBA_DATABASE != undefined) {
        onTypeChanged();
    }
});

function importFile(file) {
    reader = new FileReader();

    // Handle successful read and catch JSON/initialization errors
    reader.onload = function (event) {
        try {
            console.log(event.target);
            tba_init(event.target.result);
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

    // Inform the user if reading the file fails or is aborted
    reader.onerror = function () {
        console.error("FileReader error:", reader.error);
        alert(
            "Error reading file '" +
                (file && file.name ? file.name : "") +
                "': " +
                (reader.error && reader.error.message
                    ? reader.error.message
                    : "Unknown error")
        );
    };
    reader.onabort = function () {
        alert("File read aborted.");
    };

    filename = file.name;
    reader.readAsText(file);
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function saveToDatabaseToStorage() {
    localStorage.setItem("database", JSON.stringify(TBA_DATABASE));
}
function loadToDatabaseFromStorage() {
    var stored = localStorage.getItem("database");
    if (stored != undefined) {
        TBA_DATABASE = JSON.parse(stored);
    }
}
function deleteDatabaseFromStorage() {
    localStorage.removeItem("database");
}

function getDefaultProjectJson() {
    try {
        const el = document.getElementById("default-db");
        if (!el) return null;
        return el.textContent.trim();
    } catch (err) {
        console.error("Failed to read default DB:", err);
        return null;
    }
}

function updateEditorState() {
    if (TBA_DATABASE !== undefined) {
        $("#drop-area").hide();
        $("#editor-aera").show();
    } else {
        $("#drop-area").show();
        $("#editor-aera").hide();
    }
}

function tba_init(json) {
    try {
        TBA_DATABASE = JSON.parse(json);
        updateEditorState();
        onTypeChanged();
    } catch (err) {
        console.error("Failed to initialize database:", err);
        alert(
            "Error parsing database JSON: " +
                (err && err.message ? err.message : err)
        );
    }
}

function onTypeChanged(typeParam) {
    if (typeParam !== undefined) {
        type = typeParam;
    }
    if (type === null || type === undefined) {
        type = "general";
    }

    // Highlight the active tab
    $(".editor-tab").removeClass("active");
    const tabId = "tab" + type.charAt(0).toUpperCase() + type.slice(1);
    $("#" + tabId).addClass("active");

    $("#elementSelection").html("");
    if (type == "general") {
        $("#elementEditor").html(generateUiForGeneral(TBA_DATABASE.general));
        return;
    } else if (type == "preview") {
        $("#elementEditor").html(generateUiForPreview());
        return;
    } else {
        var newArea = $('<div class="w100" />');
        $("#elementSelection").append(newArea);
        if (type === "verbs") {
            newArea.append(
                generateNewButton("Verb", function (name) {
                    if (TBA_DATABASE.verbs[name] !== undefined) {
                        alert("A verb with this name already exists.");
                        return;
                    }
                    const newVerb = getNewVerb(name);
                    TBA_DATABASE.verbs[name] = newVerb;
                    onTypeChanged();
                })
            );
        } else if (type === "objects") {
            newArea.append(
                generateNewButton("Object", function (name) {
                    if (TBA_DATABASE.objects[name] !== undefined) {
                        alert("An object with this name already exists.");
                        return;
                    }
                    TBA_DATABASE.objects[name] = getNewObject(name);
                    onTypeChanged();
                })
            );
        } else if (type === "locations") {
            newArea.append(
                generateNewButton("Location", function (name) {
                    if (TBA_DATABASE.locations[name] !== undefined) {
                        alert("A location with this name already exists.");
                        return;
                    }
                    TBA_DATABASE.locations[name] = getNewLocation();
                    onTypeChanged();
                })
            );
        }

        const elementSelector = $(
            '<select id="element" onchange="onElementChanged()" size="30" class="w100"><select>'
        );
        $.each(TBA_DATABASE[type], function (key, val) {
            elementSelector.append(
                $('<option value="' + key + '">' + key + "</option>")
            );
        });
        $("#elementSelection").append(elementSelector);

        $("#elementEditor").html("");
        onElementChanged();
    }
}

function onElementChanged() {
    onDatabaseChanged();
    let gui = undefined;
    let element = $("#element").val();
    if (element === null) {
        element = $("#element option:first").val();
        $("#element").val(element);
    }

    if (type == "verbs") {
        gui = generateUiForVerbElement(element, TBA_DATABASE.verbs[element]);
    } else if (type == "objects") {
        gui = generateUiForObjectElement(
            element,
            TBA_DATABASE.objects[element]
        );
    } else if (type == "locations") {
        gui = generateUiForLocationElement(
            element,
            TBA_DATABASE.locations[element]
        );
    }
    if (gui !== undefined) {
        $("#elementEditor").html(gui);
    }
}

function onDatabaseChanged() {
    saveToDatabaseToStorage();
}

function generateUiForPreview() {
    if (previewContainer === undefined) {
        previewContainer = $(
            '<div style="width: 600px; margin-left: auto; margin-right: auto;"/>'
        );
        previewLog = $(
                '<div id="outputArea" class="modern-textarea" readonly="readonly" style="width: 100%; height: 400px;">Loading</div> '
            );

        const inputDiv = $(
            '<div style="margin-top: 10px;" class="input-container"/>'
        );
        previewInputText = $(
            '<input id="inputText" placeholder="Enter your command here..." class="modern-input" type="text"  style="width: 100%;"/>'
        );
        previewInputButton = $(
            '<button id="inputButton" class="btn"style="background: transparent; border: 0px; width: 30px; position: relative; top:-35px; left:560px;" type="button">⏎</button>'
        );

        const buttonBar = $("<p />");
        previewRestartButton = button("Restart Game");
        previewReloadButton = button("Reset Current Room");
        buttonBar.append(previewReloadButton);
        buttonBar.append(" ");
        buttonBar.append(previewRestartButton);

        previewContainer.append(buttonBar);
        previewContainer.append(previewLog);
        inputDiv.append(previewInputText);
        inputDiv.append(previewInputButton);
        previewContainer.append(inputDiv);
    }

    previewInputButton.click(function () {
        readUserInput();
    });
    previewRestartButton.click(function () {
        textAdv = undefined;
        startGame();
    });
    previewReloadButton.click(function () {
        textAdv.devResetRoom();
    });

    previewInputText.keypress(function (event) {
        var keycode = event.keyCode ? event.keyCode : event.which;
        if (keycode == "13") {
            // return
            readUserInput();
        }
    });

    if (textAdv === undefined) {
        startGame();
    }
    updatePreviewSideBar();
    previewLog.scrollTop(previewLog[0].scrollHeight);

    setTimeout(function () {
        previewInputText.focus();
    }, 0);

    return previewContainer;
}

function startGame() {
    textAdv = new textAdventureEngine(writeLine, clearArea);
    textAdv.loadDatabaseFromObject(TBA_DATABASE);
}

function writeLine(output) {
    previewLog.delay(100).queue(function(next){
    previewLog.append(output + "<br />");
    previewLog.scrollTop(previewLog[0].scrollHeight);
    previewInputButton.prop("disabled", false);
    previewInputText.prop("readonly", false);
    previewInputText.focus();
    updatePreviewSideBar();
    next();
    });
}

function clearArea() {
    previewLog.html("");
}

function readUserInput() {
    previewInputButton.prop("disabled", true);
    previewInputText.prop("readonly", true);
    const input = previewInputText.val();
    writeLine("> " + input);
    textAdv.input(input);
    previewInputText.val("");
}

function updatePreviewSideBar() {
    const gameState = textAdv.devGetGameState();
    $("#elementSelection").html("");
    const inventoryList = $("<ul />");
    const inv = gameState.inventory;
    if (
        !inv ||
        (Array.isArray(inv) ? inv.length === 0 : Object.keys(inv).length === 0)
    ) {
        inventoryList.append($("<li>(empty)</li>"));
    } else {
        $.each(inv, function (i, objectName) {
            const invObj = $("<li>" + objectName + "</li>");
            const removeButton = button("✖", "btn-error btn-ghost small-btn");
            removeButton.click(function () {
                const index = gameState.inventory.indexOf(objectName);
                gameState.inventory.splice(index, 1);
                updatePreviewSideBar();
            });
            invObj.append(removeButton);
            inventoryList.append(invObj);
        });
    }
    const addToInv = generateNewObjectForLocationButton(
        gameState.inventory,
        function (obj) {
            gameState.inventory.push(obj);
            updatePreviewSideBar();
        }
    );
    $("#elementSelection").append($("<h2>Inventory</h2>"));
    $("#elementSelection").append(inventoryList);
    $("#elementSelection").append(addToInv);
    $("#elementSelection").append($("<hr/>"));

    const locations = $("<ul />");
    $.each(gameState.locations, function (locationName, locationObj) {
        const location = $("<li/>");
        if (locationName == gameState.currentLocation) {
            location.append("<b><u>" + locationName + "</u></b> (current)");
        } else {
            const notCurrentLocation = $("<b>" + locationName + "</b> ");
            const goButton = button("Go", "btn-default small-btn");
            goButton.click(function () {
                gameState.currentLocation = locationName;
                updatePreviewSideBar();
            });
            notCurrentLocation.append(goButton);
            location.append(notCurrentLocation);
        }
        const locationObjs = $("<ul />");
        $.each(locationObj.objects, function (index, objectName) {
            locationObjs.append($("<li>" + objectName + "</li>"));
        });
        location.append(locationObjs);
        locations.append(location);
    });
    $("#elementSelection").append($("<h2>Location States</h2>"));

    $("#elementSelection").append(locations);
}

function generateUiForGeneral(general) {
    const editorGui = $("<div/>");

    const table = $('<table class="w100"/>');
    editorGui.append(table);
    table.append(tableH3("Info"));
    table.append(
        generateInput("Title", general.title, function (value) {
            general.title = value;
        })
    );
    table.append(
        generateInput("Author", general.author, function (value) {
            general.author = value;
        })
    );
    table.append(
        generateInput("Version", general.version, function (value) {
            general.version = value;
        })
    );
    table.append(tableH3("Game Settings"));
    table.append(
        generateTextArea(
            "Request",
            general.request.join(NEWLINE),
            function (value) {
                general.request = value.split(NEWLINE);
            }
        )
    );
    table.append(
        generateInput(
            "Parser Ignored Words",
            general.parser_ignored_words.join(", "),
            function (value) {
                general.parser_ignored_words = value
                    .split(",")
                    .map(function (item) {
                        return item.trim();
                    });
            }
        )
    );
    table.append(
        generateInput(
            "Parser Unknown Verb",
            general.parser_unknown_verb_text,
            function (value) {
                general.parser_unknown_verb_text = value;
            }
        )
    );
    table.append(
        generateInput(
            "Parser Error Text",
            general.parser_error_text,
            function (value) {
                general.parser_error_text = value;
            }
        )
    );
    table.append(tableH3("Game Start"));
    table.append(
        generateTextArea(
            "Introduction",
            general.start.text.join(NEWLINE),
            function (value) {
                general.start.text = value.split(NEWLINE);
            }
        )
    );
    table.append(generateFunctionsUI(general.start.commands));

    return editorGui;
}

function generateUiForVerbElement(verbName, verb) {
    const editorGui = $('<table class="w100"/>');
    const title = $("<span><h2>Verb</h2></span>");

    const nameOptions = $("<span/>");

    const removeButton = button("Delete", "btn-error");
    nameOptions.append("<b>" + verbName + "</b>");
    nameOptions.append(" ");
    removeButton.click(function () {
        if (
            !TBA_DATABASE.verbs ||
            Object.keys(TBA_DATABASE.verbs).length <= 1
        ) {
            alert("Cannot delete the only verb.");
            return;
        }
        if (confirm('Delete verb "' + verbName + ' and also all usages"?')) {
            delete TBA_DATABASE.verbs[verbName];
            $.each(TBA_DATABASE.objects, function (objectName, object) {
                $.each(object.actions, function (action_name, action) {
                    if (action_name === verbName) {
                        delete TBA_DATABASE.objects[objectName].actions[
                            action_name
                        ];
                    }
                });
            });
            onTypeChanged();
        }
    });
    nameOptions.append(removeButton);
    nameOptions.append(" ");
    const duplicateButton = button("Duplicate");
    duplicateButton.click(function () {
        TBA_DATABASE.verbs[getAvailableVerbName(verbName)] = clone(verb);
        onTypeChanged();
    });
    nameOptions.append(duplicateButton);

    editorGui.append(tableRow2(title, nameOptions));
    editorGui.append(
        generateInput("Failure", verb.failure, function (value) {
            verb.failure = value;
        })
    );
    editorGui.append(
        generateInput("Words", verb.words.join(", "), function (value) {
            verb.words = value.split(",").map(function (item) {
                return item.trim();
            });
        })
    );

     editorGui.append(
        generateTextArea(
            "Standalone Usage Text",
            verb.standalone_action.text.join(NEWLINE),
            function (value) {
                verb.standalone_action.text = value.split(NEWLINE);
            }
        )
    );
    editorGui.append(generateFunctionsUI(verb.standalone_action.commands, "Standalone Usage Commands"));
    return editorGui;
}

function generateUiForObjectElement(objectName, object) {
    const editorGui = $('<table class="w100"/>');
    const title = $("<span><h2>Object</h2></span>");

    const nameOptions = $("<span/>");
    const removeButton = button("Delete", "btn-error");
    nameOptions.append("<b>" + objectName + "</b>");
    nameOptions.append(" ");
    removeButton.click(function () {
        if (
            !TBA_DATABASE.objects ||
            Object.keys(TBA_DATABASE.objects).length <= 1
        ) {
            alert("Cannot delete the only object.");
            return;
        }
        if (
            confirm('Delete object "' + objectName + ' and also all usages"?')
        ) {
            delete TBA_DATABASE.objects[objectName];
            // delete object from all locations
            $.each(TBA_DATABASE.locations, function (locationName, location) {
                const index = location.objects.indexOf(objectName);
                if (index !== -1) {
                    TBA_DATABASE.locations[locationName].objects.splice(
                        index,
                        1
                    );
                }
            });
            // delete all actions that reference this object
            $.each(TBA_DATABASE.general.start.commands, function (index, call) {
                if (call && call.includes(objectName)) {
                    TBA_DATABASE.general.start.commands.splice(index, 1);
                }
            });
            $.each(TBA_DATABASE.objects, function (dbObjectName, object) {
                $.each(object.actions, function (action_name, action_info) {
                    $.each(action_info.commands, function (index, call) {
                        if (call && call.includes(objectName)) {
                            TBA_DATABASE.objects[dbObjectName].actions[
                                action_name
                            ].commands.splice(index, 1);
                        }
                    });
                });
            });
            onTypeChanged();
        }
    });
    nameOptions.append(removeButton);
    nameOptions.append(" ");
    const duplicateButton = button("Duplicate");
    duplicateButton.click(function () {
        TBA_DATABASE.objects[getAvailableObjectName(objectName)] =
            clone(object);
        onTypeChanged();
    });
    nameOptions.append(duplicateButton);

    editorGui.append(tableRow2(title, nameOptions));

    editorGui.append(
        generateInput(
            "Location Description",
            object.locationDescription,
            function (value) {
                object.locationDescription = value;
            }
        )
    );
    editorGui.append(
        generateInput("Words", object.words.join(", "), function (value) {
            object.words = value.split(",").map(function (item) {
                return item.trim();
            });
        })
    );
    editorGui.append(tableH3("Actions"));
    $.each(object.actions, function (verb, action) {
        const name = $("<h4><i>" + verb + "</i></h4>");
        const removeActionButton = button("Remove", "btn-error btn-ghost");
        removeActionButton.click(function () {
            delete object.actions[verb];
            onElementChanged();
        });
        editorGui.append(tableRow2(name, removeActionButton));
        editorGui.append(
            generateTextArea(
                "Text",
                action.text.join(NEWLINE),
                function (value) {
                    action.text = value.split(NEWLINE);
                }
            )
        );
        editorGui.append(generateFunctionsUI(action.commands));
    });
    editorGui.append(
        tableRow2(
            "<h4>Add Action</h4>",
            generateNewActionButton(object.actions, function (verb) {
                if (object.actions[name] !== undefined) {
                    alert(
                        "An action with this verb already exists for this object."
                    );
                    return;
                }
                const newAction = getNewObjectAction();
                object.actions[verb] = newAction;
                onElementChanged();
            })
        )
    );

    return editorGui;
}

function generateUiForLocationElement(locationName, location) {
    const editorGui = $('<table class="w100"/>');
    const title = $("<span><h2>Location</h2></span>");

    const nameOptions = $("<span/>");
    const removeButton = button("Delete", "btn-error");
    nameOptions.append("<b>" + locationName + "</b>");
    nameOptions.append(" ");
    removeButton.click(function () {
        if (
            !TBA_DATABASE.locations ||
            Object.keys(TBA_DATABASE.locations).length <= 1
        ) {
            alert("Cannot delete the only location.");
            return;
        }
        if (
            confirm(
                'Delete location "' + locationName + ' and also all usages"?'
            )
        ) {
            delete TBA_DATABASE.locations[locationName];
            // delete all actions that reference this location
            $.each(TBA_DATABASE.general.start.commands, function (index, call) {
                if (call && call.includes(locationName)) {
                    TBA_DATABASE.general.start.commands.splice(index, 1);
                }
            });
            $.each(TBA_DATABASE.objects, function (objectName, object) {
                $.each(object.actions, function (action_name, action_info) {
                    $.each(action_info.commands, function (index, call) {
                        if (call && call.includes(locationName)) {
                            TBA_DATABASE.objects[objectName].actions[
                                action_name
                            ].commands.splice(index, 1);
                        }
                    });
                });
            });
            onTypeChanged();
        }
    });
    nameOptions.append(removeButton);
    nameOptions.append(" ");
    const duplicateButton = button("Duplicate");
    duplicateButton.click(function () {
        TBA_DATABASE.locations[getAvailableLocationName(locationName)] =
            clone(location);
        onTypeChanged();
    });
    nameOptions.append(duplicateButton);

    editorGui.append(tableRow2(title, nameOptions));
    editorGui.append(tableH3("Objects"));

    const previewRow = $("<tr/>");
    const previewHeadline = $("<td>Preview Location Description</td>");
    const previewCell = $("<td/>");

    editorGui.append(previewRow);
    previewRow.append(previewHeadline);
    previewRow.append(previewCell);

    function updatePreviewLocationText() {
        let text = "";
        $.each(location.objects, function (index, objectName) {
            if (text.length > 0) {
                text += " ";
            }
            text += TBA_DATABASE.objects[objectName].locationDescription;
        });
        previewCell.text(text);
    }
    updatePreviewLocationText();

    const rowSelector = $("<tr/>");
    const leftCellSelector = $('<td colspan="2"/>');

    // Render a table where each object has its own Move Up / Move Down / Remove buttons
    const objList = $('<table class="w100 object-list" border="0"/>');
    $.each(location.objects, function (index, objectName) {
        const tr = $("<tr/>");
        const nameTd = $("<td/>").text(objectName);
        tr.append(nameTd);
        const btnsTd = $("<td/>");

        const moveUpButton = button("▲", "btn-default small-btn");
        moveUpButton.attr("title", "Move Up").attr("aria-label", "Move up");
        moveUpButton.click(function () {
            if (index > 0) {
                moveArrayElement(location.objects, index, index - 1);
                onElementChanged();
            }
        });
        if (index === 0) {
            moveUpButton.prop("disabled", true);
        }

        const moveDownButton = button("▼", "btn-default small-btn");
        moveDownButton
            .attr("title", "Move Down")
            .attr("aria-label", "Move down");
        moveDownButton.click(function () {
            if (index < location.objects.length - 1) {
                moveArrayElement(location.objects, index, index + 1);
                onElementChanged();
            }
        });
        if (index === location.objects.length - 1) {
            moveDownButton.prop("disabled", true);
        }

        const editObjectButton = button("🖉", "btn-default small-btn");
        editObjectButton
            .attr("title", "Edit object")
            .attr("aria-label", "Edit object");
        editObjectButton.click(function () {
            // Switch to Objects tab and select this object
            onTypeChanged("objects");
            // Ensure DOM is updated, then select the element, focus it, and scroll into view
            setTimeout(function () {
                const sel = $("#element");
                sel.val(objectName);
                onElementChanged();
                // Bring the selected option into view and focus the select for accessibility
                sel.focus();
                const opt = sel.find('option[value="' + objectName + '"]')[0];
                if (opt && sel[0]) {
                    sel[0].scrollTop = opt.offsetTop - sel.height() / 2;
                }
            }, 0);
        });

        const removeObjectButton = button(
            "Remove",
            "btn-error btn-ghost small-btn"
        );
        removeObjectButton.attr("title", "Remove").attr("aria-label", "Remove");
        removeObjectButton.click(function () {
            if (confirm('Remove "' + objectName + '"?')) {
                location.objects.splice(index, 1);
                onElementChanged();
            }
        });

        // Put buttons inline in a small button group
        const btnGroup = $('<div class="btn-group-inline"/>');
        btnGroup.append(moveUpButton);
        btnGroup.append(moveDownButton);
        btnGroup.append(removeObjectButton);
        nameTd.append(" ");
        nameTd.append(editObjectButton);
        btnsTd.append(btnGroup);
        tr.append(btnsTd);
        objList.append(tr);
    });

    leftCellSelector.append(objList);
    rowSelector.append(leftCellSelector);
    editorGui.append(rowSelector);
    const rowNewObject = $("<tr><td><h4>Add Object</h4></td></tr>");
    rowNewObject.append(
        generateNewObjectForLocationButton(location.objects, function (obj) {
            location.objects.push(obj);
            onElementChanged();
        })
    );
    editorGui.append(rowNewObject);

    return editorGui;
}

function button(text, btnClasses = "btn-default") {
    return $(
        '<button type="button" class="btn ' +
            btnClasses +
            '">' +
            text +
            "</button>"
    );
}

function paragraph(element) {
    const p = $("<p/>");
    p.append(element);
    return p;
}
function tableH3(title) {
    return $('<tr><td colspan="2"><h3>' + title + " </h3></td></tr>");
}
function tableRow(element) {
    const e = $("<tr/>");
    e.append(element);
    return e;
}
function tableRow2(left, right) {
    const r = $("<tr/>");
    const el = $('<td class="left-col"/>');
    el.append(left);
    const er = $("<td/>");
    er.append(right);
    r.append(el);
    r.append(er);
    return r;
}

function moveArrayElement(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        new_index = arr.length - 1;
    } else if (new_index < 0) {
        new_index = 0;
    }
    const element = arr.splice(old_index, 1)[0];
    arr.splice(new_index, 0, element);
}

function clone(obj) {
    const clonedObj = JSON.parse(JSON.stringify(obj));
    return clonedObj;
}

function getAvailableLocationName(locationName) {
    var index = 1;
    var testName = locationName;
    while (TBA_DATABASE.locations[testName] !== undefined) {
        testName = locationName + " " + index;
        index++;
    }
    return testName;
}
function getAvailableObjectName(objectName) {
    var index = 1;
    var testName = objectName;
    while (TBA_DATABASE.objects[testName] !== undefined) {
        testName = objectName + " " + index;
        index++;
    }
    return testName;
}
function getAvailableVerbName(verbName) {
    var index = 1;
    var testName = verbName;
    while (TBA_DATABASE.verbs[testName] !== undefined) {
        testName = verbName + " " + index;
        index++;
    }
    return testName;
}

function generateNewButton(name, onClick) {
    const editorGui = $('<div class="input-pair-container"/>');
    const elementNameInput = $(
        '<input placeholder="New ' +
            name +
            '" id="newElement" type="text" value="" class="left-pair-element modern-input"/>'
    );

    const addButton = button("Add");
    addButton.click(function () {
        const name = elementNameInput.val();
        if (name === undefined || name.length < 1) {
            alert("Every element must have a unique name.");
            return;
        }
        onClick(elementNameInput.val());
    });
    editorGui.append(elementNameInput);
    editorGui.append(addButton);
    return editorGui;
}

function generateNewActionButton(existingActions, onClick) {
    const editorGui = $('<div class="input-pair-container"/>');
    const selectNewAction = $(
        '<select class="left-pair-element modern-input" id="selectNewAction" />'
    );
    $.each(TBA_DATABASE.verbs, function (verb) {
        if (existingActions[verb] !== undefined) {
            return;
        }
        selectNewAction.append($("<option/>").val(verb).html(verb));
    });

    const addButton = button("Add");
    addButton.click(function () {
        onClick(selectNewAction.val());
    });
    editorGui.append(selectNewAction);
    editorGui.append(addButton);
    return editorGui;
}

function generateNewObjectForLocationButton(existingObjects, onClick) {
    const editorGui = $("<td/>");
    const container = $('<div class="input-pair-container"/>');
    const selectNewObject = $(
        '<select class="left-pair-element modern-input" id="selectNewObject" />'
    );
    $.each(TBA_DATABASE.objects, function (obj) {
        if (existingObjects[obj] !== undefined) {
            return;
        }
        selectNewObject.append($("<option/>").val(obj).html(obj));
    });

    const addButton = button("Add");
    addButton.click(function () {
        onClick(selectNewObject.val());
    });
    container.append(selectNewObject);
    container.append(addButton);
    editorGui.append(container);
    return editorGui;
}

function generateFunctionsUI(actions, title="Commands") {
    const editorGui = $("<tr/>");
    const col1 = $("<td>" + title + "</td>");
    const col2 = $("<td/>");
    editorGui.append(col1);
    editorGui.append(col2);

    const existingFunctionsTable = $(
        '<table class="w100 function-list-table" border="0"/>'
    );
    if (!actions || actions.length === 0) {
        const tr = $("<tr/>");
        tr.append($('<td colspan="2">(no functions)</td>'));
        existingFunctionsTable.append(tr);
    } else {
        $.each(actions, function (index, actionString) {
            const tr = $("<tr/>");
            const tdText = $("<td/>");
            const span = $('<span class="func-text"/>').text(actionString);
            tdText.append(span);
            const tdBtns = $("<td/>");
            const btnGroup = $('<div class="btn-group-inline"/>');

            const moveUpButton = button("▲", "btn-default small-btn");
            moveUpButton.attr("title", "Move Up").attr("aria-label", "Move up");
            moveUpButton.click(function () {
                if (index > 0) {
                    moveArrayElement(actions, index, index - 1);
                    onElementChanged();
                }
            });
            if (index === 0) {
                moveUpButton.prop("disabled", true);
            }

            const moveDownButton = button("▼", "btn-default small-btn");
            moveDownButton
                .attr("title", "Move Down")
                .attr("aria-label", "Move down");
            moveDownButton.click(function () {
                if (index < actions.length - 1) {
                    moveArrayElement(actions, index, index + 1);
                    onElementChanged();
                }
            });
            if (index === actions.length - 1) {
                moveDownButton.prop("disabled", true);
            }

            const removeButton = button("✖", "btn-error btn-ghost small-btn");
            removeButton.attr("title", "Remove").attr("aria-label", "Remove");
            removeButton.click(function () {
                if (confirm('Remove "' + actionString + '"?')) {
                    actions.splice(index, 1);
                    onElementChanged();
                }
            });

            btnGroup.append(moveUpButton);
            btnGroup.append(moveDownButton);
            btnGroup.append(removeButton);
            tdBtns.append(btnGroup);

            tr.append(tdText);
            tr.append(tdBtns);
            existingFunctionsTable.append(tr);
        });
    }
    col2.append(existingFunctionsTable);

    const container = $('<div class="input-pair-container"/>');
    const paramsContainer = $('<div class="input-pair-container"/>');
    const selectedFunction = $(
        '<select class="left-pair-element modern-input" id="selectedFunction" />'
    );
    $.each(FUNCTIONS, function (funcName, params) {
        selectedFunction.append($("<option/>").val(funcName).html(funcName));
    });
    selectedFunction.change(function () {
        paramsContainer.empty();
        const funcName = selectedFunction.val();
        const params = FUNCTIONS[funcName];
        $.each(params, function (index, paramName) {
            const parameter = $(
                '<select class="left-pair-element modern-input" id="parameter' +
                    index +
                    '" />'
            );
            if (paramName === "location") {
                $.each(TBA_DATABASE.locations, function (locName, loc) {
                    parameter.append($("<option/>").val(locName).html(locName));
                });
            } else if (paramName === "object") {
                parameter.append($("<option/>").val("this").html("this"));
                $.each(TBA_DATABASE.objects, function (objName, obj) {
                    parameter.append($("<option/>").val(objName).html(objName));
                });
            }
            paramsContainer.append(parameter);
        });
    });
    container.append(selectedFunction);
    container.append(paramsContainer);
    const addButton = button("Add");
    container.append(addButton);
    col2.append(container);
    addButton.click(function () {
        const funcName = selectedFunction.val();
        const params = FUNCTIONS[funcName];
        let actionString = funcName;
        $.each(params, function (index, paramName) {
            const parameter = $("#parameter" + index);
            actionString += " " + parameter.val();
        });
        actions.push(actionString);
        onElementChanged();
    });
    return editorGui;
}

function generateInput(name, value, onChange) {
    const inputFieldArea = $("<tr/>");
    inputFieldArea.append(
        '<td><label for="' + name + '">' + name + "</label></td>"
    );
    const inputField = $(
        '<input id="' +
            name +
            '" type="text" size="30" value="' +
            value +
            '" class="modern-input"/>'
    );
    inputField.on("change", function () {
        onChange(inputField.val());
        onDatabaseChanged();
    });
    const valueTableField = $("<td/>");
    valueTableField.append(inputField);
    inputFieldArea.append(valueTableField);
    return inputFieldArea;
}

function generateTextArea(name, value, onChange) {
    const inputFieldArea = $("<tr/>");
    inputFieldArea.append(
        '<td><label for="' + name + '">' + name + "</label></td>"
    );
    const valueTableField = $("<td/>");
    const inputField = $(
        '<textarea id="' +
            name +
            '" name="' +
            name +
            '" cols="40" rows="1" class="modern-textarea"></textarea>'
    );

    // Auto-resize on input and persist changes
    inputField.on("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
        onChange(inputField.val());
        onDatabaseChanged();
    });

    // Also handle change event (blur) for compatibility
    inputField.on("change", function () {
        onChange(inputField.val());
        onDatabaseChanged();
    });

    valueTableField.append(inputField);
    inputFieldArea.append(valueTableField);
    inputField.val(value);

    // Firefox may not compute scrollHeight correctly until the element is in the DOM,
    // so run a delayed resize to ensure the textarea height matches its content.
    setTimeout(function () {
        inputField.each(function () {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        });
    }, 0);

    return inputFieldArea;
}

function getNewVerb(name) {
    var newVerb = {};
    newVerb["failure"] = "That didnt work.";
    newVerb["words"] = [name];
    return newVerb;
}

function getNewObject(name) {
    var newObject = {};
    newObject["words"] = [name];
    newObject["locationDescription"] = "";
    newObject["actions"] = {};
    return newObject;
}

function getNewObjectAction() {
    var newAction = {};
    newAction["text"] = "That worked!";
    newAction["commands"] = [];
    return newAction;
}

function getNewLocation() {
    var newLocation = {};
    newLocation["objects"] = [];
    return newLocation;
}
