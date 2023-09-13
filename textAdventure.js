class textAdventureEngine {
	
	TBA_DEBUG = false;

	#database = undefined;

	#gameState = {
		locations: {},
		inventory: {},
		currentRoom: null,
	};

	constructor(outputFunction, clearOutputFunction) { 
		this.outputAddLines = outputFunction;
		this.outputClear = clearOutputFunction;
	}

	loadDatabaseFromFile(gamedatabasePath, showGameName = true){
		this.outputClear();
		this.#writeOutputLines("Initializing Text Adventure Engine...");
		let base = this;
		$.getJSON( gamedatabasePath)
		.done(function( json ) {
			base.#initDatbase(json, showGameName);
		})
		.fail(function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
			base.outputAddLines("Failed to Load json");
			
			base.#showRequest();
		});
	}

	loadDatabaseFromObject(json, showGameName = true){
		this.outputClear();
		this.#writeOutputLines("Initializing Text Adventure Engine...");
		this.#initDatbase(json, showGameName);
	}

	input(cmd){
		this.#praseCommand(cmd);
	}

	#initDatbase(gameDatabaseObject, showGameName = true){
		this.#database = gameDatabaseObject;
		var base = this;

		// Tell each object it's name
		$.each( this.#database.verbs, function( key, val ) {
			val["name"] = key;	
		});
		$.each( this.#database.objects, function( key, val ) {
			val["name"] = key;	
		});
		$.each( this.#database.locations, function( key, val ) {
			val["name"] = key;	
		});

		// init runtime locations
		$.each( this.#database.locations, function( key, val ) {
			base.#gameState.locations[key] = JSON.parse(JSON.stringify(val)); // deep copy
		});

		if(this.TBA_DEBUG){
			$.each( this.#database.verbs, function( i, item ) {
				base.outputAddLines("Loaded Action: "+item.name);
			});
			$.each( this.#database.objects, function( i, item ) {
				base.outputAddLines("Loaded Object: "+item.name);
			});
			$.each( this.#gameState.locations, function( i, item ) {
				base.outputAddLines("Loaded Location: "+item.title);
			});
			
			this.#writeOutputLines("Loading done.");
		}
		if(showGameName){
			this.outputClear();
			this.#writeOutputLines(["", "", 
				"'"+this.#database.general.title+"' by "+this.#database.general.author,
				"Version: "+this.#database.general.version]);
		}else{
			this.outputClear();
		}
		this.#praseCommand("welcome");
	}
	
	#showRequest(){
		this.#writeOutputLines(this.#database.general.request);
	}
	
	#removeFromString(arr,str){
		let regex = new RegExp("\\b"+arr.join('|')+"\\b","gi");
		let removed = str.replace(regex, '');
		return removed.replace(/\s\s+/g, ' ');
	}
	
	#praseCommand(cmd){
		cmd = cmd.toLowerCase();
	
		// remove ignored words from command
		cmd = this.#removeFromString(this.#database.ignored_words, cmd);
		cmd = cmd.trim();
		console.log("Stripped command of parser: '"+cmd+"'");
	
		if(cmd=="welcome"){
			this.#gameState.inventory = {};
			if(this.#database.general.start.text.length > 0){
				this.#writeOutputLines(this.#database.general.start.text);
			}
			this.#runActions(undefined, this.#database.general.start.action);
		}else if(cmd == "debug"){
			if(this.TBA_DEBUG==true){
				this.TBA_DEBUG = true;
			}else{
				this.TBA_DEBUG = false;
			}
		}else if(cmd == "help" || cmd == "?" || cmd == "what" || cmd == "how" || cmd == "what do"){
	
			var allVerbs = "";
			$.each( this.#database.verbs, function( key, val ) {
					if(allVerbs != ""){
						allVerbs += ", "+val.name;
					}else{
						allVerbs += val.name;
					}
			});
			this.#writeOutputLines("Enter simple directions like<br /><i>look at wall</i><br />");
			this.#writeOutputLines("Commonly used verbs are: "+allVerbs);
		} else {
			let words = cmd.split(" ");
	
			let locationState = this.#getLocationState(this.#gameState.currentRoom);
			let verb = this.#checkForVerb(words);
			let object = this.#checkForObject(words);
	
			//no action
			if(verb == undefined && object != undefined){
				this.#writeOutputLines("Unknown verb, please try to rephrase your command."); //TODO: Improve
				this.#showRequest();
				return;
			}
	
			// Look at room
			if(verb != undefined && verb.name == "look" && (words.length === 1)){
				locationState = this.#getLocationState(this.#gameState.currentRoom);
				this.#writeLocationDescription(locationState.objects);
				this.#showRequest();
				return;
			}
	
			//no object
			if(verb != undefined && (object == undefined)){
				console.log("object is undefined");
				this.#writeOutputLines(verb.failure);
				this.#showRequest();
				return;
			}
	
			//Do a regular Action (verb)
			if(verb!=undefined && object != undefined){
				console.log("Action: "+ verb.words);
				console.log("Object: "+ object.name);
				var result = object.actions[verb.name];
				if(this.TBA_DEBUG==true){
					console.log(result);
					this.#writeOutputLines("Action: "+ verb.name);
					this.#writeOutputLines("Object: "+ object.name);
				}
	
				if(result != undefined){
					let objectStateVerbDefinition = object.actions[verb.name];
					this.#writeOutputLines(objectStateVerbDefinition.text);
					this.#runActions(object, objectStateVerbDefinition.action);
				}else{
					this.#writeOutputLines(verb.failure); //TODO: Could be improved, verb doesn't work with object
				}
				this.#showRequest();
				return;
			}
			this.#writeOutputLines("Please try to rephrase your command."); //TODO: Replace with something more immersive
		}
		this.#showRequest();
	}

	#writeLocationDescription(objectsInLocation){
		var fullLocationDescription = "";
		for(var i =0; i< objectsInLocation.length; i++){
			let thisObject = this.#database.objects[objectsInLocation[i]];
			if(thisObject.locationDescription.length > 0){
				if(fullLocationDescription.length !== 0){
					fullLocationDescription+= " ";
				}
			 	fullLocationDescription += thisObject.locationDescription;
			}
		}
		this.#writeOutputLines(fullLocationDescription);
		
		if(Object.keys(this.#gameState.inventory).length > 0){
			for(var index in this.#gameState.inventory) {
				let currentItemDescription = this.#gameState.inventory[index].locationDescription;
				if(currentItemDescription.length > 0){
					this.#writeOutputLines(currentItemDescription);
				}
			}
		}
	}

	#runActions(callingObject, actions){
		if(actions === undefined){
			return;
		}
		if($.isArray(actions)) {
			for(var i=0; i<actions.length; i++){
				this.#parseActionString(callingObject, actions[i]);
			}
		}else{
			this.#parseActionString(callingObject, actions);
		}
	}

	#parseActionString(callingObject, actionString){
		if(actionString === undefined){
			return;
		}
		var acts = actionString.split(" ");
		if(acts[0]=="objectState") {
			console.error("objectState was removed. Use objectReplaceInLocation instead!");
		}else if(acts[0]=="objectRemoveFromLocation"){
			console.log("removing Object from Location:"+acts[1]);
			var index = this.#getLocationState(this.#gameState.currentRoom).objects.indexOf(acts[1]);
			if (index > -1) {
				this.#getLocationState(this.#gameState.currentRoom).objects.splice(index, 1);
				console.log("Removed object with index: "+index);
			}else{
				console.log("Object not found in location: " + acts[1]);
			}
		}else if(acts[0]=="objectAddToLocation"){
			console.log("adding Object to Location:"+acts[1]);
			this.#getLocationState(this.#gameState.currentRoom).objects.push(acts[1]);
		}else if(acts[0]=="objectReplaceInLocation"){
			var index = this.#getLocationState(this.#gameState.currentRoom).objects.indexOf(acts[1]);
			if (index > -1) {
				this.#getLocationState(this.#gameState.currentRoom).objects.splice(index, 1);
				console.log("Removed object with index: "+index);
			}else{
				console.log("Object not found in location: " + acts[1]);
			}
			this.#getLocationState(this.#gameState.currentRoom).objects.push(acts[2]);
		}else if(acts[0]=="gotoLocation"){
			console.log("SIWTCHING LOCATION TO:"+acts[1]);
			this.#gameState.currentRoom = acts[1];
			var currentRoomState =  this.#getLocationState(this.#gameState.currentRoom);
			this.#writeLocationDescription(currentRoomState.objects);
		}else if(acts[0]=="showLocationDescription"){
			var currentRoomState =  this.#getLocationState(this.#gameState.currentRoom);
			this.#writeLocationDescription(currentRoomState.objects);
		}else if(acts[0]=="inventoryAdd"){
			console.log("Add or replace inventory item: " + acts[1]);
			this.#gameState.inventory[acts[1]] = this.#database.objects[acts[1]];
		}else if(acts[0]=="inventoryRemove"){
			console.log("Remove inventory object, if it exists "+acts[1]);
			delete this.#gameState.inventory[acts[1]];
		}		
	}
	
	#getLocationState(location){
		return this.#gameState.locations[location];
	}
	
	#getObject(object){
		if (typeof object === 'string' || object instanceof String){
			return this.#database.objects[object];
		}else{
			return object;
		}
	}
	
	#checkForVerb(words){
		let value = undefined;
		for(var i=0; i<words.length && value === undefined; i++){
			//console.log( "Checking: "+words[i] );
			$.each( this.#database.verbs, function( key, val ) {
				//console.log( "Key: "+key+ " " + val.words[0] );
				let test = $.inArray(words[i], val.words);
				//console.log("test result: "+ test);
				if(test >= 0){
					value = val;
					return;
				}
			});
		}
		return value;
	}
	
	#checkForObject(words){
		var locationState = this.#getLocationState(this.#gameState.currentRoom);
		let value = undefined;
	
		// Check room Items
		for(var i=0; i<words.length; i++){
			
			// Check inventory item
			if(Object.keys(this.#gameState.inventory).length > 0){
				for(var index in this.#gameState.inventory) {
					let test = $.inArray(words[i],  this.#getObject(this.#gameState.inventory[index]).words);
					if(test >= 0){
						value = this.#gameState.inventory[index];
						return value;
					}
				}
			}
			// check for objects in room
			var base = this;
			$.each(locationState.objects, function( index, val ) {
				let test = $.inArray(words[i], base.#getObject(val).words);
				if(test >= 0){
					value = base.#database.objects[val];
					return; // exit $.each loop
				}
			});
			if(value!=undefined){
				break;
			}
		}
		return value;
	}

	#writeOutputLines(lines){
		if (!Array.isArray(lines)){
			this.outputAddLines(lines);
		}else{
			for(var i=0; i<lines.length; i++){
				this.outputAddLines(lines[i]);
			}
		}
	}

	// disabled for now:
	#checkForSecondObject(words){
		var locationState = this.#getLocationState(this.#gameState.currentRoom);
		console.log("checking for seconds object");
		var value = undefined;
		var founds = 0;
	
		for(var i=0; i<words.length; i++){
			let isInventoryItem = false;
			// Check inventory item
			if(Object.keys(this.#gameState.inventory).length > 0){
				for(var index in this.#gameState.inventory) {
					let test = $.inArray(words[i],  this.#getObject(this.#gameState.inventory[index]).words);
					if(test >= 0){
						value = this.#gameState.inventory[index];
						founds++;
						isInventoryItem = true;
					}
				}
			}
			if(!isInventoryItem){
				// check for objects in room
				var base = this;
				$.each(locationState.objects, function( index, val ) {
					let test = $.inArray(words[i], base.#database.objects[val].words);
					if(test >= 0){
						value = base.#database.objects[val];
						founds++;
						return;
					}
				});
			}
			if(founds>=2){
				break;
			}
		}
		return value;
	}
	
	#getObjectIndexByName(name){
		console.log("checking for object id");
		var value = undefined;
		$.each(this.#database.objects, function( index, val ) {
			if(val.name==name){
				value = index;
				return;
			}
		});
	
		return value;
	}
}