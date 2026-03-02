import * as path from 'path';
import { env } from 'process';

const cacheDir = path.resolve('.obsidian-cache');

// Default vault: the obsidian-test-playground that contains this plugin
const defaultVault = path.resolve(import.meta.dirname, 'test/test-vault');

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',
    specs: ['./test/e2e/**/*.e2e.ts'],
    maxInstances: Number(env.WDIO_MAX_INSTANCES || 4),

    capabilities: [
        {
            browserName: 'obsidian',
            browserVersion: 'latest',
            'wdio:obsidianOptions': {
                plugins: ['.'],
                vault: env.OBSIDIAN_VAULT ?? defaultVault,
            },
        },
    ],

    services: ['obsidian'],
    reporters: ['obsidian'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60 * 1000,
    },
    waitforInterval: 250,
    waitforTimeout: 5 * 1000,
    logLevel: 'warn',
    cacheDir: cacheDir,
    injectGlobals: false,
};
