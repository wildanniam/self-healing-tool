import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, cleanContextText, cleanDomText } from '../dist/privacy.js';

const htmlText = value => value.replace(/&/g, '&amp;').replace(/\u00a0/g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const htmlAttribute = value => value.replace(/&/g, '&amp;').replace(/\u00a0/g, '&nbsp;').replace(/"/g, '&quot;');
const decodedHtml = value => value.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&');

test('privacy removes omitted values in literal, selector JSON and DOM serialization forms', () => {
  for (const secret of ['Sample & value', 'Sample <value> & "quoted"', 'Backslash \\ and "quote"', 'Nonbreaking\u00a0space', 'Line\nbreak\tvalue', 'Literal &amp; spelling']) {
    assert.equal(redact(`before ${secret} after`, [secret]), 'before [redacted] after');
    assert.equal(cleanContextText(secret.replace(/\s+/g, ' ').trim(), [secret]), '[redacted]');
    const selector = `[name=${JSON.stringify(secret)}]`;
    assert.equal(redact(selector, [secret]), '[name="[redacted]"]');
    for (const encoded of [htmlText(secret), htmlAttribute(secret), htmlText(secret).replace(/"/g, '&quot;')]) {
      const cleaned = cleanDomText(`<main title="${encoded}">${encoded}</main>`, [secret]);
      assert.equal(cleaned, '<main title="[redacted]">[redacted]</main>');
      assert.ok(!decodedHtml(cleaned).includes(secret));
      assert.ok(!JSON.parse(JSON.stringify({ cleanedDom: cleaned })).cleanedDom.includes(encoded));
    }
  }
});

test('privacy performs overlapping omissions once without re-redacting inserted markers', () => {
  assert.equal(redact('redacted and a longer redacted value', ['redacted', 'a longer redacted value']), '[redacted] and [redacted]');
  assert.equal(redact('a.*[x]$ a.*[x]$', ['a.*[x]$']), '[redacted] [redacted]');
  assert.equal(redact('Sample &amp; value', ['&', 'Sample & value']), '[redacted]');
  assert.equal(redact('ordinary text', ['', 'a secret longer than this input']), 'ordinary text');
});

test('privacy fallback and feature cleaning share every reserved evaluator category', () => {
  for (const reserved of ['oracle', 'ground-truth', 'expected-locator', 'expected-selector', 'expected-result', 'expected-outcome', 'answer-locator', 'answer-selector', 'mutation-id', 'mutation-answer', 'eval-sentinel']) {
    const input = `<section>${reserved}: private annotation</section>`;
    assert.equal(cleanDomText(input), ''); assert.equal(cleanContextText(input), '');
  }
  const useful = '<section>' + 'Product detail '.repeat(80) + '</section>';
  assert.equal(cleanDomText(useful), useful);
  assert.equal(cleanContextText(useful).length, 500);
  assert.equal(cleanDomText('<p>Public</p>\n<p>expected-outcome: private</p>\n<p>Details</p>'), '<p>Public</p> <p>Details</p>');
});

test('privacy encoding support preserves existing automatic credential and URL filtering', () => {
  const input = 'sk-example123 Bearer private-token person@example.test https://example.test/path?secret=1';
  const cleaned = cleanDomText(input);
  for (const original of ['sk-example123', 'private-token', 'person@example.test', 'https://example.test']) assert.ok(!cleaned.includes(original));
});
