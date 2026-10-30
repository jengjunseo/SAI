import { test } from 'node:test';
import assert from 'node:assert/strict';
import { move } from '../lib/motion.ts';

test('interrupting a transition handles its rejected ready promise and runs both updates', async () => {
  const originalDocument = globalThis.document;
  const updates = [];
  let skipped = 0;
  globalThis.document = {
    querySelector: () => null,
    documentElement: { dataset: {} },
    startViewTransition(callback) {
      let rejectReady;
      const ready = new Promise((_, reject) => { rejectReady = reject; });
      callback();
      return {
        ready,
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() { skipped++; rejectReady(new DOMException('Transition was skipped', 'AbortError')); },
      };
    },
  };
  try {
    const first = move(() => updates.push('first'));
    const second = move(() => updates.push('second'));
    await Promise.all([first, second]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(skipped, 1);
    assert.deepEqual(updates, ['first', 'second']);
  } finally {
    globalThis.document = originalDocument;
  }
});
