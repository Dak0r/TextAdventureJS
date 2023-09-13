TBA_DATABASE = undefined;
TBA_DEBUG = false;

const NEWLINE = "&#13;";

var type;

$( document ).ready(function() {
	$(".file-drop-area").on('dragover', (e) => {
		// Prevent navigation.
		e.preventDefault();
	});
	  
	$(".file-drop-area").on('drop', async (e) => {
		e.preventDefault();
	  
		/*const fileHandlesPromises = [...e.originalEvent.dataTransfer.items]
		  .filter((item) => item.kind === 'file')
		  .map((item) => item.getAsFileSystemHandle()); // not supported in Firefox, but would allow writing
	  
		for await (const handle of fileHandlesPromises) {
		  if (handle.kind === 'directory') {
			console.log(`Directory: ${handle.name}`);
		  } else {
			console.log(`File: ${handle.name}`);
		  }
		}*/

		var file = e.originalEvent.dataTransfer.files[0],
        reader = new FileReader();
    	reader.onload = function(event) {
       		console.log(event.target);
			tba_init(event.target.result);
    	};
		reader.readAsText(file);
	});
	updateEditorState();
});

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
	TBA_DATABASE = JSON.parse(json);
	updateEditorState();
	onTypeChanged();
}

function onTypeChanged(typeParam){
	type = typeParam;
	if(type===null){ type="general"; }

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

function generateUiForPreview() {
	var previewContainer = $('<div style="text-align: center;"/>');
	var log = $('<textarea id="outputArea" readonly="readonly" style="width: 600px; height: 400px;">Loading</textarea> ');
	var inputText = $('<input id="inputText" type="text"  style="width: 500px;"/>');
	var inputButton = $('<input id="inputButton" type="button" value="Send"/>');
	previewContainer.append(log);
	previewContainer.append(inputText);
	previewContainer.append(inputButton);

	let witeLine = function witeLine(output){
		log.val(log.val()+output+"\n"); 
		let height = log[0].scrollHeight;
		log.scrollTop(height);    
		inputButton.prop("disabled",false);
		inputText.prop('readonly', false);
		inputText.focus();
	}

	function clearArea(){
		log.val("");         
	}

	function readUserInput(){
		inputButton.prop("disabled",true);
		inputText.prop('readonly', true);
		let input = inputText.val();
		witeLine("> "+input);
		textAdv.input(input);
		inputText.val("");

	}
	inputButton.click(function(){
		readUserInput();
	});

	inputText.keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){ // return
			readUserInput();
		}
	});
	inputText.focus();

	var textAdv = new textAdventureEngine(witeLine, clearArea);
	textAdv.loadDatabaseFromObject(TBA_DATABASE);

	return previewContainer;
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
	let name = $('<span><h2>'+verbName+' </h2></span>');

	let nameOptions = $('<span/>');

	let removeButton = button('Remove', 'btn-error');
	removeButton.click(function() { delete TBA_DATABASE.verbs[verbName]; onTypeChanged(); });
	nameOptions.append(removeButton);

	let duplicateButton = button('Duplicate');
	duplicateButton.click(function() { TBA_DATABASE.verbs[getAvailableVerbName(verbName)] = clone(verb); onTypeChanged(); });
	nameOptions.append(duplicateButton);

	editorGui.append(tableRow2(name, nameOptions));
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
	let name = $('<span><h2>'+objectName+' </h2></span>');

	let nameOptions = $('<span/>');
	let removeButton = button('Remove', 'btn-error');
	removeButton.click(function() { delete TBA_DATABASE.objects[objectName]; onTypeChanged(); });
	nameOptions.append(removeButton);

	let duplicateButton = button('Duplicate');
	duplicateButton.click(function() { TBA_DATABASE.objects[getAvailableObjectName(objectName)] = clone(object); onTypeChanged(); });
	nameOptions.append(duplicateButton);

	editorGui.append(tableRow2(name, nameOptions));

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
		editorGui.append(generateInput("Text", action.text, function(value){ action.text = value; }));
		editorGui.append(generateTextArea("Functions", action.action.join(NEWLINE), function(value){
			action.action = value.split(NEWLINE).map(function(item) { return item.trim(); }).filter(e => e);
		}));
	});	
	editorGui.append(tableRow2("<h5>Add Action</h5>", generateNewActionButton(object.actions, function(verb){
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
	let name = $('<span><h2>'+locationName+' </h2></span>');

	let nameOptions = $('<span/>');
	let removeButton = button('Remove', 'btn-error');
	removeButton.click(function() { delete TBA_DATABASE.locations[locationName]; onTypeChanged(); });
	nameOptions.append(removeButton);

	let duplicateButton = button('Duplicate');
	duplicateButton.click(function() { TBA_DATABASE.locations[getAvailableLocationName(locationName)] = clone(location); onTypeChanged(); });
	nameOptions.append(duplicateButton);

	editorGui.append(tableRow2(name, nameOptions));
	editorGui.append(tableH3('Objects'));
	let rowSelector = $('<tr/>');
	let leftCellSelector = $('<td/>');
	let objSelector = $('<select size="'+location.objects.length+'" style="min-height: 200px;" />');
	$.each(location.objects, function(index, object) {
		let option = $('<option value="'+index+'">'+object+'</option>');
		objSelector.append(option);
	});	
	leftCellSelector.append(objSelector);
	rowSelector.append(leftCellSelector);
	let rightCellSelector = $('<td/>');
	let removeObjectButton = button('Remove Object', 'btn-error btn-ghost');
	removeObjectButton.click(function() { 
		let index = objSelector.val();
		if(index === null || index < 0) { alert("No object selected"); return; }
		delete location.objects.splice(index, 1); 
		onElementChanged();
	});
	let moveUpButton = button('Move Up');
	moveUpButton.click(function() { 
		let index = objSelector.val();
		if(index === null || index < 0) { alert("No object selected"); return; }
		const indexInt = parseInt(index);
		if(indexInt > 0) {
			moveArrayElement(location.objects, indexInt, indexInt-1);
			onElementChanged();
		}
	});
	let moveDownButton = button('Move Down');
	moveDownButton.click(function() { 
		let index = objSelector.val();
		if(index === null || index < 0) { alert("No object selected"); return; }
		const indexInt = parseInt(index);
		if (indexInt < location.objects.length-1 ) {
			moveArrayElement(location.objects, indexInt, indexInt+1);
			onElementChanged();
		}
	});
	rightCellSelector.append(paragraph(moveUpButton));
	rightCellSelector.append(paragraph(moveDownButton));
	rightCellSelector.append(paragraph(removeObjectButton));
	rowSelector.append(rightCellSelector);
	editorGui.append(rowSelector);
	let rowNewObject = $('<tr><td><h5>Add Object</h5></td></tr>');
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
	let el = $('<td/>');
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
	addButton.click(function() { onClick(elementNameInput.val()); });
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
	} );
	valueTableField.append(inputField);
	inputFieldArea.append(valueTableField);
	return inputFieldArea;
}

function generateGui(objectToBeEdited){
	let editorGui = $('<div/>');
	$.each( objectToBeEdited, function( key, value ) {
		if(typeof value === 'object'){
			editorGui.append("<p>"+key+"</p>");
			editorGui.append(generateGui(value));
		}else{
			let inputField = $('<p/>');
			inputField.append('<label for="'+key+'">'+key+'</label> ');
			inputField.append('<input name="'+key+'" type="text" size="30" value="'+value+'">');
			editorGui.append(inputField);
		}
	});
	return editorGui;
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
	newObject["actions"] = [];
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


//FOR OLD BROWSERS
if (typeof Object.keys !== "function") {
    (function() {
        Object.keys = Object_keys;
        function Object_keys(obj) {
            var keys = [], name;
            for (name in obj) {
                if (obj.hasOwnProperty(name)) {
                    keys.push(name);
                }
            }
            return keys;
        }
    })();
}
