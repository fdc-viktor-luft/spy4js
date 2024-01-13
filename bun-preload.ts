import { Spy } from './src/spy';
import { beforeEach, afterEach, expect } from 'vitest';

// necessary until Bun has implemented them
expect.addSnapshotSerializer = () => null;
expect.getState = () => ({}) as any;

// only necessary when functionality is used but still missing in Bun
expect.extend({
    toMatchInlineSnapshot: function (actual, match) {
        const padding = match.includes('\n') ? ' '.repeat(match.substring(1).indexOf('"')) : '';
        const pass = match.trim().slice(1, -1).replaceAll(padding, '') === actual;
        if (pass) {
            return {
                message: () =>
                    `expected ${this.utils.printReceived(actual)} not to match ${this.utils.printExpected(match)}`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${this.utils.printReceived(actual)} to match ${this.utils.printExpected(match)}`,
                pass: false,
            };
        }
    },
});

// ATTENTION: Calling "setup" here with "beforeEach" will break the scoping of the mocks currently
Spy.setup({ beforeEach, afterEach, expect });
