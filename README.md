# TextAdventureJS
A text based adventure engine written in Javascript. 

## Game Database 
A Text Adventure Database (TADB) is JSON file which contains all information for a given game that runs on the TextAdventureJS Engine.
It contains all Verbs, Locations and Objects and their relations to each other.

A TADB-Json file be validated using the provieded JSON schema (textAdventureDatabase.schema.json). The schema contains all most important infos on how to write your own Game Database. It shows which JSON keys are required and what their value is used for.

I recommend the VSCODE Addon JSON Schema Validator by tberman. Not only does it validate the schema, as it also provides you with most information embedded in the schema.

## Concept
Each game exists of ```objects``` which are either in the players inventory or in ```locations``` and can be interactived with, using ```verbs```.

### Locations
Locations are basically groups of ```objects```.

The description text of a location soley exists of objects which are connected to it. An empty location has no description.

This means a location should always have at least on object, at any given moment, which descripbes the basic environment of the location.

### Verbs
Verbs are actions that the user can type. \
   Each verb has a...
   - a name (usually the verb itself, ```name```)
   - list of synonyms (```words```)
   - a text that is shown, in case the verb can't be used here. (```failed```) \
   E.G. if the user tries to 'open' an object, that can't be opened.

### Objects
Are everything within the game world.
Objects can be realtivily compley, as they can change their words, description and possible verbs based on their current ```state```.

Each object has...
- a value that defines wich state it is currently in (```currentState```)
- a list of all possible ```states```

Each object state has...
- the name for this object in this current state (like "closed box" or "opend box", ```name```)
- a list of ```words``` that the player can tape to refer to this object
- a text that is added to the location description if the object is in the players current location or in his inventory (can be left emptry, ```locationDescription```)
- a list of ```verbs``` that can be used with this object, in its current state. \
    each of these verbs has...
    - a ```text``` that will be shown if the verb is used with this object
    - one or multiple ```inventory``` actions which define changes to the players inventory
    - one or multiple general ```action```s which defines what happens to this or other objects if this verb is used with the object in its current state. (see Possible Actions)
    - a list of 'usableObjects' *which is currently unused*. \
     It is designed to implement usage of object with other objects.



### Possible Actions

#### objectState

 ```
 objectState {newObjectState}
 ```
Changes the state of the current Object to newObjectState
 ```
objectState {objectId} {newObjectState}
 ```
Changes the state of a different Object to newObjectState

#### objectRemoveFromLocation
 ```
objectRemoveFromLocation {objectId}
 ```
Removes the given object from the current location

#### objectAddToLocation
 ```
objectAddToLocation {objectId}
 ```
Adds a given object to the current location

#### gotoLocation
 ```
gotoLocation {locationId}
 ```
Changes the current location to a different one

#### showLocationDescription
 ```
showLocationDescription
 ```
Automatically shows the current location description, as if the user typed 'look'