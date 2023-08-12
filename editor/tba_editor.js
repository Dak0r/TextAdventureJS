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
	}
	$("#elementEditor").html("");
}

function onElementChanged(){
	let gui;
	let element = $("#element").val();
	if(type=="verbs"){
		gui = generateUiForVerbElement(element, TBA_DATABASE.verbs[element]);
	}else if(type=="objects"){

	}else{

	}
	
	$("#elementEditor").html(gui);
}

function generateNewButton(onClick) {
	let editorGui = $('<div/>');
	let elementNameInput = $('<input id="newElement"="newElement" type="text" size="30" value=""/>');
	
	let addButton = $('<button>Add</button>');
	addButton.click(function() { onClick(elementNameInput.val()); });
	editorGui.append(elementNameInput);
	editorGui.append(addButton); //getNewVerb
	return editorGui;
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
