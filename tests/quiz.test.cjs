const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(storage = new Map()) {
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag; this.children = []; this.events = {}; this.style = {}; this.dataset = {}; this.disabled = false;
      const classes = new Set();
      this.classList = { add: (...items) => items.forEach(x => classes.add(x)), remove: (...items) => items.forEach(x => classes.delete(x)), contains: x => classes.has(x) };
    }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html || ''; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, fn) { this.events[name] = fn; }
    appendChild(child) { this.children.push(child); }
  }
  const elements = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const context = vm.createContext({
    document: { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement: tag => new Element(tag) },
    window: { location: { href: '' } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
  });
  return { context, elements, timers, run: code => vm.runInContext(code, context), flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

function quiz(storage) {
  const h = harness(storage);
  const html = fs.readFileSync(path.join(__dirname, '../quiz.html'), 'utf8');
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];
  h.run(script);
  return h;
}

test('rapid repeat answers score once and schedule one transition', () => {
  const h = quiz();
  h.run('checkAnswer(quizSet[0].correct, quizSet[0].correct, optionsEl.children[quizSet[0].correct], quizSet[0])');
  h.run('checkAnswer(quizSet[0].correct, quizSet[0].correct, optionsEl.children[quizSet[0].correct], quizSet[0])');
  assert.equal(h.run('score'), 1);
  assert.equal(h.timers.size, 1);
  assert.ok(h.elements.get('options').children.every(x => x.disabled && x.tagName === 'button'));
  h.flush();
  assert.equal(h.run('currentQ'), 1);
  assert.ok(h.elements.get('options').children.every(x => !x.disabled));
});
test('language changes cannot reopen an answered question', () => {
  const h = quiz();
  h.run('checkAnswer(quizSet[0].correct, quizSet[0].correct, optionsEl.children[0], quizSet[0])');
  h.elements.get('langSwitch').events.click();
  assert.equal(h.run('lang'), 'en');
  assert.equal(h.timers.size, 1);
});
test('a perfect run completes once with the correct score', () => {
  const h = quiz();
  for (let index = 0; index < 10; index++) {
    h.run('checkAnswer(quizSet[currentQ].correct, quizSet[currentQ].correct, optionsEl.children[0], quizSet[currentQ])');
    h.flush();
  }
  assert.match(h.elements.get('result').textContent, /10 \/ 10/);
  h.run('endQuiz()');
  assert.equal(h.timers.size, 1);
});

test('full-quiz best persists across loads and retries cannot replace it', () => {
  const storage = new Map();
  const h = quiz(storage);
  h.run('score = 7; endQuiz()');
  assert.equal(storage.get('edugram.optics.best.v1'), '7');
  const next = quiz(storage);
  assert.match(next.elements.get('personalBest').textContent, /7 \/ 10/);
  next.run('score = 10; retryRound = true; endQuiz()');
  assert.equal(storage.get('edugram.optics.best.v1'), '7');
  next.elements.get('clearBest').events.click();
  assert.equal(storage.size, 0);
});
test('invalid and unavailable storage do not prevent a quiz', () => {
  for (const saved of ['-1', '11', 'NaN', '{}']) {
    const h = quiz(new Map([['edugram.optics.best.v1', saved]]));
    assert.equal(h.run('personalBest'), null);
  }
  const h = quiz({ get() { throw new Error('Storage blocked'); }, set() { throw new Error('Storage blocked'); } });
  h.run('score = 5; endQuiz()');
  assert.equal(h.run('personalBest'), 5);
});
test('progress follows completed questions', () => {
  const h = quiz();
  assert.match(h.elements.get('quizProgressLabel').textContent, /Question 1 of 10/);
  h.run('checkAnswer(quizSet[0].correct, quizSet[0].correct, optionsEl.children[0], quizSet[0])');
  h.flush();
  assert.equal(h.elements.get('quizProgress').value, 1);
});
