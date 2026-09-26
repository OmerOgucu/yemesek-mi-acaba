import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORIES, severityLabel } from './categories.ts';

test('category ids stay aligned with the API enum', () => {
  assert.deepEqual(
    CATEGORIES.map((item) => item.id),
    [
      'FOOD_POISONING',
      'HYGIENE',
      'SCAM_PRICING',
      'FALSE_ADS',
      'WRONG_OR_COLD',
      'RUDE_SERVICE',
    ],
  );
  assert.equal(severityLabel(5), 'Kaç kaç');
  assert.equal(severityLabel(1), 'Ufak tatsızlık');
});
