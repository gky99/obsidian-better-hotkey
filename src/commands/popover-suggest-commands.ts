/**
 * Popover Suggest Commands
 * 2 commands for navigating suggestions in PopoverSuggest (inline popovers).
 */

import type { Command } from '../types';
import type { ExecutionContext } from '../components/execution-context/ExecutionContext';
import { POPOVER_SUGGEST_COMMANDS } from '../constants';

export function createPopoverSuggestCommands(): Command[] {
    return [
        {
            id: POPOVER_SUGGEST_COMMANDS.NEXT_OPTION,
            name: 'Popover: Next Suggestion',
            execute(context: ExecutionContext, event: KeyboardEvent) {
                context.popoverSuggestProxy.moveDown(event);
            },
        },
        {
            id: POPOVER_SUGGEST_COMMANDS.PREV_OPTION,
            name: 'Popover: Previous Suggestion',
            execute(context: ExecutionContext, event: KeyboardEvent) {
                context.popoverSuggestProxy.moveUp(event);
            },
        },
    ];
}
