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
A Text Adventure Database (TADB) is JSON file which describes games that can run in the TextAdventureJS Engine.

`.tadb.json` files can be validated using the JSON schema in this repo: `textAdventureDatabase.schema.json`.
The schema contains also includes descriptions for the properties. I recommend using the [JSON Schema Validator](https://marketplace.visualstudio.com/items?itemName=tberman.json-schema-validator) for this task.

## Concept
Each game exists of `objects` which are either in the players inventory or in `locations`. The player can interact with object using `verbs`.

### Locations
Locations are basically groups of `objects`.

The description text of a location soley exists of the objects which can be found in it. This means an empty location has no description. Thus a location should always have at least one object, at any given moment.

### Verbs
Verbs are commands that the user can type. \
   Each verb has a...
   - a name
   - list of synonyms (`words`)
   - a text that is shown, in case the verb can't be used with the object the user mentioned (`failure`) \
   E.G. if the user tries to 'open' an object, that can't be opened.

### Objects
Everything that player can see or interact with is an object.

Each object has...
- a unique name
- a list of `words` that the player can type to refer to this object
- an optional  text that is added to the location description if the object is in the players current location or in his inventory (`locationDescription`)
- a list of `actions` which describes the `verbs` that can be used with this object. \
    each of these actions has...
    - a `text` that will be shown if the verb is used with this object
    - zero, one or more functions listed under `action`, which can be used to change the current location and its objects (see Functions)
    - a list of 'usableObjects' *which is currently unused*. \
     It is designed to implement usage of object with other objects.

#### Changing Objects
In almost every game there are scenarios where objects have to change their description texts or behaviors during gameplay. For example if you need a `chest` which the player can open only once, after that it will be open.

In this case you have to create a second object `chest_opened`, which has it's own description and verbs it can handle.
Now you can use the `objectReplaceInLocation` function in `chest`s `open` action to replace `chest` in the current location with `chest_opened`.

To close the chest again, you can use `objectReplaceInLocation` again in `chest_opened`s `close` action.

### Functions
Functions can be used in actions to modify the current location or the plazers inventory.

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

#### objectReplaceInLocation
 ```
objectReplaceInLocation {objectIdToRemove} {objectIdToAdd}
 ```
Removes `{objectIdToRemove}` and adds `{objectIdToAdd}`. Shorthand for sequentially calling `objectRemoveFromLocation` and `objectAddToLocation`.

Useful if an object transitions into a different one like `chest_closed` to `chest_opened`.

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