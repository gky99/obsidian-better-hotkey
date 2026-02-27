/**
 * Input Handler Component
 * Responsibility: Main orchestrator of the hotkey pipeline - captures global keyboard events
 * via Obsidian's Scope API, normalizes to internal representation, feeds to ChordSequenceBuffer,
 * calls Matcher, executes commands, and decides event propagation.
 * Based on ADR-005: Event Interception Strategy
 */

import type { KeyPress, MatchResult } from '../types';
import type { HotkeyContext } from './hotkey-context/HotkeyContext';
import type { Plugin, App, KeymapEventHandler, KeymapContext } from 'obsidian';
import { Scope } from 'obsidian';
import { CommandRegistry } from './CommandRegistry';
import { ExecutionContext } from './execution-context/ExecutionContext';
import { contextEngine } from './ContextEngine';
import { keyboardLayoutService } from './KeyboardLayoutService';
import { CONTROL_COMMANDS, CONTEXT_KEYS } from '../constants';

export class InputHandler {
    // Hotkey context (passed from main.ts)
    private hotkeyContext: HotkeyContext;

    // Execution context (created internally)
    private executionContext: ExecutionContext;

    // External dependencies
    private commandRegistry: CommandRegistry;

    // Plugin instance for lifecycle management
    private plugin: Plugin;

    // App instance for Scope API access
    private app: App;

    // Scope API state
    private scope: Scope | null = null;
    private scopeHandler: KeymapEventHandler | null = null;

    constructor(
        commandRegistry: CommandRegistry,
        hotkeyContext: HotkeyContext,
        plugin: Plugin,
    ) {
        this.commandRegistry = commandRegistry;
        this.hotkeyContext = hotkeyContext;
        this.plugin = plugin;
        this.app = plugin.app;

        // Create execution context
        this.executionContext = new ExecutionContext(this.plugin);
    }

    /**
     * Begin intercepting keyboard events via Obsidian's Scope API.
     * Creates a Scope with app.scope as parent (for fallthrough),
     * registers a catch-all handler, and pushes onto the keymap stack.
     */
    start(): void {
        this.scope = new Scope(this.app.scope);
        this.scopeHandler = this.scope.register(
            null,
            null,
            this.handleScopeEvent.bind(this),
        );
        this.app.keymap.pushScope(this.scope);
        this.plugin.register(() => this.stop());
    }

    /**
     * Stop intercepting keyboard events. Pops our scope from the keymap stack.
     */
    stop(): void {
        if (this.scope) {
            this.app.keymap.popScope(this.scope);
            this.scope = null;
            this.scopeHandler = null;
        }
    }

    /**
     * Scope event handler — called by Obsidian's keymap dispatch.
     * Returns false to suppress (Obsidian auto-calls preventDefault),
     * returns undefined to pass through to Obsidian's normal processing.
     */
    private handleScopeEvent(
        event: KeyboardEvent,
        ctx: KeymapContext,
    ): false | undefined {
        try {
            const keyPress = this.normalize(event);

            // Step 1: Skip if only modifier key pressed
            if (this.isOnlyModifier(keyPress)) {
                return;
            }

            // Step 2: Check for escape key (clears chord sequence)
            if (this.hotkeyContext.hotkeyMatcher.isEscape(keyPress)) {
                this.hotkeyContext.chordBuffer.clear();
                this.hotkeyContext.statusIndicator.clear();
                return;
            }

            // Step 3: Add to chord buffer
            const sequence = this.hotkeyContext.chordBuffer.append(keyPress);

            // Step 4: Match against registered hotkeys
            const matchResult =
                this.hotkeyContext.hotkeyMatcher.match(sequence);

            // Step 5: Handle match result
            return this.handleMatchResult(matchResult, sequence);
        } catch (error) {
            console.error('InputHandler error:', error);
            this.hotkeyContext.chordBuffer.clear();
            this.hotkeyContext.statusIndicator.clear();
            return;
        }
    }

    /**
     * Handle different match result types.
     * Returns false to suppress the event, undefined to pass through.
     */
    private handleMatchResult(
        result: MatchResult,
        sequence: KeyPress[],
    ): false | undefined {
        switch (result.type) {
            case 'exact': {
                // Execute command with execution context
                this.commandRegistry.execute(
                    result.entry.command,
                    result.entry.args,
                    this.executionContext,
                );

                // Clear chord buffer and status
                this.hotkeyContext.chordBuffer.clear();
                this.hotkeyContext.statusIndicator.clear();

                // Track lastActionWasYank flag using ExecutionContext's killRing
                this.executionContext.killRing.updateLastActionWasYank(
                    result.entry.command,
                );

                // TODO: Phase 3+ — consider optimizing this per-command check (e.g., command metadata flags)
                // Reset recenter cycle if command is not recenter-top-bottom
                if (
                    result.entry.command !==
                    CONTROL_COMMANDS.RECENTER_TOP_BOTTOM
                ) {
                    contextEngine.setContext(
                        CONTEXT_KEYS.RECENTER_CYCLE_POSITION,
                        0,
                    );
                }

                return false; // Suppress — Obsidian auto-preventDefault
            }

            case 'prefix': {
                // Waiting for next key - show pending status
                this.hotkeyContext.statusIndicator.showPending(sequence);
                // Sequence is already stored in chord buffer from step 3
                return false; // Suppress — waiting for next key in chord
            }

            case 'none': {
                // Clear buffer and status
                this.hotkeyContext.chordBuffer.clear();
                this.hotkeyContext.statusIndicator.clear();

                if (result.isChord) {
                    return false; // Suppress — consumed by chord system
                }
                return; // Pass through — normal typing
            }
        }
    }

    /**
     * Check if only modifier key pressed (no action key)
     */
    private isOnlyModifier(keyPress: KeyPress): boolean {
        const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
        return modifierKeys.includes(keyPress.key);
    }

    /**
     * Convert browser KeyboardEvent to internal KeyPress representation.
     * Uses Keyboard Layout Service to derive display key from physical code,
     * bypassing OS-level character transformations (e.g., macOS Option key).
     * The key field is for display only (status indicator); matching uses code.
     */
    private normalize(event: KeyboardEvent): KeyPress {
        const modifiers = new Set<'ctrl' | 'alt' | 'shift' | 'meta'>();

        if (event.ctrlKey) modifiers.add('ctrl');
        if (event.altKey) modifiers.add('alt');
        if (event.shiftKey) modifiers.add('shift');
        if (event.metaKey) modifiers.add('meta');

        const { code } = event;

        // Layout-aware normalization: derive display key from physical code
        // For letter/symbol keys: layout service returns base char (e.g., "a", "[")
        // For special keys (Escape, Enter, etc.): returns null, use event.key
        const key = keyboardLayoutService.getBaseCharacter(code) ?? event.key;

        return { modifiers, key, code };
    }
}
