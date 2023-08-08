# TextAdventureJS
A text based adventure engine written in Javascript. 

Here's a very basic example, that is included in this Repositroy:
https://dak0r.github.io/TextAdventureJS/example.html

A different project, that uses TextAdventureJS can be foundon my website: 
https://www.danielkorgel.com

## Usage

See `example.html` for a working minimal example.
```js
   // Defines where to write output
   function witeLine(outputLine){                
      $("#outputArea").append(outputLine);       
   }
   // Clears output area
   function clearArea(){
      $("#outputArea").val("");         
   }

   // Init engine and load a game
   var textAdv = new textAdventureEngine(witeLine, clearArea);
   textAdv.loadDatabaseFromFile("game.TADB.json");

   // Send Input to game
   textAdv.input("look at cookie");

```

## Game Database 
A Text Adventure Database (TADB) is JSON file which contains all information for a given game that runs on the TextAdventureJS Engine.
It contains all Verbs, Locations and Objects and their relations to each other.

A TADB-Json file can be validated using the provieded JSON schema: `textAdventureDatabase.schema.json`. The schema contains all important infos on how to write your own Game. It shows which JSON keys are required and what their value is used for.

I recommend the VSCODE Addon JSON Schema Validator by tberman. \
Not only does it validate the schema, as it also provides you   information from schema.

## Concept
Each game exists of ```objects``` which are either in the players inventory or in ```locations```. The player can interact with object using ```verbs```.

### Locations
Locations are basically groups of ```objects```.

The description text of a location soley exists of the objects which can be found in it. This means an empty location has no description. Thus a location should always have at least one object, at any given moment.

### Verbs
Verbs are commands that the user can type. \
   Each verb has a...
   - a name (usually the verb itself, ```name```)
   - list of synonyms (```words```)
   - a text that is shown, in case the verb can't be used with the named object (```failed```) \
   E.G. if the user tries to 'open' an object, that can't be opened.

### Objects
Everything that player can see or interact with is an object.
Objects can be realtivily complex, as every object can have multiple `states`, which cause its description and possible actions to change.

Each object has...
- a value that defines wich state it is currently in (```currentState```)
- a list of all possible ```states```

Each object state has...
- the name for this object in this current state (like "closed box" or "opend box", ```name```)
- a list of ```words``` that the player can type to refer to this object
- a text that is added to the location description if the object is in the players current location or in his inventory (can be left emptry, ```locationDescription```)
- a list of ```verbs``` that can be used with this object, in its current state. \
    each of these verbs has...
    - a ```text``` that will be shown if the verb is used with this object
    - one or multiple general ```action```s which defines what happens to this or other objects if a verb is used with the object in its current state. (see Possible Actions)
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

#### inventoryAdd
 ```
inventoryAdd {objectId}
 ```
Adds the item to users inventory. 
The user can have multiple items in his inventory, the location descriptions will be listed below each other.

#### inventoryRemove
 ```
inventoryRemove {objectId}
 ```
Removes the item from users inventory