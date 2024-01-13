/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { Spy } from '../../src/spy';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

Spy.setup({ expect, beforeEach, afterEach });

describe('enforceOrder', () => {
    beforeEach(() => {
        Spy.configure({ enforceOrder: true });
    });

    it('check order of made calls', () => {
        const spy = Spy();
        const testArg1 = { _key: 'test1' };
        const testArg2 = { _key: 'test2' };
        spy(testArg1);
        spy(testArg1, testArg2);
        spy(testArg2);
        spy.wasCalled();
        expect(() => spy.wasCalled(1)).toThrow();
        spy.wasCalled(2);
        spy.wasCalled(0);
        spy.wasCalled(0);
        spy.wasNotCalled();
    });

    it('check order of made calls to different spies (success)', () => {
        const spy1 = Spy();
        const spy2 = Spy();

        spy1();
        spy2();

        spy1.wasCalled();
        spy2.wasCalled();
    });

    it('check order of made calls to different spies (fail)', () => {
        const spy1 = Spy();
        const spy2 = Spy();

        spy1();
        spy2();

        spy2.wasCalled();
        expect(() => spy1.wasCalled()).toThrow();
    });

    it('wasCalledWith', () => {
        const spy1 = Spy();
        const spy2 = Spy();

        spy1('foo');
        spy2('bar');

        spy1.wasCalledWith('foo');
        spy1.wasNotCalledWith('foo');
        spy1.wasNotCalled();
        spy2.wasCalledWith('bar');
        expect(() => spy2.wasCalledWith('bar')).toThrow();
    });

    it('hasCallHistory', () => {
        const spy1 = Spy();
        const spy2 = Spy();

        spy1('foo');
        spy2('middle');
        spy1('blub');
        spy2('bar');

        spy1.hasCallHistory('foo', 'blub');
        spy1.wasNotCalled();
        spy2.hasCallHistory('bar');
        spy2.wasNotCalled();
    });

    it('showCallArguments: displays error message in consideration of the ordering', () => {
        const spy = Spy();
        spy('foo');
        spy('bar', 42);
        spy('test');

        spy.wasCalled();

        try {
            spy.wasCalled(3);
        } catch (e) {
            expect((e as Error).message).toMatchInlineSnapshot(`
                "

                the spy was called 2 times, but there were expected 3 calls.

                Actually there were:

                call -1: ['foo']
                        !!! was called earlier (#enforceOrder)
                call 0: ['bar', 42]
                call 1: ['test']
                "
            `);
        }

        try {
            spy.wasCalledWith('foo');
        } catch (e) {
            expect((e as Error).message).toMatchInlineSnapshot(`
                "

                the spy was expected to be called with the following arguments:

                    --> ['foo']

                Actually there were:

                call -1: ['foo']
                        !!! was called earlier (#enforceOrder)
                call 0: ['bar', 42]
                        --> 0 / different string ['bar' != 'foo']
                call 1: ['test']
                        --> 0 / different string ['test' != 'foo']
                "
            `);
        }

        try {
            spy.hasCallHistory('foo', 'test');
        } catch (e) {
            expect((e as Error).message).toMatchInlineSnapshot(`
                "

                the spy was expected to be called with the following arguments in the given order:

                call 0: ['foo']
                call 1: ['test']

                Actually there were:

                call -1: ['foo']
                        !!! was called earlier (#enforceOrder)
                call 0: ['bar', 42]
                        --> 0 / different string ['bar' != 'foo']
                call 1: ['test']
                "
            `);
        }

        try {
            spy.wasNotCalled();
        } catch (e) {
            expect((e as Error).message).toMatchInlineSnapshot(`
                "

                the spy was not expected to be called, but was called 2 times.

                Actually there were:

                call -1: ['foo']
                        !!! was called earlier (#enforceOrder)
                call 0: ['bar', 42]
                call 1: ['test']
                "
            `);
        }

        try {
            spy.wasNotCalledWith('test');
        } catch (e) {
            expect((e as Error).message).toMatchInlineSnapshot(`
                "

                the spy was called unexpectedly with the following arguments:

                    --> ['test']

                "
            `);
        }
    });
});
