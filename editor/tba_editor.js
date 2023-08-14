TBA_DATABASE = undefined;
TBA_DEBUG = false;

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
	//tba_init(JSON.stringify($.getJSON('../lonesurvivor.tadb.json')));
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
	initEditorForSlection();
}

function initEditorForSlection(){
	type = $("#type").val();

	$("#elementSelection").html("");

	let elementSelector = $('<select id="element" onchange="onElementChanged()"><select>');
	$.each( TBA_DATABASE[type], function( key, val ) {
		elementSelector.append($('<option value="'+key+'">'+key+'</option>'));
	});	
	$("#elementSelection").append(elementSelector);
	if(type==="verbs") {
		$("#elementSelection").append(generateNewButton(function(name){
			if(TBA_DATABASE.verbs[name]!==undefined){
				alert("A verb with this name already exists.");
				return;
			}
			let newVerb = getNewVerb(name);
			TBA_DATABASE.verbs[name]=newVerb;
			initEditorForSlection();
		}));
	}else if(type==="objects"){
		$("#elementSelection").append(generateNewButton(function(name){
			if(TBA_DATABASE.objects[name]!==undefined){
				alert("An object with this name already exists.");
				return;
			}
			TBA_DATABASE.objects[name]=getNewObject(name);
			initEditorForSlection();
		}));
	}else if(type==="locations"){
		$("#elementSelection").append(generateNewButton(function(name){
			if(TBA_DATABASE.locations[name]!==undefined){
				alert("A location with this name already exists.");
				return;
			}
			TBA_DATABASE.locations[name]=getNewLocation();
			initEditorForSlection();
		}));
	}
	$("#elementEditor").html("");
}

function onElementChanged(){
	let gui;
	let element = $("#element").val();
	if(type=="verbs"){
		gui = generateUiForVerbElement(element, TBA_DATABASE.verbs[element]);
	}else if(type=="objects"){
		gui = generateUiForObjectElement(element, TBA_DATABASE.objects[element]);
	}else{
		gui = generateUiForLocationElement(element, TBA_DATABASE.locations[element]);
	}
	$("#elementEditor").html(gui);
}

function generateUiForVerbElement(verbName, verb) {
	let editorGui = $('<div/>');
	let name = $('<p>Name: '+verbName+' </p>');
	let removeButton = $('<button>Remove</button>')
	removeButton.click(function() { delete TBA_DATABASE.verbs[verbName]; initEditorForSlection(); });
	name.append(removeButton);
	editorGui.append(name);
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
	let editorGui = $('<div/>');
	let name = $('<p>Name: '+objectName+' </p>');
	let removeButton = $('<button>Remove</button>');
	removeButton.click(function() { delete TBA_DATABASE.objects[objectName]; initEditorForSlection(); });
	name.append(removeButton);
	editorGui.append(name);
	editorGui.append(generateInput("Location Description", object.locationDescription, function(value){ object.locationDescription = value; }));
	editorGui.append(generateInput("Words", object.words.join(", "), 
		function(value){
			object.words = value.split(",").map(function(item) { return item.trim(); });
		}));
	editorGui.append($('<p>Actions:</p>'));
	editorGui.append(generateNewActionButton(object.actions, function(verb){
		if(object.actions[name]!==undefined){
			alert("An action with this verb already exists for this object.");
			return;
		}
		let newAction = getNewObjectAction();
		object.actions[verb]=newAction;
		initEditorForSlection();
	}));
	$.each(object.actions, function( verb, action ) {
		let actionGui = $('<div/>');
		let name = $('<p>Name: '+verb+' </p>');
		actionGui.append(name);
		actionGui.append(generateInput("Text", action.text, function(value){ action.text = value; }));
		actionGui.append(generateTextArea("Functions", action.action.join("\n"), function(value){
			action.action = value.split("\n").map(function(item) { return item.trim(); }).filter(e => e);
		}));
		editorGui.append(actionGui);
	});	

	return editorGui;
}

function generateUiForLocationElement(locationName, location) {
	let editorGui = $('<div/>');
	let name = $('<p>Name: '+locationName+' </p>');
	let removeButton = $('<button>Remove</button>');
	removeButton.click(function() { delete TBA_DATABASE.locations[locationName]; initEditorForSlection(); });
	name.append(removeButton);
	editorGui.append(name);
	editorGui.append($('<p>Objects:</p>'));
	let objSelector = $('<select size="'+location.objects.length+'"/>');
	$.each(location.objects, function(index, object) {
		let option = $('<option value="'+index+'">'+object+'</option>');
		objSelector.append(option);
	});	
	let removeObjectButton = $('<button>Remove Object</button>');
	removeObjectButton.click(function() { 
		let index = objSelector.val();
		if(index === null || index < 0) { alert("No object selected"); return; }
		delete location.objects.splice(index, 1); 
		initEditorForSlection();
	});
	editorGui.append(objSelector);
	editorGui.append(removeObjectButton);
	editorGui.append(generateNewObjectForLocationButton(location.objects, function(obj){
		location.objects.push(obj);
		initEditorForSlection();
	}));

	return editorGui;
}

function generateNewButton(onClick) {
	let editorGui = $('<div/>');
	let elementNameInput = $('<input id="newElement" type="text" size="30" value=""/>');
	
	let addButton = $('<button>Add</button>');
	addButton.click(function() { onClick(elementNameInput.val()); });
	editorGui.append(elementNameInput);
	editorGui.append(addButton);
	return editorGui;
}

function generateNewActionButton(existingActions, onClick) {
	let editorGui = $('<div/>');
	let selectNewAction = $('<select id="selectNewAction" />');
	$.each(TBA_DATABASE.verbs, function( verb ) {
		if(existingActions[verb] !== undefined) { return; }
		selectNewAction.append($('<option/>').val(verb).html(verb));
	});
	
	let addButton = $('<button>Add</button>');
	addButton.click(function() { onClick(selectNewAction.val()); });
	editorGui.append(selectNewAction);
	editorGui.append(addButton);
	return editorGui;
}

function generateNewObjectForLocationButton(existingObjects, onClick) {
	let editorGui = $('<div/>');
	let selectNewObject = $('<select id="selectNewObject" />');
	$.each(TBA_DATABASE.objects, function( obj ) {
		if(existingObjects[obj] !== undefined) { return; }
		selectNewObject.append($('<option/>').val(obj).html(obj));
	});
	
	let addButton = $('<button>Add</button>');
	addButton.click(function() { onClick(selectNewObject.val()); });
	editorGui.append(selectNewObject);
	editorGui.append(addButton);
	return editorGui;
}

function generateInput(name, value, onChange){
	let inputFieldArea = $('<p></p>');
	inputFieldArea.append('<label for="'+name+'">'+name+'</label> ');
	let inputField = $('<input id="'+name+'" type="text" size="30" value="'+value+'"/>');
	inputField.on( "change", function() {
		onChange(inputField.val());
	} );
	inputFieldArea.append(inputField);
	return inputFieldArea;
}

function generateTextArea(name, value, onChange){
	let inputFieldArea = $('<p></p>');
	inputFieldArea.append('<label for="'+name+'">'+name+'</label><br />');
	let inputField = $('<textarea id="'+name+'" name="'+name+'" cols="40" rows="5">'+value+'</textarea>');
	inputField.on( "change", function() {
		onChange(inputField.val());
	} );
	inputFieldArea.append(inputField);
	return inputFieldArea;
}

function generateGui(objectToBeEdited){
	let editorGui = $('<div/>');
	$.each( objectToBeEdited, function( key, value ) {
		if(typeof value === 'object'){
			editorGui.append("<p>"+key+"</p>");
			editorGui.append(generateGui(value));
		}else{
			let inputField = $('<p></p>');
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
