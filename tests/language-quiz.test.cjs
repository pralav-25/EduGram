const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function languageQuiz() {
  const elements = new Map(), timers = new Map();
  let nextTimer = 0;
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  class Element {
    constructor(id = '') {
      this.id = id; this.children = []; this.events = {}; this.style = {}; this.dataset = {};
      this.disabled = false; this.value = '';
      const classes = new Set(['hidden']);
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
      };
    }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html || ''; }
    appendChild(element) { this.children.push(element); }
    addEventListener(name, callback) { this.events[name] = callback; }
    querySelector(selector) { return get(selector.slice(1)); }
    querySelectorAll() { return []; }
    remove() {}
  }
  const context = vm.createContext({
    document: { getElementById: get, createElement: () => new Element(), body: new Element() },
    setTimeout(callback, delay) { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    setInterval: () => 1, clearInterval() {}, escapeHtml: value => value,
  });
  const html = fs.readFileSync(path.join(__dirname, '../LANGUAGE_LEARNING_GAME.html'), 'utf8');
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .find(match => match[1].includes('function handleTranslationSubmit'))[1];
  // Run the real DOMContentLoaded body as a script so tests can drive its handlers.
  vm.runInContext(script.slice(script.indexOf('{') + 1, script.lastIndexOf('});')), context);
  const run = code => vm.runInContext(code, context);
  run(`currentCategoryIndex = categories.findIndex(category => category.title === 'Phrases & Sentences');
    currentLevelIndex = categories[currentCategoryIndex].levels.findIndex(level => level.quiz[0].type === 'paragraph_translation');
    loadQuiz();`);
  return { run, get, timers, flush() {
    const pending = [...timers.values()]; timers.clear();
    pending.forEach(timer => timer.callback());
  } };
}

test('correct practice translations hide the hint and advance once', () => {
  const h = languageQuiz();
  h.get('translation-input-box').value = 'I am good.';
  h.get('hint-text').style.opacity = '1';
  assert.doesNotThrow(() => h.run('handleTranslationSubmit(categories[currentCategoryIndex].levels[currentLevelIndex].quiz[0], false)'));
  assert.equal(h.get('hint-text').style.opacity, '0');
  h.run('handleTranslationSubmit(categories[currentCategoryIndex].levels[currentLevelIndex].quiz[0], false)');
  assert.equal(h.timers.size, 1);
  h.flush();
  assert.equal(h.run('currentQuestion'), 1);
});

test('leaving a quiz cancels the pending answer transition', () => {
  const h = languageQuiz();
  h.get('translation-input-box').value = 'I am good.';
  h.run('handleTranslationSubmit(categories[currentCategoryIndex].levels[currentLevelIndex].quiz[0], false)');
  h.get('back-to-levels-btn-quiz').events.click();
  h.flush();
  assert.equal(h.run('currentQuestion'), 0);
  assert.equal(h.get('level-selection-screen').classList.contains('hidden'), false);
  assert.equal(h.get('quiz-screen').classList.contains('hidden'), true);
});

test('results cancel a queued answer before it can reopen the quiz', () => {
  const h = languageQuiz();
  h.get('translation-input-box').value = 'I am good.';
  h.run('handleTranslationSubmit(categories[currentCategoryIndex].levels[currentLevelIndex].quiz[0], false)');
  h.run('showTestResults()');
  h.flush();
  assert.equal(h.run('currentQuestion'), 0);
  assert.equal(h.get('test-results-screen').classList.contains('hidden'), false);
});
