TBA_DATABASE = undefined;
TBA_DEBUG = false;

var filename = undefined;

var textAdv = undefined;

var previewContainer = undefined;
var previewLog  = undefined;
var previewInputText = undefined;
var previewInputButton = undefined;
var previewRestartButton = undefined;
var previewReloadButton = undefined;

const NEWLINE = "\n"; //"&#13;";

var type;

$( document ).ready(function() {
	$(".file-drop-area").on('dragover', (e) => {
		// Prevent navigation.
		e.preventDefault();
	});
	  
	$(".file-drop-area").on('drop', async (e) => {
		e.preventDefault();

		var file = e.originalEvent.dataTransfer.files[0];
		importFile(file);

	});
	$("#btn-new").click(() => {
		// Load the inlined default database JSON
		const defaultJson = getDefaultProjectJson();
		if (defaultJson) {
			tba_init(defaultJson);
		} else {
			alert('Default project JSON not available.');
		}
	});
	$("#btn-save").click(() => {
		download(JSON.stringify(TBA_DATABASE, null, 2), filename, 'text/plain');
	});
	$("#btn-close").click(() => {
		TBA_DATABASE = undefined;
		textAdv = undefined;
		deleteDatabaseFromStorage();
		updateEditorState();
	});
	loadToDatabaseFromStorage();
	updateEditorState();
	if (TBA_DATABASE != undefined) {
		onTypeChanged();
	}
});

function importFile(file) {
		reader = new FileReader();

		// Handle successful read and catch JSON/initialization errors
		reader.onload = function(event) {
			try {
				console.log(event.target);
				tba_init(event.target.result);
			} catch (err) {
				console.error("Error initializing database from file:", err);
				alert("Error loading file '" + (file && file.name ? file.name : '') + "': " + (err && err.message ? err.message : err));
			}
		};

		// Inform the user if reading the file fails or is aborted
		reader.onerror = function() {
			console.error("FileReader error:", reader.error);
			alert("Error reading file '" + (file && file.name ? file.name : '') + "': " + ((reader.error && reader.error.message) ? reader.error.message : 'Unknown error'));
		};
		reader.onabort = function() {
			alert("File read aborted.");
		};

		filename = file.name;
		reader.readAsText(file);
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function saveToDatabaseToStorage(){
	localStorage.setItem("database", JSON.stringify(TBA_DATABASE));
}
function loadToDatabaseFromStorage(){
	var stored = localStorage.getItem("database");
	if(stored != undefined){
		TBA_DATABASE = JSON.parse(stored);
	}
}
function deleteDatabaseFromStorage(){
	localStorage.removeItem("database");
}

function getDefaultProjectJson() {
	try {
		const el = document.getElementById('default-db');
		if (!el) return null;
		return el.textContent.trim();
	} catch (err) {
		console.error('Failed to read default DB:', err);
		return null;
	}
}

function updateEditorState() {
	if(TBA_DATABASE !== undefined) {
		$("#drop-area").hide();
		$("#editor-aera").show();
	}else{
		$("#drop-area").show();
		$("#editor-aera").hide();
	}
}

function tba_init(json){
	try {
		TBA_DATABASE = JSON.parse(json);
		updateEditorState();
		onTypeChanged();
	} catch (err) {
		console.error("Failed to initialize database:", err);
		alert("Error parsing database JSON: " + (err && err.message ? err.message : err));
	}
}

function onTypeChanged(typeParam){
	if(typeParam!==undefined){
		type = typeParam;
	}
	if(type===null || type === undefined){ type="general"; }

	// Highlight the active tab
	$('.editor-tab').removeClass('active');
	let tabId = 'tab' + type.charAt(0).toUpperCase() + type.slice(1);
	$('#' + tabId).addClass('active');

	$("#elementSelection").html("");
	if(type=="general") {
		$("#elementEditor").html(generateUiForGeneral(TBA_DATABASE.general));
		return;
	}else if(type=="preview") {
			$("#elementEditor").html(generateUiForPreview());
			return;
	}else{
		var newArea = $('<div class="w100" />');
		$("#elementSelection").append(newArea);
		if(type==="verbs") {
			newArea.append(generateNewButton(function(name){
				if(TBA_DATABASE.verbs[name]!==undefined){
					alert("A verb with this name already exists.");
					return;
				}
				let newVerb = getNewVerb(name);
				TBA_DATABASE.verbs[name]=newVerb;
				onTypeChanged();
			}));
		}else if(type==="objects"){
			newArea.append(generateNewButton(function(name){
				if(TBA_DATABASE.objects[name]!==undefined){
					alert("An object with this name already exists.");
					return;
				}
				TBA_DATABASE.objects[name]=getNewObject(name);
				onTypeChanged();
			}));
		}else if(type==="locations"){
			newArea.append(generateNewButton(function(name){
				if(TBA_DATABASE.locations[name]!==undefined){
					alert("A location with this name already exists.");
					return;
				}
				TBA_DATABASE.locations[name]=getNewLocation();
				onTypeChanged();
			}));
		}

		let elementSelector = $('<select id="element" onchange="onElementChanged()" size="30" class="w100"><select>');
		$.each( TBA_DATABASE[type], function( key, val ) {
			elementSelector.append($('<option value="'+key+'">'+key+'</option>'));
		});	
		$("#elementSelection").append(elementSelector);

		$("#elementEditor").html("");
		onElementChanged();
	}
}

function onElementChanged(){
	onDatabaseChanged();
	let gui = undefined;
	let element = $('#element').val();
	if(element===null){ element=$("#element option:first").val(); $('#element').val(element);}

	if(type=="verbs"){
		gui = generateUiForVerbElement(element, TBA_DATABASE.verbs[element]);
	}else if(type=="objects"){
		gui = generateUiForObjectElement(element, TBA_DATABASE.objects[element]);
	}else if(type=="locations"){
		gui = generateUiForLocationElement(element, TBA_DATABASE.locations[element]);
	}
	if(gui !== undefined){
		$("#elementEditor").html(gui);
	}
}

function onDatabaseChanged(){
	saveToDatabaseToStorage();
}

function generateUiForPreview() {
	if(previewContainer === undefined) {
		previewContainer = $('<div style="text-align: center;"/>');
		previewLog = $('<textarea id="outputArea" readonly="readonly" style="width: 600px; height: 400px;">Loading</textarea> ');
		previewInputText = $('<input id="inputText" type="text"  style="width: 500px;"/>');
		previewInputButton = $('<input id="inputButton" type="button" value="Send"/>');

		let buttonBar = $('<p />');
		previewRestartButton = button('Restart Game');
		previewReloadButton = button('Reload Current Room');
		buttonBar.append(previewReloadButton);
		buttonBar.append(' ');
		buttonBar.append(previewRestartButton);

		previewContainer.append(buttonBar);
		previewContainer.append(previewLog);
		previewContainer.append(previewInputText);
		previewContainer.append(previewInputButton);
	}

	previewInputButton.click(function(){
		readUserInput();
	});
	previewRestartButton.click(function(){
		textAdv = undefined;
		startGame();
	});
	previewReloadButton.click(function(){
		textAdv.devResetRoom();
	});

	previewInputText.keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){ // return
			readUserInput();
		}
	});

	if(textAdv === undefined){
		startGame();
	}
	updatePreviewSideBar();
	previewLog.scrollTop(previewLog[0].scrollHeight); 
	previewInputText.focus();
	
	return previewContainer;
}

function startGame() {
	textAdv = new textAdventureEngine(witeLine, clearArea);
	textAdv.loadDatabaseFromObject(TBA_DATABASE);
}

function witeLine(output){
	previewLog.val(previewLog.val()+output+"\n"); 
	previewLog.scrollTop(previewLog[0].scrollHeight);    
	previewInputButton.prop("disabled",false);
	previewInputText.prop('readonly', false);
	previewInputText.focus();
	updatePreviewSideBar();
}

function clearArea(){
	previewLog.val("");         
}

function readUserInput(){
	previewInputButton.prop("disabled",true);
	previewInputText.prop('readonly', true);
	let input = previewInputText.val();
	witeLine("> "+input);
	textAdv.input(input);
	previewInputText.val("");

}

function updatePreviewSideBar() {
	let gameState = textAdv.devGetGameState();
	$("#elementSelection").html("");
	let currentLocation = $('<p><b>Current Location:</b> '+gameState.currentLocation+'</p>');
	$("#elementSelection").append(currentLocation);
	let inventoryList = $('<ul />');
	$.each(gameState.inventory, function( objectName ) {
		inventoryList.append($('<li>'+objectName+'</li>'));
	});	
	$("#elementSelection").append($('<p><b>Inventory</b></p>'));
	$("#elementSelection").append(inventoryList);
	let locations = $('<ul />');
	$.each(gameState.locations, function( locationName, locationObj ) {
		let location = $('<li><b>'+locationName+'</b></li>');
		let locationObjs = $('<ul />');
		$.each(locationObj.objects, function( index, objectName ) {
			locationObjs.append($('<li>'+objectName+'</li>'));
		});	
		location.append(locationObjs);
		locations.append(location);
	});
	$("#elementSelection").append($('<p>Locations</p>'));
	
	$("#elementSelection").append(locations);
}

function generateUiForGeneral(general) {
	let editorGui = $('<div/>');	
	let table = $('<table class="w100"/>');
	editorGui.append(table);
	table.append(tableH3('Info'));
	table.append(generateInput("Title", general.title, function(value){ general.title = value; }));
	table.append(generateInput("Author", general.author, function(value){ general.author = value; }));
	table.append(generateInput("Version", general.version, function(value){ general.version = value; }));
	table.append(tableH3('Game Settings'));
	table.append(generateTextArea("Request", general.request.join(NEWLINE), function(value){ general.request = value.split(NEWLINE); }));
	table.append(tableH3('Game Start'));
	table.append(generateTextArea("Introduction", general.start.text.join(NEWLINE), function(value){ general.start.text = value.split(NEWLINE); }));
	table.append(generateTextArea("Functions", general.start.action.join(NEWLINE), function(value){
		general.start.action = value.split(NEWLINE).map(function(item) { return item.trim(); }).filter(e => e);
	}));

	return editorGui;
}

function generateUiForVerbElement(verbName, verb) {
	let editorGui = $('<table class="w100"/>');
	let title = $('<span><h2>Verb</h2></span>');

	let nameOptions = $('<span/>');

	let removeButton = button('Remove', 'btn-error');
	nameOptions.append('<b>'+verbName+'</b>');
	nameOptions.append(' ');
	removeButton.click(function() { delete TBA_DATABASE.verbs[verbName]; onTypeChanged(); }); //TODO: Also delete from all Objects
	nameOptions.append(removeButton);
	nameOptions.append(' ');
	let duplicateButton = button('Duplicate');
	duplicateButton.click(function() { TBA_DATABASE.verbs[getAvailableVerbName(verbName)] = clone(verb); onTypeChanged(); });
	nameOptions.append(duplicateButton);

	editorGui.append(tableRow2(title, nameOptions));
	editorGui.append(generateInput("Failure", verb.failure, function(value){ verb.failure = value; }));
	editorGui.append(generateInput("Words", verb.words.join(", "), 
		function(value){
			verb.words = value.split(",").map(function(item) {
					return item.trim();
				});
		}));
	return editorGui;
}

function generateUiForObjectElement(objectName, object) {
	let editorGui = $('<table class="w100"/>');
	let title = $('<span><h2>Object</h2></span>');

	let nameOptions = $('<span/>');
	let removeButton = button('Remove', 'btn-error');
	nameOptions.append('<b>'+objectName+'</b>');
	nameOptions.append(' ');
	removeButton.click(function() { delete TBA_DATABASE.objects[objectName]; onTypeChanged(); }); //TODO: Also delete from all locations
	nameOptions.append(removeButton);
	nameOptions.append(' ');
	let duplicateButton = button('Duplicate');
	duplicateButton.click(function() { TBA_DATABASE.objects[getAvailableObjectName(objectName)] = clone(object); onTypeChanged(); });
	nameOptions.append(duplicateButton);

	editorGui.append(tableRow2(title, nameOptions));

	editorGui.append(generateInput("Location Description", object.locationDescription, function(value){ object.locationDescription = value; }));
	editorGui.append(generateInput("Words", object.words.join(", "), 
		function(value){
			object.words = value.split(",").map(function(item) { return item.trim(); });
		}));
	editorGui.append(tableH3('Actions'));
	$.each(object.actions, function( verb, action ) {
		let name = $('<h4><i>'+verb+'</i></h4>');
		let removeActionButton = button('Remove', 'btn-error btn-ghost')
		removeActionButton.click(function() { delete object.actions[verb]; onElementChanged(); });
		editorGui.append(tableRow2(name, removeActionButton));
		editorGui.append(generateTextArea("Text", action.text.join(NEWLINE), function(value){ action.text = value.split(NEWLINE); }));
		editorGui.append(generateTextArea("Functions", action.action.join(NEWLINE), function(value){
			action.action = value.split(NEWLINE).map(function(item) { return item.trim(); }).filter(e => e);
		}));
	});	
	editorGui.append(tableRow2("<h4>Add Action</h4>", generateNewActionButton(object.actions, function(verb){
		if(object.actions[name]!==undefined){
			alert("An action with this verb already exists for this object.");
			return;
		}
		let newAction = getNewObjectAction();
		object.actions[verb]=newAction;
		onElementChanged();
	})));

	return editorGui;
}

function generateUiForLocationElement(locationName, location) {
	let editorGui = $('<table class="w100"/>');
	let title = $('<span><h2>Location</h2></span>');

	let nameOptions = $('<span/>');
	let removeButton = button('Remove', 'btn-error');
	nameOptions.append('<b>'+locationName+'</b>');
	nameOptions.append(' ');
	removeButton.click(function() { delete TBA_DATABASE.locations[locationName]; onTypeChanged(); });
	nameOptions.append(removeButton);
	nameOptions.append(' ');
	let duplicateButton = button('Duplicate');
	duplicateButton.click(function() { TBA_DATABASE.locations[getAvailableLocationName(locationName)] = clone(location); onTypeChanged(); });
	nameOptions.append(duplicateButton);
	
	editorGui.append(tableRow2(title, nameOptions));
	editorGui.append(tableH3('Objects'));

	let previewRow = $('<tr/>');
	let previewHeadline = $('<td>Preview Location Description</td>');
	let previewCell = $('<td/>');
	
	editorGui.append(previewRow);
	previewRow.append(previewHeadline);
	previewRow.append(previewCell);

	function updatePreviewLocationText() {
		let text = "";
		$.each(location.objects, function(index, objectName) {
			if(text.length > 0) { text += " "; }
			text += TBA_DATABASE.objects[objectName].locationDescription;
		});
		previewCell.text(text);
	}
	updatePreviewLocationText();

	let rowSelector = $('<tr/>');
	let leftCellSelector = $('<td colspan="2"/>');

	// Render a table where each object has its own Move Up / Move Down / Remove buttons
	let objList = $('<table class="w100 object-list" border="0"/>');
	$.each(location.objects, function(index, objectName) {
		let tr = $('<tr/>');
		tr.append($('<td/>').text(objectName));
		let btnsTd = $('<td/>');

		let moveUpButton = button('Move Up');
		moveUpButton.click(function() {
			if(index > 0) {
				moveArrayElement(location.objects, index, index-1);
				onElementChanged();
			}
		});
		if(index === 0) { moveUpButton.prop('disabled', true); }

		let moveDownButton = button('Move Down');
		moveDownButton.click(function() {
			if(index < location.objects.length - 1) {
				moveArrayElement(location.objects, index, index+1);
				onElementChanged();
			}
		});
		if(index === location.objects.length - 1) { moveDownButton.prop('disabled', true); }

		let removeObjectButton = button('Remove', 'btn-error btn-ghost');
		removeObjectButton.click(function() {
			if(confirm('Remove "'+objectName+'"?')) {
				location.objects.splice(index, 1);
				onElementChanged();
			}
		});

		// Put buttons inline in a small button group
		let btnGroup = $('<div class="btn-group-inline"/>');
		btnGroup.append(moveUpButton);
		btnGroup.append(moveDownButton);
		btnGroup.append(removeObjectButton);
		btnsTd.append(btnGroup);
		tr.append(btnsTd);
		objList.append(tr);
	});

	leftCellSelector.append(objList);
	rowSelector.append(leftCellSelector);
	editorGui.append(rowSelector);
	let rowNewObject = $('<tr><td><h4>Add Object</h4></td></tr>');
	rowNewObject.append(generateNewObjectForLocationButton(location.objects, function(obj){
		location.objects.push(obj);
		onElementChanged();
	}));
	editorGui.append(rowNewObject);

	return editorGui;
}

function button(text, btnClasses = 'btn-default') {
	return $('<button class="btn '+btnClasses+'">'+text+'</button>');
}

function paragraph(element) {
	let p = $('<p/>');
	p.append(element);
	return p;
}
function tableH3(title){
	return $('<tr><td colspan="2"><h3>'+title+' </h3></td></tr>');
}
function tableRow(element){
	let e = $('<tr/>');
	e.append(element);
	return e;
}
function tableRow2(left, right){
	let r = $('<tr/>');
	let el = $('<td class="left-col"/>');
	el.append(left);
	let er = $('<td/>')
	er.append(right);
	r.append(el);
	r.append(er);
	return r;
}

function moveArrayElement(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        new_index = arr.length-1;
    }else if(new_index < 0){
		new_index = 0;
	}
    const element = arr.splice(old_index, 1)[0];
    arr.splice(new_index, 0, element);
};

function clone(obj){
	const clonedObj = JSON.parse(JSON.stringify(obj));
	return clonedObj;
}

function getAvailableLocationName(locationName) {
	var index=1;
	var testName = locationName;
	while(TBA_DATABASE.locations[testName] !== undefined) {
		testName = locationName + " " + index;
		index++;
	}
	return testName;
}
function getAvailableObjectName(objectName) {
	var index=1;
	var testName = objectName;
	while(TBA_DATABASE.objects[testName] !== undefined) {
		testName = objectName + " " + index;
		index++;
	}
	return testName;
}
function getAvailableVerbName(verbName) {
	var index=1;
	var testName = verbName;
	while(TBA_DATABASE.verbs[testName] !== undefined) {
		testName = verbName + " " + index;
		index++;
	}
	return testName;
}

function generateNewButton(onClick) {
	let editorGui = $('<div class="input-pair-container"/>');
	let elementNameInput = $('<input placeholder="New Element" id="newElement" type="text" value="" class="left-pair-element"/>');
	
	let addButton = button('Add');
	addButton.click(function() { 
		let name = elementNameInput.val();
		if(name === undefined || name.length < 1) {
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
	let editorGui = $('<div class="input-pair-container"/>');
	let selectNewAction = $('<select class="left-pair-element" id="selectNewAction" />');
	$.each(TBA_DATABASE.verbs, function( verb ) {
		if(existingActions[verb] !== undefined) { return; }
		selectNewAction.append($('<option/>').val(verb).html(verb));
	});
	
	let addButton = button('Add');
	addButton.click(function() { onClick(selectNewAction.val()); });
	editorGui.append(selectNewAction);
	editorGui.append(addButton);
	return editorGui;
}

function generateNewObjectForLocationButton(existingObjects, onClick) {
	let editorGui = $('<td/>');
	let container = $('<div class="input-pair-container"/>');
	let selectNewObject = $('<select class="left-pair-element" id="selectNewObject" />');
	$.each(TBA_DATABASE.objects, function( obj ) {
		if(existingObjects[obj] !== undefined) { return; }
		selectNewObject.append($('<option/>').val(obj).html(obj));
	});
	
	let addButton = button('Add');
	addButton.click(function() { onClick(selectNewObject.val()); });
	container.append(selectNewObject);
	container.append(addButton);
	editorGui.append(container);
	return editorGui;
}

function generateInput(name, value, onChange){
	let inputFieldArea = $('<tr/>');
	inputFieldArea.append('<td><label for="'+name+'">'+name+'</label></td>');
	let inputField = $('<input id="'+name+'" type="text" size="30" value="'+value+'"/>');
	inputField.on( "change", function() {
		onChange(inputField.val());
		onDatabaseChanged();
	} );
	let valueTableField = $('<td/>');
	valueTableField.append(inputField);
	inputFieldArea.append(valueTableField);
	return inputFieldArea;
}

function generateTextArea(name, value, onChange){
	let inputFieldArea = $('<tr/>');
	inputFieldArea.append('<td><label for="'+name+'">'+name+'</label></td>');
	let valueTableField = $('<td/>');
	let inputField = $('<textarea id="'+name+'" name="'+name+'" cols="40" rows="5">'+value+'</textarea>');
	inputField.on( "change", function() {
		onChange(inputField.val());
		onDatabaseChanged();
	} );
	valueTableField.append(inputField);
	inputFieldArea.append(valueTableField);
	return inputFieldArea;
}

function getNewVerb(name){
	var newVerb = {};
	newVerb["failure"] = "That didnt work.";
	newVerb["words"] = [name];
	return newVerb;
}

function getNewObject(name){
	var newObject = {};
	newObject["words"] = [name];
	newObject["locationDescription"] = "";
	newObject["actions"] = {};
	return newObject;
}

function getNewObjectAction(){
	var newAction = {};
	newAction["text"] = "That worked!";
	newAction["action"] = [];
	return newAction;
}

function getNewLocation(){
	var newLocation = {};
	newLocation["objects"] = [];
	return newLocation;
}