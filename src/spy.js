/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 * @flow
 */

import {
    COMPARE,
    differenceOf,
    forEach,
    IGNORE,
    type OptionalMessageOrError,
    toError,
} from './utils';
import { SpyRegistry } from './registry';
import { serialize } from './serializer';
import { createMock, initMocks } from './mock';
import { configureTestSuite } from './test-suite';

/**
 *
 * Instantiating the SpyRegistry to handle all
 * mocked object relative information and
 * restore their functionality if requested.
 *
 */
const registry = new SpyRegistry();

let __LOCK__ = true;

/**
 * Those symbols are used to protect the private spy properties from outer manipulation by mistake.
 */
const Symbols: any = {
    name: Symbol('__Spy_name__'),
    snap: Symbol('__Spy_snap__'),
    isSpy: Symbol('__Spy_isSpy__'),
    func: Symbol('__Spy_func__'),
    calls: Symbol('__Spy_calls__'),
    config: Symbol('__Spy_config__'),
    index: Symbol('__Spy_index__'),
};

/**
 * Very jest specific snapshot serialization behaviour.
 *
 * Hint: We are casting here anything to any, because not all users might
 * have typed those functions correctly and should not see flow errors
 * related to those types.
 */
(expect: any) &&
    (expect.addSnapshotSerializer: any) &&
    (expect.addSnapshotSerializer: any)({
        test: v => v && v[Symbols.isSpy],
        print: spy => spy[Symbols.snap],
    });

/**
 * Initial default settings for every
 * spy instance. Can be modified only
 * implicitly by "Spy.configure".
 *
 * @type {{useOwnEquals: boolean}}
 */
const DefaultSettings = {
    useOwnEquals: true,
};

export type SpyInstance = {
    (...any[]): any,
    configure: (config: {
        useOwnEquals?: boolean,
        persistent?: boolean,
    }) => SpyInstance,
    calls: (...funcs: Array<Function>) => SpyInstance,
    returns: (...args: Array<any>) => SpyInstance,
    resolves: (...args: Array<any>) => SpyInstance,
    rejects: (...msgOrErrors: Array<OptionalMessageOrError>) => SpyInstance,
    throws: (msgOrError: OptionalMessageOrError) => SpyInstance,
    reset: () => SpyInstance,
    restore: () => SpyInstance,
    transparent: () => SpyInstance,
    transparentAfter: (callCount: number) => SpyInstance,
    wasCalled: (callCount?: number) => void,
    hasCallHistory: (...callHistory: Array<Array<any> | any>) => void,
    wasNotCalled: () => void,
    wasCalledWith: (...args: Array<any>) => void,
    wasNotCalledWith: (...args: Array<any>) => void,
    getCallArguments: (callNr?: number) => Array<any>,
    getCallArgument: (callNr?: number, argNr?: number) => any,
    getCallCount: () => number,
    showCallArguments: (additionalInformation?: Array<string>) => string,
};

const SpyFunctions = {
    /**
     * Configures this spy behaviour in a special
     * way. Passing in an object that contains
     * meaningful attributes can configure:
     *
     * - useOwnEquals:boolean -> toggles the usage of own
     *                           implementation of "equals"
     *                           matcher, e.g. for comparing
     *                           call params with "wasCalledWith".
     *
     * - persistent:boolean -> toggles the persistence of the spy.
     *                         I.e. making it restorable or not.
     *                         Throws for not mocking spies.
     *
     * @param {Object} config <- An object containing attributes
     *                         for special configuration
     * @return {SpyInstance} <- BuilderPattern.
     */
    configure(config: {
        useOwnEquals?: boolean,
        persistent?: boolean,
    }): SpyInstance {
        if (config.useOwnEquals !== undefined) {
            this[Symbols.config].useOwnEquals = config.useOwnEquals;
        }
        if (config.persistent !== undefined) {
            if (!this[Symbols.index]) {
                throw new Error(
                    `\n\n${this[Symbols.name]} can not` +
                        ' be configured to be persistent!' +
                        ' It does not mock any object.'
                );
            }
            this[Symbols.config].persistent = config.persistent;
            registry.persist(
                this[Symbols.index],
                this[Symbols.config].persistent
            );
        }
        return this;
    },

    /**
     * Accepts multiple functions. If called more often,
     * calling always the last supplied function.
     *
     * @param {Array<Function>} funcs
     *     -> The iterative provided functions
     *        can be accessed as array.
     *        And will be called one by one
     *        for each made call on the spy.
     *
     * @return {SpyInstance} <- BuilderPattern.
     */
    calls(...funcs: Array<Function>): SpyInstance {
        if (funcs.length === 0) {
            // no arguments provided
            this[Symbols.func] = () => {};
            return this;
        }

        const max = funcs.length - 1;
        let counter = -1;

        this[Symbols.func] = (...args: Array<any>) => {
            counter++;
            return funcs[max < counter ? max : counter](...args);
        };

        return this;
    },

    /**
     * Accepts multiple return values. If called more often,
     * returns always the last supplied return value.
     *
     * @param {Array<any>} args -> The iterative provided arguments
     *                             can be accessed as array.
     *                             And will be returned one by one
     *                             for each made call.
     *
     * @return {SpyInstance} <- BuilderPattern.
     */
    returns(...args: Array<any>): SpyInstance {
        return this.calls(...args.map(arg => () => arg));
    },

    /**
     * Accepts multiple values, which will be resolved sequentially.
     * If called more often, resolves always the last supplied value.
     *
     * @param {Array<any>} args -> The iterative provided arguments
     *                             can be accessed as array.
     *                             And will be resolved one by one
     *                             for each made call.
     *
     * @return {SpyInstance} <- BuilderPattern.
     */
    resolves(...args: Array<any>): SpyInstance {
        return this.returns(
            ...(args.length ? args : [undefined]).map(arg =>
                Promise.resolve(arg)
            )
        );
    },

    /**
     * Accepts multiple values, which will be rejected sequentially.
     * If called more often, rejects always the last supplied value.
     *
     * @param {Array<OptionalMessageOrError>} msgOrErrors
     *              -> The iterative provided arguments
     *                 can be accessed as array.
     *                 And will be rejected one by one
     *                 for each made call.
     *
     * @return {SpyInstance} <- BuilderPattern.
     */
    rejects(...msgOrErrors: Array<OptionalMessageOrError>): SpyInstance {
        return this.calls(
            ...(msgOrErrors.length ? msgOrErrors : [undefined]).map(
                msgOrError => () =>
                    Promise.reject(toError(msgOrError, this[Symbols.name]))
            )
        );
    },

    /**
     * Will make the spy throw an Error, if called next time.
     * The error message can be provided as parameter.
     *
     * @param {OptionalMessageOrError} msgOrError -> Will be the error message.
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    throws(msgOrError: OptionalMessageOrError): SpyInstance {
        this[Symbols.func] = () => {
            throw toError(msgOrError, this[Symbols.name]);
        };
        return this;
    },

    /**
     * Deletes all notices of made calls with this spy.
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    reset(): SpyInstance {
        this[Symbols.calls] = [];
        return this;
    },

    /**
     * Restores the last by this spy manipulated object
     * and removes this special mock.
     *
     * Restoring objects does not disable any
     * other behaviours/features of the spies.
     *
     * If the spy was configured persistent, than this
     * method will throw an exception.
     *
     * Other than "Spy.restoreAll" this method only removes
     * a maximum of one mock.
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    restore(): SpyInstance {
        if (this[Symbols.config].persistent) {
            throw new Error(
                `\n\n${this[Symbols.name]} can not be restored!` +
                    ' It was configured to be persistent.'
            );
        }
        registry.restore(this[Symbols.index]);
        return this;
    },

    /**
     * Makes the spy behave like the mocked
     * function. If no function was mocked by
     * this spy, it will do nothing if called.
     *
     * This function works exactly like
     * spy.transparentAfter(0).
     *
     * For example:
     * const spy = Spy.on(someObject, 'someFunc');
     * someObject.someFunc(); // calls only the spy
     * spy.transparent();
     * someObject.someFunc(); // behaves like calling the original method
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    transparent(): SpyInstance {
        return this.transparentAfter(0);
    },

    /**
     * If called with n as callCount this will make
     * the spy call the mocked function after called
     * the n'th time. For any spy that does not mock
     * any objects attribute, this will make the spy
     * do nothing if called after the n'th time.
     *
     * If the mocked function will get called again,
     * the made calls will still be registered.
     *
     * For example:
     * Spy.on(someObject, 'someFunc').transparentAfter(2);
     * someObject.someFunc(); // calls only the spy
     * someObject.someFunc(); // calls only the spy
     * someObject.someFunc(); // behaves like calling the original method
     *
     * @param {number} callCount <- The number after which the mocked function
     *                              should be called again.
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    transparentAfter(callCount: number): SpyInstance {
        const oldFunc = this[Symbols.func];
        this[Symbols.func] = (...args) => {
            // before the function call is executed,
            // the call arguments were already saved
            // -> so we are interested if the made calls
            //    are more than the call count were we
            //    need to modify the behavior
            if (this[Symbols.calls].length > callCount) {
                const originalMethod = registry.getOriginalMethod(
                    this[Symbols.index]
                );
                if (originalMethod) {
                    return originalMethod(...args);
                }
                return;
            }
            return oldFunc(...args);
        };
        return this;
    },

    /**
     * Checks if the spy was called callCount times often.
     *
     * If callCount is not provided then it only
     * checks if the spy was called at least once.
     *
     * Throws an error if the expectation is wrong.
     *
     * @param {?number} callCount -> Is the number of expected calls made.
     */
    wasCalled(callCount?: number) {
        const madeCalls = this[Symbols.calls].length;
        if (typeof callCount === 'number') {
            if (madeCalls !== callCount) {
                throw new Error(
                    `\n\n${this[Symbols.name]} was called ${madeCalls} times,` +
                        ` but there were expected ${callCount} calls.\n\n` +
                        'Actually there were:\n\n' +
                        this.showCallArguments()
                );
            }
        } else if (madeCalls === 0) {
            throw new Error(`\n\n${this[Symbols.name]} was never called!\n\n`);
        }
    },

    /**
     * Checks if the spy was call history matches the expectation.
     *
     * The call history has to match the call count and order.
     * Single arguments will be automatically wrapped as array, e.g.:
     *            1, 2, 3 -> [1], [2], [3]
     * ** Inspired by jest test.each **
     *
     * Throws an error if the expectation is wrong.
     *
     * @param {Array<Array<any> | any>} callHistory
     *          -> Are the expected made call arguments in correct order.
     */
    hasCallHistory(...callHistory: Array<Array<any> | any>): void {
        const madeCalls = this[Symbols.calls];
        const callCount = callHistory.length;
        if (madeCalls.length !== callCount) {
            throw new Error(
                `\n\n${this[Symbols.name]} was called ${
                    madeCalls.length
                } times,` +
                    ` but the expected call history includes exactly ${
                        callHistory.length
                    } calls.\n\n` +
                    'Actually there were:\n\n' +
                    this.showCallArguments()
            );
        }
        const modifiedCallHistory = callHistory.map(arg =>
            Array.isArray(arg) ? arg : [arg]
        );
        let hasErrors = false;
        const diffInfo = madeCalls.map((call, index) => {
            const diff = differenceOf(
                call.args,
                modifiedCallHistory[index],
                this[Symbols.config]
            );
            if (diff) hasErrors = true;
            return diff;
        });
        if (hasErrors)
            throw new Error(
                `\n\n${this[Symbols.name]} was considered` +
                    ' to be called with the following arguments in the given order:\n\n' +
                    `${modifiedCallHistory
                        .map(
                            (entry, index) =>
                                `call ${index}: ${serialize(entry)}`
                        )
                        .join('\n')}\n\n` +
                    'Actually there were:\n\n' +
                    this.showCallArguments(diffInfo)
            );
    },

    /**
     * Checks that the spy was never called.
     * Throws an error if the spy was called at least once.
     */
    wasNotCalled(): void {
        const madeCalls = this[Symbols.calls];
        if (madeCalls.length !== 0) {
            throw new Error(
                `\n\n${this[Symbols.name]} was not` +
                    ' considered to be called.\n\n' +
                    'Actually there were:\n\n' +
                    this.showCallArguments()
            );
        }
    },

    /**
     * Checks if the spy was called with the provided arguments.
     *
     * Throws an error if the expectation is wrong.
     *
     * For example:
     * const spy = new Spy();
     * spy(arg1, arg2, arg3);
     * spy(arg4, arg5);
     * spy.wasCalledWith(arg1, arg2, arg3); // no error
     * spy.wasCalledWith(arg4, arg5); // no error
     * spy.wasCalledWith(arg1); // error!!!
     *
     * @param {Array<any>} args -> The expected arguments
     *                           for any made call.
     */
    wasCalledWith(...args: Array<any>): void {
        const madeCalls = this[Symbols.calls];
        if (madeCalls.length === 0) {
            throw new Error(`\n\n${this[Symbols.name]} was never called!\n\n`);
        }
        const diffInfo = [];
        for (let i = 0; i < madeCalls.length; i++) {
            const diff = differenceOf(
                madeCalls[i].args,
                args,
                this[Symbols.config]
            );
            if (!diff) {
                return;
            }
            diffInfo.push(diff);
        }
        throw new Error(
            `\n\n${this[Symbols.name]} was considered` +
                ' to be called with the following arguments:\n\n' +
                `    --> ${serialize(args)}\n\n` +
                'Actually there were:\n\n' +
                this.showCallArguments(diffInfo)
        );
    },

    /**
     * Checks if the spy was NOT called with the provided arguments.
     * This method checks the direct opposite of the method
     * spy.wasCalledWith.
     *
     * It throws an error if the upper method would not.
     *
     * For example:
     * const spy = new Spy();
     * spy(arg1, arg2, arg3);
     * spy(arg4, arg5);
     * spy.wasCalledWith(arg1); // no error
     * spy.wasCalledWith(arg4, arg3); // no error
     * spy.wasCalledWith(arg4, arg5); // error!!!
     *
     * @param {Array<any>} args -> The not expected arguments
     *                             for any made call.
     */
    wasNotCalledWith(...args: Array<any>) {
        let errorOccurred = false;
        try {
            this.wasCalledWith(...args);
        } catch (e) {
            errorOccurred = true;
        }
        if (!errorOccurred) {
            throw new Error(
                `\n\n${this[Symbols.name]} was called` +
                    ' unexpectedly with the following arguments:\n\n' +
                    `    --> ${serialize(args)}\n\n`
            );
        }
    },

    /**
     * This method returns the call arguments of the
     * n'th made call as array. If less than n calls were made,
     * it will throw an error.
     *
     * By default n = 1. This corresponds to callNr = 0.
     *
     * For example:
     * const spy = new Spy();
     * spy(arg1, arg2, arg3);
     * spy.getCallArguments(); // returns [arg1, arg2, arg3]
     *
     * @param {number} callNr -> represents the callNr for which
     *                           the call argument should be returned.
     *
     * @return {Array<any>} -> the call arguments of the (callNr + 1)'th call.
     */
    getCallArguments(callNr: number = 0): Array<any> {
        const madeCalls = this[Symbols.calls];
        if (callNr % 1 !== 0 || callNr >= madeCalls.length) {
            throw new Error(
                `\n\nThe provided callNr "${callNr}" was not valid.\n\n` +
                    `Made calls for ${this[Symbols.name]}:\n\n` +
                    this.showCallArguments()
            );
        }
        return madeCalls[callNr].args;
    },

    /**
     * This method returns the m'th call argument of the
     * n'th made call. If less than n calls were made, it will throw
     * an error.
     *
     * By default n = 1. This corresponds to callNr = 0.
     * By default m = 1. This corresponds to argNr = 0.
     *
     * For example:
     * const spy = new Spy();
     * spy(arg1, arg2, arg3);
     * spy(arg4, arg5, arg6);
     * spy.getCallArgument() === arg1; // true
     * spy.getCallArgument(1) === arg4; // true
     * spy.getCallArgument(0, 2) === arg3; // true
     * spy.getCallArgument(1, 1) === arg5; // true
     *
     * spy.getCallArgument(1, 5) === undefined; // true
     * spy.getCallArgument(2); // throws an exception
     *
     * @param {number} callNr -> represents the callNr for which
     *                           a call argument should be returned.
     * @param {number} argNr -> represents position of the argument
     *                          when the corresponding call was made.
     *
     * @return {any} -> the (argNr + 1)'th call argument
     *                  of the (callNr + 1)'th call.
     */
    getCallArgument(callNr: number = 0, argNr: number = 0): any {
        return this.getCallArguments(callNr)[argNr];
    },

    /**
     * This method returns the number of made calls on the spy.
     *
     * @return {number} -> the number of made calls.
     */
    getCallCount(): number {
        return this[Symbols.calls].length;
    },

    /**
     * This method returns a formatted text string for debugging
     * made calls with the given Spy. It is used also internally
     * if some wrong assertions were made on the Spy.
     * Some sample:
     *
     * call 0: [{"_key":"test1"}]
     * call 1: [{"_key":"test1"},{"_key":"test2"}]
     * call 2: [{"_key":"test3"},{"_key":"test2"},{"_key":"test1"}]
     * call 3: [{"_key":"test2"}]
     *
     * If an array of strings is provided, the given strings will
     * be printed just below params of each call.
     *
     * Some sample: additionalInformation = [
     *     '-> 0 / _key / different string',
     *     '-> 1 / _key / different object types'
     * ]
     *
     * call 0: [{"_key":"test1"}]
     *         -> 0 / _key / different string
     * call 1: [{"_key":"test1"},{"_key":"test2"}]
     *         -> 1 / _key / different object types
     * call 2: [{"_key":"test3"},{"_key":"test2"},{"_key":"test1"}]
     * call 3: [{"_key":"test2"}]
     *
     * @param {Array<string>} additionalInformation
     *      -> will be displayed below each call information
     *         as additional information.
     *
     * @return {string} -> The information about made calls.
     */
    showCallArguments(additionalInformation: Array<string> = []): string {
        const madeCalls = this[Symbols.calls];
        if (madeCalls.length === 0) {
            return `${this[Symbols.name]} was never called!\n`;
        }
        let response = '';
        for (let i = 0; i < madeCalls.length; i++) {
            const args = serialize(madeCalls[i].args);
            response += `call ${i}: ${args}\n`;
            if (additionalInformation[i]) {
                response += `        ${additionalInformation[i]}\n`;
            }
        }
        return response;
    },
};

const AllCreatedSpies: Array<SpyInstance> = [];

class Spy {
    /**
     * This constructor does instantiate a new spy
     * object.
     *
     * This spy is callable.
     * It does inherit all Spy specific methods below.
     * It holds additional (private) fields:
     * _name:string -> Will be displayed in all displayed
     *                 error messages.
     * _isSpy:boolean -> Always true for spies.
     * _func:Function -> The internal function, that will
     *                   actually we called, when calling
     *                   the spy.
     * _calls:Array<{arguments:Array<any>}>
     *     -> Stores the arguments with whom the spy was called.
     *        Each call adds another entry in the calls array.
     * _config = {useOwnEquals: boolean} -> internal spy config.
     *
     *
     * @param {string} name -> the identifier of the spy.
     *                       Useful for debugging issues.
     * @param {string} __mock -> DO NOT USE.
     *
     * @constructor
     */
    constructor(name: string = '', __mock: any): SpyInstance {
        const spy: any = function(...args: Array<any>) {
            spy[Symbols.calls].push({ args });
            return spy[Symbols.func](...args);
        };
        if (__mock && !__LOCK__) {
            spy[Symbols.index] = registry.push(__mock.obj, __mock.methodName);
            spy[Symbols.name] = `the spy on '${name}'`;
            spy[Symbols.snap] = `Spy.on(${name})`;
        } else {
            spy[Symbols.index] = null;
            spy[Symbols.name] = name || 'the spy';
            spy[Symbols.snap] = `Spy(${name})`;
        }
        spy[Symbols.isSpy] = true;
        spy[Symbols.func] = () => {};
        spy[Symbols.calls] = [];
        spy[Symbols.config] = { useOwnEquals: DefaultSettings.useOwnEquals };
        forEach(SpyFunctions, (key, value) => {
            spy[key] = value;
        });
        AllCreatedSpies.push(spy);
        return (spy: SpyInstance);
    }

    /**
     * This static method can be used to configure
     * the default behaviour of created spy instances.
     * The most suited place where you could configure
     * spy4js is the "setupTests"-File, which runs
     * before each test suite.
     *
     * For example,
     *
     * Spy.configure({useOwnEquals: false});
     *
     * would initially configure every spy to not
     * favor own "equals" implementation while
     * comparing any objects.
     *
     * You may also override default test suite hooks
     * by providing afterEach or beforeEach respectively.
     *
     * @param {Object} config <- Holds the configuration params.
     */
    static configure(config: {
        useOwnEquals?: boolean,
        afterEach?: string => void,
        beforeEach?: string => void,
    }): void {
        if (config.useOwnEquals !== undefined) {
            DefaultSettings.useOwnEquals = config.useOwnEquals;
        }
        configureTestSuite({
            afterEach: config.afterEach,
            beforeEach: config.beforeEach,
        });
    }

    /**
     * This static attribute can be used to ignore the match
     * of a specific argument when using "wasCalledWith".
     */
    static IGNORE = IGNORE;

    /**
     * This static attribute can be called with a custom
     * comparator that returns a boolean indicating if the
     * comparison holds. Can be used when calling e.g. "wasCalledWith".
     */
    static COMPARE = COMPARE;

    /**
     * This static method is an alternative way to
     * create a Spy which mocks the an objects attribute.
     *
     * The attribute of the object "obj[methodName]" will
     * be replaced by the spy and the previous attribute
     * will be stored in the spy registry.
     * Therefore this information is always restorable.
     * The most common use case, will be to mock
     * another function as attribute of the object.
     *
     * The method has to met the following conditions:
     *
     * - The attribute to spy has to be function itself.
     * - The attribute to spy should not be spied already.
     *
     * If the upper conditions are not fulfilled, this
     * method will throw to avoid unexpected behaviour.
     *
     * @param {Object} obj -> The manipulated object.
     * @param {string} methodName -> The mocked attributes name.
     *
     * @return {SpyInstance}
     */
    static on<T: Object>(obj: T, methodName: $Keys<T>): SpyInstance {
        const method = obj[methodName];
        if (!(method instanceof Function)) {
            throw new Error(
                `The object attribute '${methodName}' ` +
                    `was: ${serialize(method)}\n\n` +
                    'You should only spy on functions!'
            );
        }
        if (method[Symbols.isSpy]) {
            throw new Error(
                `The objects attribute '${methodName}'` +
                    ' was already spied. Please make sure to spy' +
                    ' only once at a time at any attribute.'
            );
        }
        __LOCK__ = false;
        const spy = new Spy(methodName, { obj, methodName });
        __LOCK__ = true;
        obj[methodName] = spy;
        return spy;
    }

    /**
     * This static method is not only a shortcut for applying
     * multiple spies on one object at (different) attributes,
     * but it enables more control, clarity and comfort for all
     * kind of unit tests. (see spy.mock.test.js)
     *
     * For example:
     *
     * const spy1 = Spy.on(obj, 'methodName1');
     * const spy2 = Spy.on(obj, 'methodName2');
     * const spy3 = Spy.on(obj, 'methodName3');
     *
     * Can be accomplished by:
     *
     * const obj$Mock = Spy.mock(obj, 'methodName1', 'methodName2', 'methodName3')
     *
     * (spy1 === obj$Mock.methodName1 and so forth)
     *
     * @param {Object} obj -> The manipulated object. Actual type:
     *                        Before initialization: { [$Keys<typeof methodNames>]: Throwing function }
     *                        After initialization: { [$Keys<typeof methodNames>]: SpyInstance }
     * @param {string[]} methodNames -> Iterative provided attribute
     *                                  names that will be mocked.
     *
     * @return {Object} Mock.
     */
    static mock<T: Object>(
        obj: T,
        ...methodNames: $Keys<T>[]
    ): { [$Keys<T>]: SpyInstance } {
        return createMock(obj, methodNames);
    }

    /**
     * This static method initializes all created
     * mocks (see Spy.mock). This is necessary, because
     * it has to apply before each test run, to ensure
     * that restored spies apply again. This makes
     * automated cleaned up spies possible.
     *
     * Usually it should get called within one "beforeEach"-Hook.
     *
     * @param {string | void} scope -> A string identifying the scope.
     *                                 Scopes should not be used only in
     *                                 combination of custom beforeEach and
     *                                 afterEach-Hooks.
     *
     */
    static initMocks(scope?: string): void {
        initMocks(Spy.on, scope);
    }

    /**
     * This static method does restore all
     * manipulated objects and remove therefore
     * all mocks.
     *
     * Restoring objects does not disable any
     * other behaviours/features of the spies.
     *
     * Usually it should get called within one "afterEach"-Hook.
     */
    static restoreAll(): void {
        registry.restoreAll();
    }

    /**
     * This static method does reset all
     * created spy instances.
     *
     * This deletes all information related to made calls.
     * This is very useful, if you want to avoid testing any
     * conditions that were outside the control of your test.
     *
     * Usually it should get called within one "afterEach"-Hook.
     */
    static resetAll(): void {
        AllCreatedSpies.forEach(spy => spy.reset());
    }
}

const defaultHooks = {
    beforeEach: Spy.initMocks,
    afterEach: () => {
        Spy.restoreAll();
        Spy.resetAll();
    },
};

configureTestSuite(defaultHooks);

export { Spy };
