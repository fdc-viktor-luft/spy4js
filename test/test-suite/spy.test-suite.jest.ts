import { Spy } from '../../src/spy';

const beforeEachSpy = Spy('beforeEach');
Spy.setup({ beforeEach: beforeEachSpy, afterEach: () => {} });

const Guy = {
    swim: () => 'fish',
    goTo: (where: string) => 'go to --> ' + where,
};

describe('Spy - Test-Suite with throwing scoped mock', () => {
    const Guy$Mock = Spy.mock(Guy, 'swim');
    const anotherGuy$Mock = Spy.mock(Guy, 'swim');

    afterEach(() => {
        Spy.restoreAll();
    });

    it('throws an error if scoped mocks can not initialize', () => {
        expect(Guy$Mock.swim).toBeDefined();
        expect(anotherGuy$Mock.swim).toBeDefined();

        beforeEachSpy.getCallArgument(0)(); // does not fail
        expect(() => beforeEachSpy.getCallArgument(1)()).toThrowErrorMatchingInlineSnapshot(`
"Could not initialize mock because:
The objects attribute 'swim' was already spied. Please make sure to spy only once at a time at any attribute."
`);
    });
});

describe('Spy - Test-Suite with throwing scoped mock because of getters only', () => {
    // no type declarations available for "@babel/core"
    const Mock$BabelCore = Spy.mock(require('@babel/core'), 'buildExternalHelpers');

    it('throws an error if scoped mocks can not initialize', () => {
        expect(Mock$BabelCore.buildExternalHelpers).toBeDefined();

        expect(() => beforeEachSpy.getCallArgument(2)()).toThrowError(
            `
Could not initialize mock because:
Cannot set property buildExternalHelpers of [object Object] which has only a getter
Inserting a module mock might should resolve this problem. Run this code beforehand:

jest.mock('<module-name>');

Or if you don't want to mock everything from this module, you can use this:

jest.mock('<module-name>', () => ({ ...jest.requireActual('<module-name>') }));
`.trim()
        );
    });
});
