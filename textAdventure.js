class textAdventureEngine {
	
	TBA_DEBUG = false;
	TBA_SHOW_GAME_NAME = false;

	internal_Database = undefined;
	internal_CurrentRoom = null;
	internal_CurrentItem = null;

	constructor(outputFunction, clearOutputFunction) { 
		this.output = outputFunction;
		this.clear = clearOutputFunction;
	}

	loadDatabaseFromPath(gamedatabasePath){
		this.clear();
		this.output("Initializing Textbased Adventure Engine...");
		let base = this;
		$.getJSON( gamedatabasePath)
		.done(function( json ) {
			base.internal_initDatbase(json);
		})
		.fail(function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
			base.output("Failed to Load json");
			
			base.internal_showRequest();
		});
	}

	input(cmd){
		this.internal_praseCommand(cmd);
	}

	internal_initDatbase(gameDatabaseObject){
		this.internal_Database = gameDatabaseObject;
		//console.log( "JSON Data: " + json.users[ 3 ].name );
		//this.output("Loaded json");
		//this.output("Loading Actions...");
		//this.output("Loading Objects...");
		//this.output("Loading Locations...");
		/*
		var base = this;
		$.each( json.actions, function( i, item ) {
			base.output("Loaded Action: "+item.name);
		});
		$.each( json.objects, function( i, item ) {
			base.output("Loaded Object: "+item.name);
		});
		$.each( json.locations, function( i, item ) {
			base.output("Loaded Location: "+item.title);
		});
		*/
		//this.output("Loading done.");
		if(this.TBA_SHOW_GAME_NAME){
			this.clear();
			this.output("<br /><br />'"+this.internal_Database.general.title+"' by "+this.internal_Database.general.author+"<br>"+"Version: "+this.internal_Database.general.version+"<br />");
		}else{
			this.clear();
		}
		this.internal_praseCommand("welcome");
	}
	
	internal_showRequest(){
		this.output(this.internal_Database.general.request);
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
			this.internal_CurrentItem = null;
			if(this.internal_Database.general.start.text.length > 0){
				this.output(this.internal_Database.general.start.text);
			}
			if(this.internal_Database.general.start.inventory!=""){
				inv = this.internal_Database.general.start.inventory.split(" ");
				if(inv[0]=="add"){
					this.internal_CurrentItem = this.internal_Database.objects[inv[1]];
				}else{
					this.internal_CurrentItem = undefined;
				}
			}
			this.internal_parseActionString(undefined, this.internal_Database.general.start.action);
		}else if(cmd == "debug"){
			if(this.TBA_DEBUG==true){
				this.TBA_DEBUG = true;
			}else{
				this.TBA_DEBUG = false;
			}
		}else if(cmd == "help" || cmd == "?" || cmd == "what" || cmd == "how" || cmd == "what do"){
	
			var allActions = "";
			$.each( this.internal_Database.actions, function( key, val ) {
					if(allActions != ""){
						allActions += ", "+val.name;
					}else{
						allActions += val.name;
					}
			});
			this.output("Enter simple directions like<br /><i>look at wall</i><br />");
			this.output("Commonly used verbs are: "+allActions);
		} else {
			let words = cmd.split(" ");
	
			let locationState = this.internal_getLocationState(this.internal_CurrentRoom);
			let action = this.internal_checkForAction(words);
			let object = this.internal_checkForObject(words);
			let currentObjectState = undefined;
			// Get current state of object if it's not the room / location
			if(object != undefined){
				currentObjectState = this.internal_getObjectState(object);
			}
	
			//no action
			if(action == undefined && object != undefined){
				//this.output("You want to do what with the "+currentObjectState.name+"?!");
				this.output("Unknown verb, please try to rephrase your command.");
				this.internal_showRequest();
				return;
			}
	
			// Look at room
			if(action != undefined && action.name == "look" && (words.length === 1)){
				locationState = this.internal_getLocationState(this.internal_CurrentRoom);
				this.writeLocationDescription(locationState.objects);
				this.internal_showRequest();
				return;
			}
	
			//no object
			if(action != undefined && (object == undefined)){
				console.log("object is undefined");
				this.output(action.failed);
				this.internal_showRequest();
				return;
			}
	
			//Do a regular Action
			if(action!=undefined && object != undefined){
				console.log("Action: "+ action.name);
				console.log("Object: "+ currentObjectState.name);
				if(currentObjectState == undefined){
					console.log("Object "+object.name+" is in an undefiend state: "+ object.currentState);
				}
				result = currentObjectState.actions[action.name];
				if(this.TBA_DEBUG==true){
					console.log(result);
	
					this.output("Action: "+ action.name);
					this.output("Object: "+ object.name);
				}
	
				if(result != undefined){
					//
					let actionState = currentObjectState.actions[action.name];
					this.output(actionState.text);
					//TODO: REFACTOR THIS AND LINE FOR USE CURRENT ITEM!!! 
					if(actionState.action!=undefined){
						if($.isArray(actionState.action) && actionState.action.length > 0) {
							for(var i=0; i<actionState.action.length; i++){
								this.internal_parseActionString(object, actionState.action[i]);
							}
						}else{
							this.internal_parseActionString(object, actionState.action);
						}
					}
	
					if(actionState.inventory!=""){
						inv = actionState.inventory.split(" ");
						if(inv[0]=="add"){
							this.internal_CurrentItem = this.internal_Database.objects[inv[1]];
						}else{
							this.internal_CurrentItem = undefined;
						}
					}
				}else{
					this.output("Sorry you can't do this with "+currentObjectState.name+".");
				}
				this.internal_showRequest();
				return;
			}
			this.output("Please try to rephrase your command.");
	
		}
		this.internal_showRequest();
	}
	writeLocationDescription(objectsInLocation){
		var fullLocationDescription = "";
		for(var i =0; i< objectsInLocation.length; i++){
			let thisObject = this.internal_Database.objects[objectsInLocation[i]];
			fullLocationDescription += " "+(thisObject.states[thisObject.currentState].locationDescription);
		}
		this.output(fullLocationDescription);
		
		if(this.internal_CurrentItem!=undefined){
			let currentItemDescription = this.internal_CurrentItem.states[this.internal_CurrentItem.currentState].locationDescription;
			if(currentItemDescription.length > 0){
				this.output(currentItemDescription);
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
		}else if(acts[0]=="locationState"){
			console.log("changing LocationState to "+acts[1]);
			this.internal_Database.locations[this.internal_CurrentRoom].currentState = acts[1];
			locationState = this.internal_getLocationState(this.internal_CurrentRoom);
			this.output(locationState.actions.enter.text);
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
			var currentRoomState =  internal_getLocationState(this.internal_CurrentRoom);
			this.writeLocationDescription(currentRoomState.objects);
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
	
	
	
	internal_checkForAction(words){
		let value = undefined;
		for(var i=0; i<words.length && value === undefined; i++){
			//console.log( "Checking: "+words[i] );
			$.each( this.internal_Database.actions, function( key, val ) {
				//console.log( "Key: "+key+ " " + val.words[0] );
				let test = $.inArray(words[i], val.words);
				//console.log("test result: "+ test);
				if(test >= 0){
					//console.log("OOOOOKKKKAAAYY!!");
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
			if(this.internal_CurrentItem != undefined){
				test = $.inArray(words[i],  this.internal_getObjectState(this.internal_CurrentItem).words);
				if(test >= 0){
					value = this.internal_CurrentItem;
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
			if(this.internal_CurrentItem != undefined){
				test = $.inArray(words[i],  this.internal_getObjectState(this.internal_CurrentItem).words);
				if(test >= 0){
					value = this.internal_CurrentItem;
					founds++;
					isHandItem = true;
				}
			}
			if(!isHandItem){
				// check for objects in room
				var base = this;
				$.each(locationState.objects, function( index, val ) {
					var test = $.inArray(words[i], base.internal_Database.objects[val].words);
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