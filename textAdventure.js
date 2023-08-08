class textAdventureEngine {
	
	TBA_DEBUG = false;

	#database = undefined;
	#currentRoom = null;
	#inventory = {};

	constructor(outputFunction, clearOutputFunction) { 
		this.outputAddLines = outputFunction;
		this.outputClear = clearOutputFunction;
	}

	loadDatabaseFromFile(gamedatabasePath, showGameName = true){
		this.outputClear();
		this.outputAddLines("Initializing Text Adventure Engine...");
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
		this.outputAddLines("Initializing Text Adventure Engine...");
		base.#initDatbase(json, showGameName);
	}

	input(cmd){
		this.#praseCommand(cmd);
	}

	#initDatbase(gameDatabaseObject, showGameName = true){
		this.#database = gameDatabaseObject;

		if(this.TBA_DEBUG){
			var base = this;
			$.each( json.verbs, function( i, item ) {
				base.outputAddLines("Loaded Action: "+item.name);
			});
			$.each( json.objects, function( i, item ) {
				base.outputAddLines("Loaded Object: "+item.name);
			});
			$.each( json.locations, function( i, item ) {
				base.outputAddLines("Loaded Location: "+item.title);
			});
			
			this.outputAddLines("Loading done.");
		}
		if(showGameName){
			this.outputClear();
			this.outputAddLines("<br /><br />'"+this.#database.general.title+"' by "+this.#database.general.author+"<br>"+"Version: "+this.#database.general.version+"<br />");
		}else{
			this.outputClear();
		}
		this.#praseCommand("welcome");
	}
	
	#showRequest(){
		this.outputAddLines(this.#database.general.request);
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
			this.#inventory = {};
			if(this.#database.general.start.text.length > 0){
				this.outputAddLines(this.#database.general.start.text);
			}
			this.#parseActionString(undefined, this.#database.general.start.action);
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
			this.outputAddLines("Enter simple directions like<br /><i>look at wall</i><br />");
			this.outputAddLines("Commonly used verbs are: "+allVerbs);
		} else {
			let words = cmd.split(" ");
	
			let locationState = this.#getLocationState(this.#currentRoom);
			let verb = this.#checkForVerb(words);
			let object = this.#checkForObject(words);
			let currentObjectState = undefined;
			// Get current state of object if it's not the room / location
			if(object != undefined){
				currentObjectState = this.#getObjectState(object);
			}
	
			//no action
			if(verb == undefined && object != undefined){
				//this.outputAddLines("You want to do what with the "+currentObjectState.name+"?!");
				this.outputAddLines("Unknown verb, please try to rephrase your command.");
				this.#showRequest();
				return;
			}
	
			// Look at room
			if(verb != undefined && verb.name == "look" && (words.length === 1)){
				locationState = this.#getLocationState(this.#currentRoom);
				this.writeLocationDescription(locationState.objects);
				this.#showRequest();
				return;
			}
	
			//no object
			if(verb != undefined && (object == undefined)){
				console.log("object is undefined");
				this.outputAddLines(verb.failed);
				this.#showRequest();
				return;
			}
	
			//Do a regular Action (verb)
			if(verb!=undefined && object != undefined){
				console.log("Action: "+ verb.name);
				console.log("Object: "+ currentObjectState.name);
				if(currentObjectState == undefined){
					console.log("Object "+object.name+" is in an undefiend state: "+ object.currentState);
				}
				var result = currentObjectState.verbs[verb.name];
				if(this.TBA_DEBUG==true){
					console.log(result);
	
					this.outputAddLines("Action: "+ verb.name);
					this.outputAddLines("Object: "+ object.name);
				}
	
				if(result != undefined){
					//
					let objectStateVerbDefinition = currentObjectState.verbs[verb.name];
					this.outputAddLines(objectStateVerbDefinition.text);
					
					if(objectStateVerbDefinition.action!=undefined){
						if($.isArray(objectStateVerbDefinition.action) && objectStateVerbDefinition.action.length > 0) {
							for(var i=0; i<objectStateVerbDefinition.action.length; i++){
								this.#parseActionString(object, objectStateVerbDefinition.action[i]);
							}
						}else{
							this.#parseActionString(object, objectStateVerbDefinition.action);
						}
					}
				}else{
					this.outputAddLines("Sorry you can't do this with "+currentObjectState.name+".");
				}
				this.#showRequest();
				return;
			}
			this.outputAddLines("Please try to rephrase your command.");
	
		}
		this.#showRequest();
	}
	writeLocationDescription(objectsInLocation){
		var fullLocationDescription = "";
		for(var i =0; i< objectsInLocation.length; i++){
			let thisObject = this.#database.objects[objectsInLocation[i]];
			fullLocationDescription += " "+(thisObject.states[thisObject.currentState].locationDescription);
		}
		this.outputAddLines(fullLocationDescription);
		
		if(Object.keys(this.#inventory).length > 0){
			for(var index in this.#inventory) {
				let currentItemDescription = this.#inventory[index].states[this.#inventory[index].currentState].locationDescription;
				if(currentItemDescription.length > 0){
					this.outputAddLines(currentItemDescription);
				}
			}
		}
	}
	#parseActionString(affectedObject, actionString){
		var acts = actionString.split(" ");
		if(acts[0]=="objectState" && acts.length == 2){ // change this Object
			console.log("changing ObjectState to "+acts[1]);
			affectedObject.currentState = acts[1];
		}else if(acts[0]=="objectState" && acts.length == 3){ // Reference other object
			console.log("changing ObjectState of "+acts[1]+" to "+acts[2]);
			this.#database.objects[acts[1]].currentState = acts[2];
		}else if(acts[0]=="objectRemoveFromLocation"){
			console.log("removing Object from Location:"+acts[1]);
			var index = this.#getLocationState(this.#currentRoom).objects.indexOf(acts[1]);
			if (index > -1) {
				this.#getLocationState(this.#currentRoom).objects.splice(index, 1);
				console.log("Removed object with index: "+index);
			}else{
				console.log("Object not found in location: " + acts[1]);
			}
		}else if(acts[0]=="objectAddToLocation"){
			console.log("adding Object to Location:"+acts[1]);
			this.#getLocationState(this.#currentRoom).objects.push(acts[1]);
		}else if(acts[0]=="gotoLocation"){
			console.log("SIWTCHING LOCATION TO:"+acts[1]);
			this.#currentRoom = acts[1];
			var currentRoomState =  this.#getLocationState(this.#currentRoom);
			this.writeLocationDescription(currentRoomState.objects);
		}else if(acts[0]=="showLocationDescription"){
			var currentRoomState =  this.#getLocationState(this.#currentRoom);
			this.writeLocationDescription(currentRoomState.objects);
		}else if(acts[0]=="inventoryAdd"){
			console.log("Add or replace inventory item: " + acts[1]);
			this.#inventory[acts[1]] = this.#database.objects[acts[1]];
		}else if(acts[0]=="inventoryRemove"){
			console.log("Remove inventory object, if it exists "+acts[1]);
			delete this.#inventory[acts[1]];
		}

		
	}
	
	#getLocationState(location){
		return this.#database.locations[location];
	}
	
	#getObjectState(object){
		if (typeof object === 'string' || object instanceof String){
			let objectRef = this.#database.objects[object];
			return objectRef.states[objectRef.currentState];
		}else{
			return object.states[object.currentState];
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
		var locationState = this.#getLocationState(this.#currentRoom);
		let value = undefined;
	
		// Check room Items
		for(var i=0; i<words.length; i++){
			
			// Check inventory item
			if(Object.keys(this.#inventory).length > 0){
				for(var index in this.#inventory) {
					let test = $.inArray(words[i],  this.#getObjectState(this.#inventory[index]).words);
					if(test >= 0){
						value = this.#inventory[index];
						return value;
					}
				}
			}
			// check for objects in room
			var base = this;
			$.each(locationState.objects, function( index, val ) {
				let test = $.inArray(words[i], base.#getObjectState(val).words);
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

	// disabled for now:
	#checkForSecondObject(words){
		var locationState = this.#getLocationState(this.#currentRoom);
		console.log("checking for seconds object");
		var value = undefined;
		var founds = 0;
	
		for(var i=0; i<words.length; i++){
			let isInventoryItem = false;
			// Check inventory item
			if(Object.keys(this.#inventory).length > 0){
				for(var index in this.#inventory) {
					let test = $.inArray(words[i],  this.#getObjectState(this.#inventory[index]).words);
					if(test >= 0){
						value = this.#inventory[index];
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
			if(val.states[val.currentState].name==name){
				value = index;
				return;
			}
		});
	
		return value;
	}
}