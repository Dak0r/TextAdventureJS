/*
 * Note: As of 25th of December 2020 private fields are not yet universally supported:
 * --> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields
 * Because of this, this class uses an "internal_"-prefix for fields that shold actually be private.
*/
class textAdventureEngine {
	
	TBA_DEBUG = false;

	internal_Database = undefined;
	internal_CurrentRoom = null;
	internal_Inventory = {};

	constructor(outputFunction, clearOutputFunction) { 
		this.outputAddLines = outputFunction;
		this.outputClear = clearOutputFunction;
	}

	loadDatabaseFromPath(gamedatabasePath, showGameName = true){
		this.outputClear();
		this.outputAddLines("Initializing Textbased Adventure Engine...");
		let base = this;
		$.getJSON( gamedatabasePath)
		.done(function( json ) {
			base.internal_initDatbase(json, showGameName);
		})
		.fail(function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
			base.outputAddLines("Failed to Load json");
			
			base.internal_showRequest();
		});
	}

	input(cmd){
		this.internal_praseCommand(cmd);
	}

	internal_initDatbase(gameDatabaseObject, showGameName = true){
		this.internal_Database = gameDatabaseObject;

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
			this.outputAddLines("<br /><br />'"+this.internal_Database.general.title+"' by "+this.internal_Database.general.author+"<br>"+"Version: "+this.internal_Database.general.version+"<br />");
		}else{
			this.outputClear();
		}
		this.internal_praseCommand("welcome");
	}
	
	internal_showRequest(){
		this.outputAddLines(this.internal_Database.general.request);
	}
	
	internal_removeFromString(arr,str){
		let regex = new RegExp("\\b"+arr.join('|')+"\\b","gi");
		let removed = str.replace(regex, '');
		return removed.replace(/\s\s+/g, ' ');
	}
	
	internal_praseCommand(cmd){
		cmd = cmd.toLowerCase();
	
		// remove ignored words from command
		cmd = this.internal_removeFromString(this.internal_Database.ignored_words, cmd);
		cmd = cmd.trim();
		console.log("Stripped command of parser: '"+cmd+"'");
	
		if(cmd=="welcome"){
			this.internal_Inventory = {};
			if(this.internal_Database.general.start.text.length > 0){
				this.outputAddLines(this.internal_Database.general.start.text);
			}
			this.internal_parseActionString(undefined, this.internal_Database.general.start.action);
		}else if(cmd == "debug"){
			if(this.TBA_DEBUG==true){
				this.TBA_DEBUG = true;
			}else{
				this.TBA_DEBUG = false;
			}
		}else if(cmd == "help" || cmd == "?" || cmd == "what" || cmd == "how" || cmd == "what do"){
	
			var allVerbs = "";
			$.each( this.internal_Database.verbs, function( key, val ) {
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
	
			let locationState = this.internal_getLocationState(this.internal_CurrentRoom);
			let verb = this.internal_checkForVerb(words);
			let object = this.internal_checkForObject(words);
			let currentObjectState = undefined;
			// Get current state of object if it's not the room / location
			if(object != undefined){
				currentObjectState = this.internal_getObjectState(object);
			}
	
			//no action
			if(verb == undefined && object != undefined){
				//this.outputAddLines("You want to do what with the "+currentObjectState.name+"?!");
				this.outputAddLines("Unknown verb, please try to rephrase your command.");
				this.internal_showRequest();
				return;
			}
	
			// Look at room
			if(verb != undefined && verb.name == "look" && (words.length === 1)){
				locationState = this.internal_getLocationState(this.internal_CurrentRoom);
				this.writeLocationDescription(locationState.objects);
				this.internal_showRequest();
				return;
			}
	
			//no object
			if(verb != undefined && (object == undefined)){
				console.log("object is undefined");
				this.outputAddLines(verb.failed);
				this.internal_showRequest();
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
								this.internal_parseActionString(object, objectStateVerbDefinition.action[i]);
							}
						}else{
							this.internal_parseActionString(object, objectStateVerbDefinition.action);
						}
					}
				}else{
					this.outputAddLines("Sorry you can't do this with "+currentObjectState.name+".");
				}
				this.internal_showRequest();
				return;
			}
			this.outputAddLines("Please try to rephrase your command.");
	
		}
		this.internal_showRequest();
	}
	writeLocationDescription(objectsInLocation){
		var fullLocationDescription = "";
		for(var i =0; i< objectsInLocation.length; i++){
			let thisObject = this.internal_Database.objects[objectsInLocation[i]];
			fullLocationDescription += " "+(thisObject.states[thisObject.currentState].locationDescription);
		}
		this.outputAddLines(fullLocationDescription);
		
		if(Object.keys(this.internal_Inventory).length > 0){
			let index = Object.keys(this.internal_Inventory)[0];
			let currentItemDescription = this.internal_Inventory[index].states[this.internal_Inventory[index].currentState].locationDescription;
			if(currentItemDescription.length > 0){
				this.outputAddLines(currentItemDescription);
			}
		}
	}
	internal_parseActionString(affectedObject, actionString){
		var acts = actionString.split(" ");
		if(acts[0]=="objectState" && acts.length == 2){ // change this Object
			console.log("changing ObjectState to "+acts[1]);
			affectedObject.currentState = acts[1];
		}else if(acts[0]=="objectState" && acts.length == 3){ // Reference other object
			console.log("changing ObjectState of "+acts[1]+" to "+acts[2]);
			this.internal_Database.objects[acts[1]].currentState = acts[2];
		}else if(acts[0]=="objectRemoveFromLocation"){
			console.log("removing Object from Location:"+acts[1]);
			var index = this.internal_getLocationState(this.internal_CurrentRoom).objects.indexOf(acts[1]);
			if (index > -1) {
				this.internal_getLocationState(this.internal_CurrentRoom).objects.splice(index, 1);
				console.log("Removed object with index: "+index);
			}else{
				console.log("Object not found in location: " + acts[1]);
			}
		}else if(acts[0]=="objectAddToLocation"){
			console.log("adding Object to Location:"+acts[1]);
			this.internal_getLocationState(this.internal_CurrentRoom).objects.push(acts[1]);
		}else if(acts[0]=="gotoLocation"){
			console.log("SIWTCHING LOCATION TO:"+acts[1]);
			this.internal_CurrentRoom = acts[1];
			var currentRoomState =  this.internal_getLocationState(this.internal_CurrentRoom);
			this.writeLocationDescription(currentRoomState.objects);
		}else if(acts[0]=="showLocationDescription"){
			var currentRoomState =  this.internal_getLocationState(this.internal_CurrentRoom);
			this.writeLocationDescription(currentRoomState.objects);
		}else if(acts[0]=="inventoryAdd"){
			console.log("Add to inventory: " + acts[1]);
			if(Object.keys(this.internal_Inventory).length > 0){
				delete this.internal_Inventory[Object.keys(this.internal_Inventory)[0]];
			}
			this.internal_Inventory[acts[1]] = this.internal_Database.objects[acts[1]];
		}else if(acts[0]=="inventoryRemove"){
			let index = Object.keys(this.internal_Inventory)[0];
			if(index === acts[1]){
				console.log("Removed current inventory object "+acts[1]);
				delete this.internal_Inventory[index];
			}else{
				console.log("Can't remove item from inventory, as it's no in the inventory "+acts[1]);
			}
		}

		
	}
	
	internal_getLocationState(location){
		return this.internal_Database.locations[location];
	}
	
	internal_getObjectState(object){
		if (typeof object === 'string' || object instanceof String){
			let objectRef = this.internal_Database.objects[object];
			return objectRef.states[objectRef.currentState];
		}else{
			return object.states[object.currentState];
		}
	}
	
	
	
	internal_checkForVerb(words){
		let value = undefined;
		for(var i=0; i<words.length && value === undefined; i++){
			//console.log( "Checking: "+words[i] );
			$.each( this.internal_Database.verbs, function( key, val ) {
				//console.log( "Key: "+key+ " " + val.words[0] );
				let test = $.inArray(words[i], val.words);
				//console.log("test result: "+ test);
				if(test >= 0){
					value = val;
					return; // exit $.each
				}
			});
		}
		return value;
	}
	
	internal_checkForObject(words){
		var locationState = this.internal_getLocationState(this.internal_CurrentRoom);
		let value = undefined;
	
		// Check room Items
		for(var i=0; i<words.length; i++){
			
			// Check inventory item
			if(Object.keys(this.internal_Inventory).length > 0){
				let index = Object.keys(this.internal_Inventory)[0];
				let test = $.inArray(words[i],  this.internal_getObjectState(this.internal_Inventory[index]).words);
				if(test >= 0){
					value = this.internal_Inventory[index];
					return value;
				}
			}
			// check for objects in room
			var base = this;
			$.each(locationState.objects, function( index, val ) {
				let test = $.inArray(words[i], base.internal_getObjectState(val).words);
				if(test >= 0){
					value = base.internal_Database.objects[val];
					return; // exit $.each loop
				}
			});
			if(value!=undefined){
				break;
			}
		}
		
	
		return value;
	}
	internal_checkForSecondObject(words){
		var locationState = this.internal_getLocationState(this.internal_CurrentRoom);
		console.log("checking for seconds object");
		var value = undefined;
		var founds = 0;
	
		for(var i=0; i<words.length; i++){
			let isHandItem = false;
			// Check inventory item
			if(Object.keys(this.internal_Inventory).length > 0){
				let index = Object.keys(this.internal_Inventory)[0];
				let test = $.inArray(words[i],  this.internal_getObjectState(this.internal_Inventory[index]).words);
				if(test >= 0){
					value = this.internal_Inventory[index];
					founds++;
					isHandItem = true;
				}
			}
			if(!isHandItem){
				// check for objects in room
				var base = this;
				$.each(locationState.objects, function( index, val ) {
					let test = $.inArray(words[i], base.internal_Database.objects[val].words);
					if(test >= 0){
						value = base.internal_Database.objects[val];
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
	
	internal_checkForObjectId(name){
		console.log("checking for object id");
		var value = undefined;
		$.each(this.internal_Database.objects, function( index, val ) {
			if(val.states[val.currentState].name==name){
				value = index;
				return;
			}
		});
	
		return value;
	}
}