/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { Spy, SpyInstance } from '../src/spy';
import { beforeEach, afterEach, expect, describe, it } from 'vitest';

Spy.setup({ enforceOrder: false, beforeEach, afterEach, expect });

describe('Spy - Utils', () => {
    class CustomError extends Error {
        constructor(m: string) {
            super(`CustomError('${m}')`);
            Error.captureStackTrace && Error.captureStackTrace(this, CustomError);
            this.name = 'CustomError';
        }
    }

    const errorThrower: any = () => {
        throw new Error('never call this func directly');
    };

    const noop: any = () => {};

    it('should call the Spy and record the call arguments', () => {
        const spy = Spy();
        const someDate = new Date();
        spy(9, 'test', someDate);
        expect(spy.getCallArguments()).toEqual([9, 'test', someDate]);
        // and more general
        spy.wasCalledWith(9, 'test', someDate);
    });

    it('throws an exception that the spy was never called if not called when wasCalledWith or wasCalled gets called', () => {
        const spy = Spy();
        expect(() => spy.wasCalled()).toThrow(/.*was never called!.*/);
        expect(() => spy.wasCalledWith()).toThrow(/.*was never called!.*/);
    });

    it('should place the Spy on an object and record the call arguments', () => {
        const testObject = { someFunc: errorThrower };
        const spy = Spy.on(testObject, 'someFunc');
        const someDate = new Date();
        testObject.someFunc('test', 6, someDate);
        expect(spy.getCallArguments()).toEqual(['test', 6, someDate]);
        // and more general
        spy.wasCalledWith('test', 6, someDate);
    });

    it('is able to mock classes', () => {
        const someModule = {
            TestClass: class {
                dummy: string;
                constructor(dummy: string) {
                    this.dummy = dummy;
                }
            },
        };

        const spy = Spy.on(someModule, 'TestClass').returns({
            dummy: 'bar',
        });

        const someInstance = new someModule.TestClass('foo');

        spy.hasCallHistory('foo');
        expect(someInstance.dummy).toBe('bar');
    });

    it('should throw if trying to spy other attributes than functions', () => {
        const testObject = {
            attrString: 'string',
            attrNumber: 12,
            attrNull: null,
            attrDate: new Date(),
            attrObject: {},
        };
        expect(() => Spy.on(testObject, 'attrString')).toThrow(/.*only spy on functions!.*/);
        expect(() => Spy.on(testObject, 'attrNumber')).toThrow(/.*only spy on functions!.*/);
        expect(() => Spy.on(testObject, 'attrNull')).toThrow(/.*only spy on functions!.*/);
        expect(() => Spy.on(testObject, 'attrDate')).toThrow(/.*only spy on functions!.*/);
        expect(() => Spy.on(testObject, 'attrObject')).toThrow(/.*only spy on functions!.*/);
        expect(() => Spy.on(testObject, 'attrUnknown' as any)).toThrow(/.*only spy on functions!.*/);
    });

    it('should throw if trying to spy on already spied attributes.', () => {
        const testObject = { attr: () => {} };
        const firstSpy = Spy.on(testObject, 'attr');
        // spying again does throw now
        expect(() => Spy.on(testObject, 'attr')).toThrow(/.*was already spied.*/);
        // after restoring the spy, we can spy there again
        firstSpy.restore();
        Spy.on(testObject, 'attr');
    });

    it('throws an exception if getCallArguments gets called with float', () => {
        const spy = Spy();
        spy(123);
        expect(() => spy.getCallArguments(0.5)).toThrow(/.*callNr "0.5" was not valid.*/);
    });

    it('should recognize when the Spy was not called', () => {
        const spy = Spy();
        spy.wasNotCalled();
        spy({ _key: 'test' });
        spy.wasCalledWith({ _key: 'test' });
        expect(() => spy.wasNotCalled()).toThrow(/.*was not expected to be called.*/);
    });

    it('should inspect calls for given arguments of the Spy correctly', () => {
        const spy = Spy();
        const testArg1 = { _key: 'test1' };
        const testArg2 = { _key: 'test2' };
        const testArg3 = { _key: 'test3' };
        spy(testArg1);
        spy(testArg1, testArg2);
        spy(testArg3, testArg2, testArg1);
        spy(testArg2);
        spy.wasCalled();
        expect(() => spy.wasCalled(2)).toThrow();
        spy.wasCalled(4);
        spy.wasCalledWith(testArg1);
        expect(() => spy.wasNotCalledWith(testArg1)).toThrow();
        spy.wasCalledWith(testArg2);
        expect(() => spy.wasNotCalledWith(testArg2)).toThrow();
        spy.wasCalledWith(testArg1, testArg2);
        expect(() => spy.wasNotCalledWith(testArg1, testArg2)).toThrow();
        spy.wasCalledWith(testArg3, testArg2, testArg1);
        expect(() => spy.wasNotCalledWith(testArg3, testArg2, testArg1)).toThrow();
        expect(() => spy.wasCalledWith(testArg3)).toThrow();
        spy.wasNotCalledWith(testArg3);
        expect(() => spy.wasCalledWith(testArg3, testArg2)).toThrow();
        spy.wasNotCalledWith(testArg3, testArg2);
        expect(() => spy.wasCalledWith(testArg3, testArg1, testArg2)).toThrow();
        spy.wasNotCalledWith(testArg3, testArg1, testArg2);
    });

    it('should return call arguments of the Spy correctly', () => {
        const spy = Spy();
        const testArg1 = { _key: 'test1' };
        const testArg2 = { _key: 'test2' };
        const testArg3 = { _key: 'test3' };
        expect(() => spy.getLatestCallArgument()).toThrow(/spy was never called/);
        expect(() => spy.hasProps(testArg1)).toThrow(/spy was never called/);
        spy(testArg1);
        expect(spy.getProps()).toBe(testArg1);
        spy.hasProps(testArg1);
        expect(() => spy.hasProps(testArg2)).toThrow(/But the current props are:\s+{_key: 'test1'}/);
        spy(testArg1, testArg2);
        expect(spy.getProps()).toBe(testArg1);
        expect(spy.getLatestCallArgument(1)).toBe(testArg2);
        spy(testArg3, testArg2, testArg1);
        expect(spy.getProps()).toBe(testArg3);
        spy.hasProps(testArg3);
        expect(spy.getLatestCallArgument(2)).toBe(testArg1);
        spy(testArg2);
        expect(spy.getProps()).toBe(testArg2);
        spy.hasProps(testArg2);

        expect(spy.getCallArguments()).toEqual([testArg1]);
        expect(spy.getCallArguments(0)).toEqual([testArg1]);
        expect(spy.getCallArgument()).toEqual(testArg1);
        expect(spy.getCallArgument(0)).toEqual(testArg1);
        expect(spy.getCallArgument(undefined, 1)).toEqual(undefined);

        expect(spy.getCallArguments(1)).toEqual([testArg1, testArg2]);
        expect(spy.getCallArgument(1)).toEqual(testArg1);
        expect(spy.getCallArgument(1, 1)).toEqual(testArg2);
        expect(spy.getCallArgument(1, 2)).toEqual(undefined);

        expect(spy.getCallArguments(2)).toEqual([testArg3, testArg2, testArg1]);
        expect(spy.getCallArgument(2)).toEqual(testArg3);
        expect(spy.getCallArgument(2, 1)).toEqual(testArg2);
        expect(spy.getCallArgument(2, 2)).toEqual(testArg1);
        expect(spy.getCallArgument(2, 3)).toEqual(undefined);

        expect(spy.getCallArguments(3)).toEqual([testArg2]);
        expect(spy.getCallArgument(3)).toEqual(testArg2);

        expect(spy.getAllCallArguments()).toEqual([
            [testArg1],
            [testArg1, testArg2],
            [testArg3, testArg2, testArg1],
            [testArg2],
        ]);
    });

    it('does return the call count of the Spy correctly', () => {
        const spy = Spy();
        expect(spy.getCallCount()).toEqual(0);
        spy();
        expect(spy.getCallCount()).toEqual(1);
        spy();
        expect(spy.getCallCount()).toEqual(2);
        spy();
        expect(spy.getCallCount()).toEqual(3);
        spy.reset();
        expect(spy.getCallCount()).toEqual(0);
        spy();
        expect(spy.getCallCount()).toEqual(1);
    });

    it('showCallArguments: with diff info', () => {
        const spy = Spy();
        spy('foo');
        spy('bar', 42);
        spy('test');
        expect(spy.showCallArguments([' -> ??? <- ', '\t no way'])).toMatchInlineSnapshot(`
            "call 0: ['foo']
                     -> ??? <- 
            call 1: ['bar', 42]
                    	 no way
            call 2: ['test']
            "
        `);
    });

    it('showCallArguments: without diff info', () => {
        const spy = Spy();
        spy({ _key: 'myTestArguments' });
        spy({ _key: 'someOtherArguments' }, 42);
        expect(spy.showCallArguments()).toMatchInlineSnapshot(`
            "call 0: [{_key: 'myTestArguments'}]
            call 1: [{_key: 'someOtherArguments'}, 42]
            "
        `);
    });

    it('showCallArguments: without calls', () => {
        const spy = Spy();
        expect(spy.showCallArguments()).toBe('the spy was never called!\n');
    });

    it('returns undefined if no return value was supplied', () => {
        const spy = Spy().returns();
        expect(spy('callParams1')).toBe(undefined);
        spy.returns(42);
        expect(spy('callParams2')).toBe(42);
        spy.returns();
        expect(spy('callParams3')).toBe(undefined);
    });

    it('returns given value when the spy gets called', () => {
        const testObj = { _key: 'testObj' };
        const spy = Spy().returns(testObj);
        expect(spy({ _key: 'callParams1' })).toBe(testObj);
        expect(spy({ _key: 'callParams2' })).toBe(testObj);
    });

    it('returns given values sequentially when the spy gets called', () => {
        const testObj1 = { _key: 'testObj1' };
        const testObj2 = { _key: 'testObj2' };
        const testObj3 = { _key: 'testObj3' };
        const spy = Spy().returns(testObj1, testObj2, testObj3);
        expect(spy({ _key: 'callParams1' })).toBe(testObj1);
        expect(spy({ _key: 'callParams2' })).toBe(testObj2);
        expect(spy({ _key: 'callParams3' })).toBe(testObj3);
        expect(spy({ _key: 'callParams4' })).toBe(testObj3);
    });

    it('resolves undefined if no arguments were provided to resolves', async () => {
        const spy = Spy().resolves();

        const p = spy({ _key: 'callParams1' });

        expect(p).toBeInstanceOf(Promise);

        expect(await p).toBe(undefined);
    });

    it('resolves given values sequentially when the spy gets called', async () => {
        const testObj1 = { _key: 'testObj1' };
        const testObj2 = { _key: 'testObj2' };
        const testObj3 = { _key: 'testObj3' };
        const spy = Spy().resolves(testObj1, testObj2, testObj3);

        const p1 = spy({ _key: 'callParams1' });
        const p2 = spy({ _key: 'callParams2' });
        const p3 = spy({ _key: 'callParams3' });
        const p4 = spy({ _key: 'callParams4' });

        expect(p1).toBeInstanceOf(Promise);
        expect(p2).toBeInstanceOf(Promise);
        expect(p3).toBeInstanceOf(Promise);
        expect(p4).toBeInstanceOf(Promise);

        expect(await p1).toBe(testObj1);
        expect(await p2).toBe(testObj2);
        expect(await p3).toBe(testObj3);
        expect(await p4).toBe(testObj3);
    });

    it('fulfills type requirements', async () => {
        const funcs = {
            num: () => 123,
            str: () => 'foo',
            prom: async () => 123n,
            mixed: (arg: string | Promise<number>) => arg,
        };
        Spy.on(funcs, 'num').returns(111).restore();
        // @ts-expect-error
        Spy.on(funcs, 'num').returns('111').restore();
        // @ts-expect-error
        Spy.on(funcs, 'num').rejects().restore();
        // @ts-expect-error
        Spy.on(funcs, 'num').resolves(111).restore();

        // @ts-expect-error
        Spy.on(funcs, 'str').returns(111).restore();
        Spy.on(funcs, 'str').returns('111').restore();
        // @ts-expect-error
        Spy.on(funcs, 'str').rejects().restore();
        // @ts-expect-error
        Spy.on(funcs, 'str').resolves(111).restore();

        // @ts-expect-error
        Spy.on(funcs, 'prom').returns(111n).restore();
        Spy.on(funcs, 'prom').rejects().restore();
        // @ts-expect-error
        Spy.on(funcs, 'prom').resolves(111).restore();
        Spy.on(funcs, 'prom').resolves(111n).restore();

        Spy.on(funcs, 'mixed').returns('111').restore();
        // @ts-expect-error
        Spy.on(funcs, 'mixed').returns(111n).restore();
        Spy.on(funcs, 'mixed').rejects().restore();
        Spy.on(funcs, 'mixed').resolves(111).restore();
        // @ts-expect-error
        Spy.on(funcs, 'mixed').resolves('111').restore();
    });

    it('rejects default error if no arguments were provided to rejects', async () => {
        const spy = Spy().rejects();

        const p = spy({ _key: 'callParams1' });

        expect(p).toBeInstanceOf(Promise);

        await expect(p).rejects.toEqual(new Error('the spy was requested to throw'));
    });

    it('rejects given values sequentially when the spy gets called', async () => {
        const testArg1 = new Error('foo');
        const testArg2 = new CustomError('bar');
        const testArg3 = undefined;
        const testArg4 = 'custom message';
        const spy = Spy().rejects(testArg1, testArg2, testArg3, testArg4);

        const p1 = spy({ _key: 'callParams1' });
        const p2 = spy({ _key: 'callParams2' });
        const p3 = spy({ _key: 'callParams3' });
        const p4 = spy({ _key: 'callParams4' });
        const p5 = spy({ _key: 'callParams5' });

        expect(p1).toBeInstanceOf(Promise);
        expect(p2).toBeInstanceOf(Promise);
        expect(p3).toBeInstanceOf(Promise);
        expect(p4).toBeInstanceOf(Promise);
        expect(p5).toBeInstanceOf(Promise);

        await expect(p1).rejects.toBe(testArg1);
        await expect(p2).rejects.toBe(testArg2);
        await expect(p3).rejects.toEqual(new Error('the spy was requested to throw'));
        await expect(p4).rejects.toEqual(new Error('custom message'));
        await expect(p5).rejects.toEqual(new Error('custom message'));
    });

    it('resets the call arguments', () => {
        const spy = Spy();
        spy('callParams1');
        spy('callParams2');
        spy('callParams3');
        spy.wasCalled(3);
        spy.reset();
        spy.wasNotCalled();
        spy('callParams3');
        spy.wasCalled(1);
    });

    it('throws when called', () => {
        const spy = Spy().throws('errorMessage');
        expect(() => spy({ _key: 'callParams1' })).toThrow(/^errorMessage$/);
        spy.throws();
        expect(() => spy({ _key: 'callParams2' })).toThrow(/.*was requested to throw.*/);
        spy.throws(new Error('foo'));
        expect(() => spy({ _key: 'callParams3' })).toThrow(/^foo$/);
        spy.throws(new CustomError('bar'));
        expect(() => spy({ _key: 'callParams4' })).toThrow(/^CustomError\('bar'\)$/);
    });

    it('should reset the call arguments on an object spy and NOT removing it (LIKE RESTORE)', async () => {
        let resolve: any = null;
        const p = new Promise<undefined>((r) => {
            resolve = r;
        });
        const testObject = {
            func: (allowed: string) => {
                expect(allowed).toEqual('testCall3');
                resolve();
            },
        };
        const spy = Spy.on(testObject, 'func');
        testObject.func('testCall1');

        spy.wasCalledWith('testCall1');
        spy.reset();
        spy.wasNotCalled();

        testObject.func('testCall2');

        spy.wasCalledWith('testCall2');
        expect(() => spy.wasCalledWith('testCall1')).toThrow();

        spy.restore();
        // if this would get spied, the test callback
        // would never be called which would make the test fail
        testObject.func('testCall3');
        await p;
    });

    it('should call NOP if no input-function is supplied', () => {
        const spy = Spy().calls();
        expect(spy('callParams1')).toEqual(undefined);
        spy.calls(() => 42);
        expect(spy('callParams2')).toEqual(42);
        spy.calls();
        expect(spy('callParams3')).toEqual(undefined);
    });

    it('should call the given input-function after the spy was called', () => {
        const testObj = { _key: 'testObj' };
        const spy = Spy().calls((arg: any) => {
            testObj._key = arg;
            return null;
        });
        expect(spy('callParams1')).toEqual(null);
        expect(testObj._key).toEqual('callParams1');
    });

    it('ignores specified arguments when using Spy.IGNORE together with wasCalledWith', () => {
        const testObj = {
            _key: 'some hard to construct and/or uninteresting value',
            prop: 'whatever',
        };
        const spy = Spy();
        spy(testObj, 42);

        spy.wasCalledWith(Spy.IGNORE, Spy.IGNORE); // this is typically non-sense, but test it anyway
        spy.wasCalledWith(Spy.IGNORE, 42);
        spy.wasCalledWith({ _key: Spy.IGNORE, prop: 'whatever' }, 42);
        spy.wasCalledWith({ _key: Spy.IGNORE, prop: 'whatever' }, Spy.IGNORE);
        spy.wasCalledWith({ _key: Spy.IGNORE, prop: Spy.IGNORE }, Spy.IGNORE);
        expect(() => spy.wasCalledWith({ _key: Spy.IGNORE, prop: 'FAILURE' }, Spy.IGNORE)).toThrow();
    });

    it('custom comparison via Spy.COMPARE', () => {
        const testObj = {
            _key: 'some hard to construct but interesting value',
            prop: 'whatever',
        };
        const spy = Spy();
        spy(testObj, 42);

        spy.wasCalledWith(
            Spy.COMPARE(() => true),
            42
        ); // this is the same as using Spy.IGNORE
        spy.wasCalledWith(
            {
                _key: Spy.COMPARE((arg) => typeof arg === 'string'),
                prop: 'whatever',
            },
            42
        );
        spy.wasCalledWith(
            {
                _key: Spy.COMPARE((arg: any) => {
                    expect(arg).toBeTruthy();
                }),
                prop: 'whatever',
            },
            Spy.COMPARE((arg: number) => {
                expect(arg).toBe(42);
            })
        );
        // throw because of incorrect assumption
        expect(() =>
            spy.wasCalledWith(
                {
                    _key: Spy.COMPARE((arg) => typeof arg === 'number'),
                    prop: 'whatever',
                },
                42
            )
        ).toThrow();
        // throw because the comparator did throw
        expect(() =>
            spy.wasCalledWith(
                {
                    _key: Spy.COMPARE((arg: any) => {
                        expect(arg).toBe(undefined);
                    }),
                    prop: 'whatever',
                },
                42
            )
        ).toThrow();
    });

    it('mapper testing via Spy.MAPPER', () => {
        const testMapper = (state: Object, moreState: Object) => ({
            prop: 'foo',
            ...state,
            more: { ...moreState },
        });
        const spy = Spy();
        spy(testMapper, 42);

        spy.wasCalledWith(Spy.MAPPER(undefined, { prop: 'foo', more: {} }), 42);
        spy.wasCalledWith(Spy.MAPPER({ some: 'stuff' }, { prop: 'foo', some: 'stuff', more: {} }), 42);
        spy.wasCalledWith(
            Spy.MAPPER([{ some: 'stuff' }, { more: 'things' }], {
                prop: 'foo',
                some: 'stuff',
                more: { more: 'things' },
            }),
            42
        );
        // throw because of incorrect assumption
        expect(() => spy.wasCalledWith(Spy.MAPPER({ prop: 'stuff' }, { prop: 'foo' }), 42)).toThrow();
    });

    it('should call the given input-functions sequentially after the spy was called', () => {
        const testObj = { _key: 'testObj' };
        const spy = Spy().calls(
            (arg: any) => {
                testObj._key = arg;
                return null;
            },
            (arg: any) => {
                testObj._key = 'some other ' + arg;
                return 42;
            }
        );
        expect(spy('callParams1')).toEqual(null);
        expect(testObj._key).toEqual('callParams1');
        expect(spy('callParams2')).toEqual(42);
        expect(testObj._key).toEqual('some other callParams2');
        expect(spy('callParams3')).toEqual(42);
        expect(testObj._key).toEqual('some other callParams3');
    });

    it('should make the spy transparent (mainly for spies on object properties)', () => {
        const testObject = { someFunc: errorThrower };
        const spy = Spy.on(testObject, 'someFunc').transparent();
        expect(() => testObject.someFunc('test', 6)).toThrow(/^never call this func directly$/);
        spy.wasCalledWith('test', 6);
    });

    it('should make the spy transparent after a certain amount of calls', () => {
        const testObject = { someFunc: errorThrower };
        const spy = Spy.on(testObject, 'someFunc').returns(12, 13).transparentAfter(2);
        expect(testObject.someFunc('test1', 42)).toEqual(12);
        expect(testObject.someFunc('test2')).toEqual(13);
        expect(() => testObject.someFunc('test3', { testProp: 'test' })).toThrow(/^never call this func directly$/);
        expect(() => testObject.someFunc('test4')).toThrow(/^never call this func directly$/);

        spy.wasCalled(4);
        spy.wasCalledWith('test1', 42);
        spy.wasCalledWith('test2');
        spy.wasCalledWith('test3', { testProp: 'test' });
        spy.wasCalledWith('test4');
    });

    it('"hasCallHistory" throws if used for checking "wasNotCalled"', () => {
        const spy = Spy();
        expect(() => spy.hasCallHistory()).toThrow(/Please use 'wasNotCalled'/);
        spy('foo');
        expect(() => spy.hasCallHistory()).toThrow(/the spy was called 1 time/);
    });

    it('checks the call history', () => {
        const testObject = { someFunc: errorThrower };
        const spy = Spy.on(testObject, 'someFunc');
        testObject.someFunc('test1', 42);
        testObject.someFunc();
        testObject.someFunc('test3');
        testObject.someFunc('test4');
        testObject.someFunc(['test5']);

        spy.wasCalled(5);
        expect(() => spy.hasCallHistory(['test1', 42], 'test3', ['test4'], [['test5']])).toThrow(
            /.*the spy on 'someFunc' was called 5 times, but the expected call history includes exactly 4 calls\..*/
        );
        expect(() => spy.hasCallHistory(['test1', 42], [], ['test4'], ['test3'], [['test5']])).toThrow(
            /.*--> 0 \/ different string.*/
        );
        expect(() => spy.hasCallHistory(['test1', 42], 'foo', 'test3', ['test4'], [['test5']])).toThrow(
            /.*--> 0 \/ one was undefined.*/
        );
        expect(() => spy.hasCallHistory(['test1', 42], undefined, 'test3', ['test4'], ['test5'])).toThrow(
            /.*--> 0 \/ different object types: \[object Array] <-> \[object String].*/
        );
        spy.hasCallHistory(['test1', 42], undefined, 'test3', ['test4'], [['test5']]);
    });

    it('should do nothing after for transparent restored spy', () => {
        const testObject = { someFunc: errorThrower };
        const spy = Spy.on(testObject, 'someFunc').transparentAfter(3);
        testObject.someFunc('test1', 42);
        testObject.someFunc();
        testObject.someFunc();
        expect(() => testObject.someFunc('test4')).toThrow(/^never call this func directly$/);
        expect(() => testObject.someFunc('test5')).toThrow(/^never call this func directly$/);

        spy.wasCalled(5);
        spy.wasCalledWith('test1', 42);
        spy.wasCalledWith('test4');
        spy.wasCalledWith('test5');
        spy.wasNotCalledWith('test6');

        spy.restore();

        expect(() => testObject.someFunc('test6')).toThrow(/^never call this func directly$/);

        spy.wasCalled(5);

        expect(spy('test7')).toEqual(undefined);
    });

    /**
     * Test class.
     */
    class TestClass {
        attr: number;
        constructor(attr: number) {
            // eslint-disable-line require-jsdoc
            this.attr = attr;
        }
        equals(other: TestClass): boolean {
            // eslint-disable-line
            // returning true if both attr are odd or both are even
            return !((this.attr - other.attr) % 2);
        }
    }

    const testInstance1 = new TestClass(2);
    const testInstance2 = new TestClass(2);
    const testInstance3 = new TestClass(4);
    const testInstance4 = new TestClass(5);

    it('should use own "equals" implementations as default, but is able to reconfigure this behavior', () => {
        const spy = Spy().configure({ useOwnEquals: true });

        spy(testInstance1);

        // default config
        spy.wasCalledWith(testInstance1);
        spy.wasCalledWith(testInstance2);
        spy.wasCalledWith(testInstance3);
        spy.wasNotCalledWith(testInstance4);

        spy.configure({ useOwnEquals: false });

        // after configuration
        spy.wasCalledWith(testInstance1);
        spy.wasCalledWith(testInstance2);
        spy.wasNotCalledWith(testInstance3);
        spy.wasNotCalledWith(testInstance4);
    });

    it('does override the default behavior for the use of own "equals" implementations. ', () => {
        const testObj1 = { func1: noop };
        const testObj2 = { func2: noop };
        const testObj3 = { func3: noop };
        // still the initial default config
        const defaultSpy1 = Spy('defaultSpy1');
        // using configure without the "useOwnEquals"-config
        // does not effect the behavior
        Spy.configure({});
        const defaultSpy2 = Spy.on(testObj1, 'func1');

        // make the new configuration for all spies
        Spy.configure({ useOwnEquals: false });
        const configuredSpy1 = Spy('configuredSpy1');
        const configuredSpy2 = Spy.on(testObj2, 'func2');

        // configure it back to the initial config
        Spy.configure({ useOwnEquals: true });
        const reconfiguredSpy1 = Spy('reconfiguredSpy1');
        const reconfiguredSpy2 = Spy.on(testObj3, 'func3');

        // call all spies with the same object
        defaultSpy1(testInstance1);
        testObj1.func1(testInstance1);
        configuredSpy1(testInstance1);
        testObj2.func2(testInstance1);
        reconfiguredSpy1(testInstance1);
        testObj3.func3(testInstance1);

        const wasCalledChecksForOwnEquals = (spy: SpyInstance) => {
            // default config
            spy.wasCalledWith(testInstance1);
            spy.wasCalledWith(testInstance2);
            spy.wasCalledWith(testInstance3);
            spy.wasNotCalledWith(testInstance4);
        };

        const wasCalledChecksForNotOwnEquals = (spy: SpyInstance) => {
            // after configuration
            spy.wasCalledWith(testInstance1);
            spy.wasCalledWith(testInstance2);
            spy.wasNotCalledWith(testInstance3);
            spy.wasNotCalledWith(testInstance4);
        };

        wasCalledChecksForNotOwnEquals(defaultSpy1);
        wasCalledChecksForNotOwnEquals(defaultSpy2);

        wasCalledChecksForNotOwnEquals(configuredSpy1);
        wasCalledChecksForNotOwnEquals(configuredSpy2);

        wasCalledChecksForOwnEquals(reconfiguredSpy1);
        wasCalledChecksForOwnEquals(reconfiguredSpy2);
    });

    it('does not allow direct access to the internal properties of each Spy', () => {
        const testObj = { myFunc: () => {} };
        const spy = Spy.on(testObj, 'myFunc');

        const allowedProps = [
            'configure',
            'calls',
            'returns',
            'resolves',
            'rejects',
            'throws',
            'reset',
            'restore',
            'transparent',
            'transparentAfter',
            'addSnapshotSerializer',
            'wasCalled',
            'wasNotCalled',
            'wasCalledWith',
            'wasNotCalledWith',
            'hasCallHistory',
            'getAllCallArguments',
            'getCallArguments',
            'getCallArgument',
            'getLatestCallArgument',
            'getProps',
            'hasProps',
            'getCallCount',
            'showCallArguments',
        ];

        for (let prop in spy) {
            // eslint-disable-line
            let propUnknown = true;
            for (let i = 0; i < allowedProps.length; i++) {
                if (prop === allowedProps[i]) {
                    propUnknown = false;
                }
            }
            if (propUnknown) {
                throw new Error('Received not allowed prop: ' + prop);
            }
        }
    });

    it('does not allow to configure not mocking spies to be persistent', () => {
        const spy = Spy('spy that does not mock any object');

        expect(() => spy.configure({ persistent: true })).toThrow(/.*does not mock any object.*/);
        expect(() => spy.configure({ persistent: false })).toThrow(/.*does not mock any object.*/);
    });

    it('does not allow to restore persistent spies', () => {
        const testObj = { myFunc: () => 'originalFunc' };
        const spy = Spy.on(testObj, 'myFunc').configure({ persistent: true });

        expect(() => spy.restore()).toThrow(/.*was configured to be persistent.*/);

        spy.configure({ persistent: false });
        expect(testObj.myFunc()).toEqual(undefined);

        spy.restore();
        expect(testObj.myFunc()).toEqual('originalFunc');
    });

    it('does not restore persistent spies when restoreAll gets called', () => {
        const testObj = { myFunc1: () => 'func1', myFunc2: () => 'func2' };
        const spy1 = Spy.on(testObj, 'myFunc1').configure({ persistent: true }).returns('spy1');
        Spy.on(testObj, 'myFunc2').returns('spy2');

        expect(testObj.myFunc1()).toEqual('spy1');
        expect(testObj.myFunc2()).toEqual('spy2');

        Spy.restoreAll();

        expect(testObj.myFunc1()).toEqual('spy1');
        expect(testObj.myFunc2()).toEqual('func2');

        spy1.configure({ persistent: false });

        Spy.restoreAll();

        expect(testObj.myFunc1()).toEqual('func1');
        expect(testObj.myFunc2()).toEqual('func2');
    });

    it('resets all spies', () => {
        const [spy1, spy2, spy3] = [Spy(), Spy(), Spy()];

        spy1('foo');
        spy1('bar');

        spy2();

        spy3('foo', ['bar']);

        spy1.wasCalled(2);
        spy2.wasCalled(1);
        spy3.wasCalled(1);

        Spy.resetAll();

        spy1.wasNotCalled();
        spy2.wasNotCalled();
        spy3.wasNotCalled();
    });

    it('overrides the snapshot rendering of spies', () => {
        // skip for "bun test"
        if ((global as any).Bun) return;
        expect(Spy()).toMatchInlineSnapshot('Spy()');
        expect(Spy('foo')).toMatchInlineSnapshot('Spy(foo)');
        const testObj = { func: () => {} };
        const spyOn = Spy.on(testObj, 'func');
        expect(spyOn).toMatchInlineSnapshot('Spy.on(func)');
    });

    it('allows custom snapshot rendering of spies', () => {
        // skip for "bun test"
        if ((global as any).Bun) return;
        const spy = Spy().addSnapshotSerializer((foo) => `Called with ${foo}`);
        expect(spy).toMatchInlineSnapshot('Called with undefined');

        spy('bar');
        expect(spy).toMatchInlineSnapshot('Called with bar');

        spy.addSnapshotSerializer((foo) => `<div>${foo}</div>`);
        expect(spy).toMatchInlineSnapshot('<div>bar</div>');

        spy.addSnapshotSerializer('<div>Fancy</div>');
        expect(spy).toMatchInlineSnapshot('<div>Fancy</div>');
    });

    it('can spy on bound functions (bound to object)', () => {
        const foo = { info: 'waiting', bar: () => {} };
        foo.bar = function (this: typeof foo) {
            throw new Error(this.info);
        }.bind(foo);

        expect(foo.bar).toThrowError('waiting');

        Spy.on(foo, 'bar').returns('spied!' as any);
        expect(foo.bar()).toBe('spied!');
    });

    it('can spy on bound functions (bound to instance)', () => {
        class Foo {
            info = 'waiting';
            bar() {
                throw new Error(this.info);
            }
        }

        const foo = new Foo();
        expect(() => foo.bar()).toThrowError('waiting');

        Spy.on(foo, 'bar').returns('spied!' as any);
        expect(foo.bar()).toBe('spied!');
    });

    it('can spy on bound functions (bound to internal objects)', () => {
        const spy = Spy.on(console, 'error').returns('spied!' as any);
        // eslint-disable-next-line no-console
        expect(console.error('foo')).toBe('spied!');
        spy.hasCallHistory('foo');
    });

    it('can compare self expanding proxy', () => {
        // code that caused the error
        const proxyTarget = {};
        const _dotPrefix = (name: string, prefix = ''): string => (prefix && prefix + '.') + name;
        const _createFieldNameProxy = (pt: any, prefix = ''): any =>
            new Proxy(pt, {
                get(target, prop) {
                    if (prop === 'toString' || typeof prop === 'symbol') return () => prefix;
                    // let the target grow with that property
                    if (!target[prop]) target[prop] = _createFieldNameProxy(pt, _dotPrefix(prop, prefix));
                    return target[prop];
                },
            });

        const spy = Spy();

        spy(_createFieldNameProxy(proxyTarget));

        spy.wasCalledWith(proxyTarget);
        expect(() => spy.wasCalledWith({ foo: 'bar' })).toThrow(/.*{foo: {foo: >CYCLOMATIC<}}.*/);
    });
});
