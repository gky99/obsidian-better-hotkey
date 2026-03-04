# Focus Element Detection in Obsidian

> Investigated via E2E tests against Obsidian v1.12.4 (installer v1.5.8, darwin).
> Test file: `test/e2e/focus-detection.e2e.ts`

## 1. Editor Content (CM6)

When the editor content area is focused, `document.activeElement` is:

```
<div class="cm-content cm-lineWrapping" contenteditable="true" role="textbox">
```

**Detection**:
- `document.activeElement.closest('.cm-content')` → truthy
- `document.activeElement.closest('.cm-editor')` → truthy
- `document.activeElement.getAttribute('contenteditable') === 'true'`
- `document.activeElement.getAttribute('role') === 'textbox'`

**Access from MarkdownView** (via `currentMode` — a private property on MarkdownView):
- **`view.currentMode.editor.containerEl`** = `div.cm-editor` (the CM6 wrapper) ← **primary detection element**
  - Check: `currentMode.editor.containerEl.contains(document.activeElement)`
- `view.currentMode.editor.cm` = CM6 EditorView instance
- `view.currentMode.editor.cm.contentDOM` = `div.cm-content` (the contenteditable div)
- `view.currentMode.editor.cm.dom` = same as `containerEl` (`div.cm-editor`)
- `view.contentEl` = `div.view-content` (parent container)
- `view.containerEl` = `div.workspace-leaf-content` (outermost leaf container)
- `view.currentMode === view.editMode` (true in source/live preview mode)

**`currentMode.editor` instance properties**: `editorComponent`, `cm`, `containerEl`
**`currentMode.editor` prototype methods**: `activeCM`, `init`, `refresh`, `getValue`, `setValue`, `getLine`, `lineCount`, `lastLine`, `getSelection`, `getRange`, `replaceSelection`, `replaceRange`, `getCursor`, `listSelections`, `setSelection`, `setSelections`, `exec`, `focus`, `blur`, `hasFocus`, `getScrollInfo`, `scrollTo`, `scrollIntoView`, `transaction`, `wordAt`, `posToOffset`, `offsetToPos`, `undo`, `redo`, `coordsAtPos`, `posAtCoords`, `addHighlights`, `removeHighlights`, `hasHighlight`, `getAllFoldableLines`, `getFoldOffsets`, `foldLess`, `foldMore`, `insertHorizontalRule`, `insertBlock`, `insertMarkdownLink`, `triggerWikilink`, `clearMarkdownFormatting`, `inTableCell`, `getTableSelection`, `toggleMarkdownFormatting`, `insertTable`, `toggleComment`, `searchCursor`, `getClickableTokenAt`, `insertFootnote`

**Hierarchy**:
```
div.workspace-leaf-content  (view.containerEl)
  └─ div.view-content  (view.contentEl / currentMode.containerEl)
       └─ div.cm-editor.cm-focused  (currentMode.editor.containerEl)
            └─ div.cm-contentContainer
                 └─ div.cm-content.cm-lineWrapping  (currentMode.editor.cm.contentDOM = activeElement)
```

## 2. Editor Search Bar (Find/Replace)

When the search/find bar is focused, `document.activeElement` is:

```
<input type="text" placeholder="Find..." class="">
```

**Detection**:
- `document.activeElement.closest('.document-search-container')` → `"document-search-container"`
- `document.activeElement.closest('.document-search')` → `"document-search"`
- `document.activeElement.closest('.search-input-container')` → `"search-input-container document-search-input"`
- `document.activeElement.closest('.cm-editor')` → **null** (NOT inside CM6)
- `document.activeElement.closest('.cm-content')` → **null** (NOT inside CM6)

**Key fact**: The search bar IS inside `view.containerEl` (confirmed: `view.containerEl.contains(activeElement) === true`), but NOT inside `.cm-editor`. This means the existing `WorkspaceContext.isFocused()` method (which checks `editorEl.contains(activeEl)`) incorrectly returns `true` for both editor content AND search bar.

**Access from MarkdownView** (via `currentMode.search` — a private property):
- **`view.currentMode.search.searchInputEl`** = the find `<input>` ← **primary detection element**
  - Check: `document.activeElement === currentMode.search.searchInputEl`
- **`view.currentMode.search.replaceInputEl`** = `input.document-replace-input`
  - Check: `document.activeElement === currentMode.search.replaceInputEl`
- `view.currentMode.search.searchContainerEl` = `div.document-search-container`
- `view.currentMode.search.containerEl` = `div.markdown-source-view.cm-s-obsidian.mod-cm6` (parent, NOT the search container)
- `view.currentMode.search.isActive` = boolean (whether search bar is currently shown)
- `view.currentMode.search.isReplace` = boolean (whether replace mode is active)
- `view.currentMode.search.scope` = Scope object
- `view.currentMode.search.cursor` = cursor object
- `view.currentMode.search.countEl` = `div.document-search-count`
- `view.currentMode.search.searchButtonContainerEl` = `div.document-search-buttons`
- `view.currentMode.search.editor` = reference to the editor object

**Note**: MarkdownView itself has NO `search` property. The search is only accessible through `currentMode.search`. The search object exists as a property even before `showSearch()` is called, but the DOM elements may not be in the document until the search bar is shown.

**`currentMode.search` prototype methods**: `constructor`, `show`, `hide`, `updateCount`, `onSearchInput`, `findPrevious`, `findNextOrReplace`, `replaceCurrentMatch`, `replaceAll`, `findNext`, `searchAll`, `highlight`, `clear`, `onAltEnter`, `onModAltEnter`

**Hierarchy** (within `view.containerEl`):
```
div.workspace-leaf-content  (view.containerEl)
  └─ div.view-content  (currentMode.containerEl)
       ├─ div.document-search-container  (currentMode.search.searchContainerEl)
       │    └─ div.document-search
       │         ├─ div.search-input-container.document-search-input
       │         │    └─ input[type=text][placeholder="Find..."]  (currentMode.search.searchInputEl = activeElement)
       │         ├─ div.document-search-count  (currentMode.search.countEl)
       │         └─ div.document-search-buttons  (currentMode.search.searchButtonContainerEl)
       └─ div.cm-editor  (currentMode.editor.containerEl, separate from search)
```

## 3. Settings Page

When the settings page is focused, `document.activeElement` varies (e.g., `<a>` tag, `<input>`, etc.) but is always inside:

```
<div class="modal mod-settings mod-sidebar-layout">
```

**Detection**:
- `document.activeElement.closest('.mod-settings')` → truthy
- `document.activeElement.closest('.modal-container')` → `"modal-container mod-dim"`
- `document.activeElement.closest('.modal')` → `"modal mod-settings mod-sidebar-layout"`

**Access from App**:
- `(app as any).setting` — the settings modal instance
- `app.setting.containerEl` → `div.modal-container.mod-dim`
- `app.setting.modalEl` → `div.modal.mod-settings.mod-sidebar-layout`
- `app.setting.contentEl` → `div.modal-content.vertical-tabs-container`
- `app.setting.open()` / `app.setting.close()` — control the modal

**app.setting instance properties**:
`shouldRestoreSelection`, `selection`, `win`, `shouldAnimate`, `dimBackground`, `bgOpacity`, `app`, `scope`, `onWindowClose`, `containerEl`, `bgEl`, `modalEl`, `headerEl`, `titleEl`, `contentEl`, `settingTabs`, `pluginTabs`, `activeTab`, `activeTabCloseable`, `feedbackBanner`, `lastTabId`, `tabContainer`, `corePluginTabHeaderGroup`, `corePluginTabContainer`, `communityPluginTabHeaderGroup`, `communityPluginTabContainer`, `tabHeadersEl`, `tabContentContainer`

**app.setting prototype methods**:
`constructor`, `updateModalTitle`, `addSettingTab`, `removeSettingTab`, `isPluginSettingTab`, `updatePluginSection`, `openTab`, `closeActiveTab`, `openTabById`, `onOpen`, `onClose`, `animateOpen`, `animateClose`

## 4. SuggestModal

Already tracked via prototype patching of `SuggestModal.prototype.open/close`. No DOM detection needed — the proxy captures the open/close lifecycle.

## currentMode Properties (MarkdownSubView)

`view.currentMode` is the currently active mode of the MarkdownView. In source/live preview mode, `currentMode === editMode`.

**Instance properties**: `_loaded`, `_events`, `_children`, `cleanupLivePreview`, `sourceMode`, `cmInit`, `cursorPopupEl`, `tableCell`, `app`, `owner`, `containerEl`, `editorSuggest`, `editorEl`, `cm`, `editor`, `clipboardManager`, `isScrolling`, `cssClasses`, `sizerEl`, `search`, `type`, `requestOnInternalDataChange`, `requestSaveFolds`, `view`, `livePreviewPlugin`, `localExtensions`, `propertiesExtension`

**Key elements**:
| Property | Type | Value |
|---|---|---|
| `containerEl` | HTMLElement | `div.view-content` |
| `editorEl` | HTMLElement | `div.markdown-source-view.cm-s-obsidian.mod-cm6` |
| `editor` | Object | Internal editor wrapper (has `containerEl`, `cm`, `editorComponent`) |
| `search` | Object | Search component (has `searchInputEl`, `searchContainerEl`, etc.) |
| `cm` | Object | CM6 EditorView |

## Architectural Implications

1. **Check at key-event time**: Since the search bar is ephemeral (added/removed dynamically), we cannot rely on `focusin` event listeners. The focus check must happen in the **InputHandler** at the moment a key event is received.

2. **API-based detection** (preferred over CSS selectors):
   - **Editor**: `currentMode.editor.containerEl.contains(document.activeElement)` — checks if focus is inside the CM6 editor wrapper
   - **Search**: `document.activeElement === currentMode.search.searchInputEl` or `document.activeElement === currentMode.search.replaceInputEl`
   - **Settings**: `app.setting.containerEl.contains(document.activeElement)` or `document.activeElement.closest('.mod-settings')`

3. **`WorkspaceContext.isFocused()` is too broad**: It checks `view.containerEl.contains(activeEl)` which returns true for BOTH the editor content AND the search bar. This must be replaced with the more granular detection above.

4. **Search is on `currentMode`, not MarkdownView**: The search bar is accessible via `view.currentMode.search`, not directly on the MarkdownView.
