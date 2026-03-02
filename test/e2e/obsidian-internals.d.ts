import type { App } from 'obsidian';

/**
 * Obsidian's internal App properties used in E2E tests.
 * These are not part of the public API but are stable internals
 * needed for test assertions.
 */
export interface ObsidianAppInternal extends App {
    commands: {
        commands: Record<string, { id: string; name: string }>;
    };
}
