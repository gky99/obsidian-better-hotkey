// Mock for obsidian module used in tests

export class MarkdownView {}
export class App {}
export class Plugin {}
export class TFile {}
export class Notice {}

export class PluginSettingTab {
    app: App;
    plugin: Plugin;
    containerEl: HTMLElement;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = document.createElement('div');
    }

    display(): void {}
    hide(): void {}
}

/**
 * Mock Setting class with fluent API.
 * Each method returns `this` for chaining.
 */
export class Setting {
    settingEl: HTMLElement;

    constructor(containerEl: HTMLElement) {
        this.settingEl = document.createElement('div');
        containerEl.appendChild(this.settingEl);
    }

    setName(name: string): this {
        this.settingEl.dataset.name = name;
        return this;
    }

    setDesc(desc: string | DocumentFragment): this {
        if (typeof desc === 'string') {
            this.settingEl.dataset.desc = desc;
        }
        return this;
    }

    setHeading(): this {
        this.settingEl.classList.add('setting-heading');
        return this;
    }

    setClass(cls: string): this {
        this.settingEl.classList.add(cls);
        return this;
    }

    addDropdown(cb: (dropdown: MockDropdown) => unknown): this {
        const dropdown = new MockDropdown();
        cb(dropdown);
        return this;
    }

    addText(cb: (text: MockText) => unknown): this {
        const text = new MockText();
        cb(text);
        return this;
    }

    addToggle(cb: (toggle: MockToggle) => unknown): this {
        const toggle = new MockToggle();
        cb(toggle);
        return this;
    }
}

class MockDropdown {
    private _value = '';
    private _onChange: ((value: string) => unknown) | null = null;

    addOption(value: string, _display: string): this {
        return this;
    }
    setValue(value: string): this {
        this._value = value;
        return this;
    }
    getValue(): string {
        return this._value;
    }
    onChange(cb: (value: string) => unknown): this {
        this._onChange = cb;
        return this;
    }
}

class MockText {
    private _value = '';
    private _onChange: ((value: string) => unknown) | null = null;

    setPlaceholder(_placeholder: string): this {
        return this;
    }
    setValue(value: string): this {
        this._value = value;
        return this;
    }
    getValue(): string {
        return this._value;
    }
    onChange(cb: (value: string) => unknown): this {
        this._onChange = cb;
        return this;
    }
}

class MockToggle {
    private _value = false;
    private _onChange: ((value: boolean) => unknown) | null = null;

    setValue(value: boolean): this {
        this._value = value;
        return this;
    }
    getValue(): boolean {
        return this._value;
    }
    onChange(cb: (value: boolean) => unknown): this {
        this._onChange = cb;
        return this;
    }
}

// Utility functions
export function normalizePath(path: string): string {
    return path;
}

// Add other obsidian exports as needed
