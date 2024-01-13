import { Spy } from '../../src/spy';
import { describe, it, expect } from 'vitest';

const beforeEachSpy = Spy('beforeEach');
Spy.setup({ beforeEach: beforeEachSpy, afterEach: () => {}, expect });

describe('Spy - Test-Suite with throwing scoped mock because of getters only (vitest)', async () => {
    // trying to replace an exported function of an ESM module
    const Mock$Resource = Spy.mock(await import('./spy.test-suite.vitest-resource.mjs' as any), 'foo');

    it('throws an error if scoped mocks can not initialize', () => {
        expect(Mock$Resource.foo).toBeDefined();

        expect(() => beforeEachSpy.getCallArgument(0)()).toThrowError(
            `
Could not initialize mock because:
Cannot set property foo of [object Module] which has only a getter
Inserting a module mock might should resolve this problem. Run this code beforehand:

vi.mock('<module-name>');

Or if you don't want to mock everything from this module, you can use this:

vi.mock('<module-name>', async () => ({ ...((await vi.importActual('<module-name>')) as any) }));
`.trim()
        );
    });
});
