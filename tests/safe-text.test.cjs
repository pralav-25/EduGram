const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml } = require('../scripts/safe-text.js');
test('assignment titles, chat messages and quiz answers cannot inject HTML', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml("A & B's answer"), 'A &amp; B&#39;s answer');
  assert.equal(escapeHtml('ଓଡ଼ିଆ'), 'ଓଡ଼ିଆ');
  assert.equal(escapeHtml(0), '0');
});
