# Settings Tab (Phase 3.5) — Shaping Notes

## Scope

Enhanced settings tab for the Better Hotkey plugin that replaces the basic scaffold settings with an organized, informative UI. Key features:

- **General section**: chord timeout, kill ring max size, status indicator visibility toggle
- **Hotkey bindings section**: read-only sortable table showing all commands and their bindings
- Data sourced from ConfigManager (config format) + CommandRegistry (complete command list)
- User removal logic applied to show effective state
- Plugin-sourced bindings show plugin name

## Decisions

- **Skip preset dropdown** — preset selection deferred to later work
- **Config format for key display** — show `ctrl+k`, `meta+f` (not Emacs `C-k`, `M-f`)
- **Data from ConfigManager, not HotkeyManager** — ConfigManager has hotkeyString in config format; HotkeyManager works in keycode format
- **Show all registered commands** — commands without bindings shown with empty key/when
- **Plugin name in source column** — use `getPluginEntriesWithNames()` instead of generic "Plugin"
- **Status indicator toggle** — hides the status bar element entirely when disabled
- **Column sorting** — clickable headers, resets to default (command name ascending) on each reopen
- **Type assertion for plugin access** — settings tab accesses plugin internals via type assertion (simple, pragmatic)
- **User removal logic** — removed binding with no replacement shows empty binding + "User" source; removed binding with another definition hides the removed one and shows the other

## Context

- **Visuals**: None — standard Obsidian settings patterns
- **References**: Various Complements plugin settings (modular sections, BEM CSS, fluent Setting API)
- **Product alignment**: Provides visibility into active keybindings, supporting power user customization goals
