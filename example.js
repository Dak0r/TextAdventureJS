var textAdv = new textAdventureEngine(witeLine, clearText);
// SUBPATH+"/programs/"+game_database)
textAdv.loadDatabaseFromPath("./lonesurvivor.tbegamedatabase.json");

function witeLine(output){
    console.log("OUT :: "+output);
    CONSOLE_PREVENT_INPUT = false;
	BASH_EXECUTING = false;
}

function clearText(){
    console.log("CLEAR :: ");
    CONSOLE_PREVENT_INPUT = false;
	BASH_EXECUTING = false;
}