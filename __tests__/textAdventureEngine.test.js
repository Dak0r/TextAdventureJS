const sampleGame = require('../templates/new_project.json');
const TextAdventureEngine = require('../textAdventure.js');

describe('textAdventureEngine parser & action integration tests (using template)', () => {
  let outputs = [];
  let outputFn;
  let clearFn;
  let analyticsFn;
  let engine;

  beforeEach(() => {
    outputs = [];
    outputFn = jest.fn((line) => outputs.push(line));
    clearFn = jest.fn(() => {
      outputs = [];
    });
    analyticsFn = jest.fn();

    // clear localStorage
    if (global.localStorage && typeof global.localStorage.clear === 'function') {
      global.localStorage.clear();
    }

    engine = new TextAdventureEngine(outputFn, clearFn, analyticsFn);
    engine.loadDatabaseFromObject(sampleGame);

    // tests start with a clean output buffer
    outputs.length = 0;
    jest.clearAllMocks();
  });

  test('look object outputs object description', () => {
    engine.input('look object');
    const found = outputs.find((l) => l.includes('A mysterious object.'));
    expect(found).toBeDefined();
  });

  test('take object moves it to inventory and removes from location', () => {
    engine.input('take object');
    const gs = engine.devGetGameState();
    expect(gs.inventory).toContain('template_object_pickedUp');
    const objects = gs.locations[gs.currentLocation].objects;
    expect(objects).not.toContain('template_object');
  });

  test('drop object returns it to location', () => {
    engine.input('take object');
    engine.input('drop object');
    const gs = engine.devGetGameState();
    expect(gs.inventory).not.toContain('template_object_pickedUp');
    expect(gs.locations[gs.currentLocation].objects).toContain('template_object');
  });

  test('non-look actions save to localStorage when enabled', () => {
    engine.input('take object');
    const key = (sampleGame.author + '_' + sampleGame.general.title).replace(/\s+/g, '_').toLowerCase();
    const stored = localStorage.getItem(key);
    expect(stored).not.toBeNull();
  });

  // Additional parser edge-case tests
  test('ignored words like "at" are stripped', () => {
    engine.input('look at object');
    const found = outputs.find((l) => l.includes('A mysterious object.'));
    expect(found).toBeDefined();
  });

  test('unknown verb with known object shows parser_unknown_verb_text', () => {
    engine.input('foo object');
    const found = outputs.find((l) => l.includes(sampleGame.general.parser_unknown_verb_text));
    expect(found).toBeDefined();
  });

  test('verb with unknown object shows verb failure', () => {
    engine.input('take nothing');
    const failure = sampleGame.verbs.pickup.failure;
    const found = outputs.find((l) => l.includes(failure));
    expect(found).toBeDefined();
  });

  test('standalone verb prints standalone text', () => {
    engine.input('jump');
    const found = outputs.find((l) => l.includes('You jump up and down.'));
    expect(found).toBeDefined();
  });

  test('analytics function is called on command', () => {
    engine.input('take object');
    expect(analyticsFn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      input: expect.any(String),
      currentLocation: expect.any(String),
      inventory: expect.any(Array)
    }));
  });

  test('game resumes from storage when continue_enabled true', () => {
    // make a change and ensure it was saved
    engine.input('take object');
    const key = (sampleGame.author + '_' + sampleGame.general.title).replace(/\s+/g, '_').toLowerCase();
    const stored = localStorage.getItem(key);
    expect(stored).not.toBeNull();

    // create a new engine and load the same database; it should resume from storage
    const outputs2 = [];
    const engine2 = new TextAdventureEngine((l) => outputs2.push(l), () => (outputs2.length = 0), () => {});
    engine2.loadDatabaseFromObject(sampleGame);
    expect(engine2.devGetGameState().inventory).toContain('template_object_pickedUp');
  });
});