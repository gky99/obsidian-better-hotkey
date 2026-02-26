# References for Settings Tab

## Similar Implementations

### Various Complements Plugin

- **Location**: External plugin in test vault
- **Relevance**: Sophisticated settings tab with key customization section
- **Key patterns**:
  - Modular section methods (`addMainSettings()`, `addKeyCustomizationSettings()`)
  - `new Setting(containerEl).setHeading().setName("Section")` for section headers
  - BEM-inspired CSS classes with plugin prefix
  - `DocumentFragment` for rich descriptions
  - Fluent/chainable Setting API usage

### Existing Settings Tab

- **Location**: `src/settings.ts`
- **Relevance**: Current implementation to refactor
- **Key patterns**:
  - `PluginSettingTab` extension
  - `containerEl.empty()` + rebuild pattern
  - `addDropdown()`, `addText()` Setting components
  - `plugin.saveSettings()` for persistence
