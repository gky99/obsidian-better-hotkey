import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotkeyManager } from '../HotkeyManager';
import type { HotkeyEntry, KeyPress } from '../../../types';
import { Priority } from '../../../types';

function key(key: string, code?: string, modifiers: Array<'ctrl'|'alt'|'shift'|'meta'> = []): KeyPress {
  return {
    key,
    code: code ?? key,
    modifiers: new Set(modifiers),
  };
}

function entry(command: string, seq: KeyPress[], priority: Priority = Priority.User): HotkeyEntry {
  return { command, key: seq, priority };
}

describe('HotkeyManager', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let manager: HotkeyManager;

  beforeEach(() => {
    mockOnChange = vi.fn();
    manager = new HotkeyManager();
    manager.setOnChange(mockOnChange as (entries: HotkeyEntry[]) => void);
  });

  describe('insert', () => {
    it('inserts a new entry and triggers matcher rebuild with updated table', () => {
      const e = entry('cmd.save', [key('x'), key('s')], Priority.Plugin);

      manager.insert(e, Priority.User);

      // Should call rebuild with the inserted entry, and priority overridden to specified one
      expect(mockOnChange.mock.calls.length).toBe(1);
      const [entries] = mockOnChange.mock.calls[0]!;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({ ...e, priority: Priority.User });
    });

    it('overwrites existing entry with same canonical sequence and command (composite key)', () => {
      const first = entry('cmd.open', [key('x'), key('o')], Priority.Plugin);
      const second = entry('cmd.open', [key('x'), key('o')], Priority.Preset);

      manager.insert(first, Priority.Plugin);
      manager.insert(second, Priority.User); // same composite key; should overwrite

      expect(mockOnChange.mock.calls.length).toBe(2);
      const [entries] = mockOnChange.mock.calls.at(-1)!;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({ ...second, priority: Priority.User });
    });

    it('composite key uses canonicalized sequence (modifier ordering insensitive)', () => {
      const seq1 = [key('x', 'KeyX', ['ctrl', 'shift'])];
      const seq2 = [key('x', 'KeyX', ['shift', 'ctrl'])];

      // Different insertion orders for modifiers should canonicalize to same key
      manager.insert(entry('cmd.toggle', seq1, Priority.Plugin), Priority.Plugin);
      manager.insert(entry('cmd.toggle', seq2, Priority.Plugin), Priority.User);

      const [entries] = mockOnChange.mock.calls.at(-1)!;
      expect(entries).toHaveLength(1);
      // Last insert should win and reflect provided priority
      expect(entries[0].priority).toBe(Priority.User);
    });
  });

  describe('remove', () => {
    it('removes an existing entry and triggers matcher rebuild', () => {
      const e = entry('cmd.save', [key('x'), key('s')], Priority.Plugin);
      manager.insert(e, Priority.Plugin);
      expect(mockOnChange.mock.calls.length).toBe(1);

      manager.remove(e);

      expect(mockOnChange.mock.calls.length).toBe(2);
      const [entries] = mockOnChange.mock.calls.at(-1)!;
      expect(entries).toHaveLength(0);
    });

    it('no-op remove still triggers rebuild (idempotent behavior)', () => {
      const e = entry('cmd.missing', [key('z')], Priority.Plugin);

      manager.remove(e);

      expect(mockOnChange.mock.calls.length).toBe(1);
      const [entries] = mockOnChange.mock.calls[0]!;
      expect(entries).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('clears all entries when called without priority', () => {
      manager.insert(entry('cmd.a', [key('a')], Priority.User), Priority.User);
      manager.insert(entry('cmd.b', [key('b')], Priority.Preset), Priority.Preset);
      manager.insert(entry('cmd.c', [key('c')], Priority.Plugin), Priority.Plugin);

      manager.clear();

      const [entries] = mockOnChange.mock.calls.at(-1)!;
      expect(entries).toHaveLength(0);
    });

    it('clears only entries of the specified priority', () => {
      manager.insert(entry('cmd.a', [key('a')], Priority.User), Priority.User);
      manager.insert(entry('cmd.b', [key('b')], Priority.Preset), Priority.Preset);
      manager.insert(entry('cmd.c', [key('c')], Priority.Plugin), Priority.Plugin);

      manager.clear(Priority.Preset);

      const [entries] = mockOnChange.mock.calls.at(-1)!;
      // Should keep User and Plugin entries
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ command: 'cmd.a', priority: Priority.User }),
          expect.objectContaining({ command: 'cmd.c', priority: Priority.Plugin }),
        ])
      );
      // And remove Preset
      expect(entries.find((e: HotkeyEntry) => e.command === 'cmd.b')).toBeUndefined();
    });
  });

  describe('getAll and reindexMatcher', () => {
    it('getAll returns a shallow copy of current hotkeys', () => {
      const a = entry('cmd.a', [key('a')], Priority.User);
      const b = entry('cmd.b', [key('b')], Priority.Plugin);
      manager.insert(a, Priority.User);
      manager.insert(b, Priority.Plugin);

      const all = manager.getAll();
      expect(all).toHaveLength(2);
      // Ensure modifying result does not mutate manager internal map
      all.pop();
      const all2 = manager.getAll();
      expect(all2).toHaveLength(2);
    });

    // Note: reindexMatcher() not implemented yet - deferred to Phase 2
  });
});
