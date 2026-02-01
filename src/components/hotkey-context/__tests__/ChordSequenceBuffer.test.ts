import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChordSequenceBuffer } from '../ChordSequenceBuffer';
import type { KeyPress } from '../../../types';

function key(key: string, code?: string, modifiers: Array<'ctrl'|'alt'|'shift'|'meta'> = []): KeyPress {
  return {
    key,
    code: code ?? key,
    modifiers: new Set(modifiers),
  };
}

describe('ChordSequenceBuffer', () => {
  let buffer: ChordSequenceBuffer;

  beforeEach(() => {
    vi.useFakeTimers();
    buffer = new ChordSequenceBuffer(2000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functions', () => {
    it('returns first key when appending first key', () => {
      const result = buffer.append(key('a', 'KeyA'));
      expect(result).toEqual([key('a', 'KeyA')]);
    });

    it('forms a two-key sequence and clears pending on second key', () => {
      buffer.append(key('a', 'KeyA'));
      const result = buffer.append(key('b', 'KeyB'));
      expect(result).toEqual([key('a', 'KeyA'), key('b', 'KeyB')]);

      // After forming a chord, appending again should start a new sequence
      const result2 = buffer.append(key('c', 'KeyC'));
      expect(result2).toEqual([key('c', 'KeyC')]);
    });

    it('clears pending when clear() is called', () => {
      const onTimeout = vi.fn();
      buffer.setTimeoutCallback(onTimeout);
      buffer.append(key('a', 'KeyA'));

      buffer.clear();

      // New sequence should act like first append
      expect(buffer.append(key('x', 'KeyX'))).toEqual([key('x', 'KeyX')]);
    });
  });

  describe('chord timeout', () => {
    it('cancels timeout when clear() is called', () => {
      const onTimeout = vi.fn();
      buffer.setTimeoutCallback(onTimeout);
      buffer.append(key('a', 'KeyA'));

      buffer.clear();

      // Advance past the timeout duration; callback should not fire
      vi.advanceTimersByTime(3000);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('invokes onTimeout callback and clears buffer when timeout elapses', () => {
      const onTimeout = vi.fn();
      buffer.setTimeoutCallback(onTimeout);

      buffer.append(key('a', 'KeyA'));

      // Fast-forward time to just before timeout
      vi.advanceTimersByTime(1999);
      expect(onTimeout).not.toHaveBeenCalled();

      // Exactly at timeout
      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(1);

      // After timeout, pending should be cleared; new append is first key
      const result = buffer.append(key('b', 'KeyB'));
      expect(result).toEqual([key('b', 'KeyB')]);
    });

    it('does not start timeout if no callback is set', () => {
      buffer.append(key('a', 'KeyA'));
      // Advance far beyond default
      vi.advanceTimersByTime(10000);
      // No callback to assert; behavior is that it should not throw and next append completes sequence
      const result = buffer.append(key('b', 'KeyB'));
      expect(result).toEqual([key('a', 'KeyA'), key('b', 'KeyB')]);
    });

    it('changing timeout duration affects subsequent timers', () => {
      const onTimeout = vi.fn();
      buffer.setTimeoutCallback(onTimeout);

      // First with default (2000)
      buffer.append(key('a', 'KeyA'));
      vi.advanceTimersByTime(1999);
      expect(onTimeout).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(1);

      // Start another sequence and change timeout to 100ms
      buffer.setTimeoutDuration(100);
      buffer.append(key('x', 'KeyX'));
      vi.advanceTimersByTime(99);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(2);
    });

    it('second key before timeout should prevent timeout callback', () => {
      const onTimeout = vi.fn();
      buffer.setTimeoutCallback(onTimeout);

      buffer.append(key('a', 'KeyA'));
      // Before timeout elapses, provide second key
      vi.advanceTimersByTime(500);
      const chord = buffer.append(key('b', 'KeyB'));

      expect(chord).toEqual([key('a', 'KeyA'), key('b', 'KeyB')]);

      // Even if time advances, callback should not have been called for the cleared timer
      vi.advanceTimersByTime(10000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
