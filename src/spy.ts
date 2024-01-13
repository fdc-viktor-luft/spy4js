/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { COMPARE, MAPPER, differenceOf, type OptionalMessageOrError, toError, type MessageOrError } from './utils';
import { SpyRegistry } from './registry';
import { serialize, IGNORE } from './serializer';
import { createMock, type Mockable } from './mock';
import { Symbols } from './symbols';
import { createMinimalComponent, createGenericComponent } from './react';
import { Config, configure, configureAll } from './config';

const CallOrder = {
    Idx: 0,
    lastCheck: 0,
};

/**
 *
 * Instantiating the SpyRegistry to handle all
 * mocked object relative information and
 * restore their functionality if requested.
 *
 */
const registry = new SpyRegistry();

let __LOCK__ = true;

type SpyInstanceConfig = { useOwnEquals: boolean; persistent: boolean };

type FlatAwaited<TVal> = TVal extends PromiseLike<infer TAwaited> ? TAwaited : never;
export type SpyInstance<TFunc extends (...args: any) => any = (...args: any) => any> = TFunc & {
    configure: (config: Partial<SpyInstanceConfig>) => SpyInstance<TFunc>;
    calls: (...funcs: TFunc[]) => SpyInstance<TFunc>;
    returns: (...args: ReturnType<TFunc>[]) => SpyInstance<TFunc>;
    resolves: FlatAwaited<ReturnType<TFunc>> extends never
        ? never
        : (...args: FlatAwaited<ReturnType<TFunc>>[]) => SpyInstance<TFunc>;
    rejects: FlatAwaited<ReturnType<TFunc>> extends never
        ? never
        : (...msgOrErrors: OptionalMessageOrError[]) => SpyInstance<TFunc>;
    throws: (msgOrError?: MessageOrError) => SpyInstance<TFunc>;
    reset: () => SpyInstance<TFunc>;
    restore: () => SpyInstance<TFunc>;
    transparent: () => SpyInstance<TFunc>;
    transparentAfter: (callCount: number) => SpyInstance<TFunc>;
    addSnapshotSerializer: (serialize: string | ((...args: any[]) => string)) => SpyInstance<TFunc>;
    wasCalled: (callCount?: number) => void;
    hasCallHistory: (...callHistory: Array<any[] | any>) => void;
    wasNotCalled: () => void;
    wasCalledWith: (...args: any[]) => void;
    wasNotCalledWith: (...args: any[]) => void;
    getAllCallArguments: () => Array<any[]>;
    getCallArguments: (callNr?: number) => any[];
    getCallArgument: (callNr?: number, argNr?: number) => any;
    getLatestCallArgument: (argNr?: number) => any;
    getProps: () => any;
    hasProps: (props: any) => void;
    getCallCount: () => number;
    showCallArguments: (additionalInformation?: (string | undefined)[]) => string;

    // hidden attributes
    [Symbols.name]: string;
    [Symbols.snap]: string;
    [Symbols.snapSerializer]?: (...args: any[]) => string;
    [Symbols.calls]: { args: any[]; order: number }[];
    [Symbols.index]: number;
    [Symbols.isSpy]: boolean;
    [Symbols.func]: Function;
    [Symbols.config]: SpyInstanceConfig;
    [Symbols.onRestore]?: () => void;
};

const SpyHelperFunctions = {
    getCalls: (spy: SpyInstance) => {
        const allCalls = spy[Symbols.calls];
        if (!Config.enforceOrder) return allCalls;
        return allCalls.filter(({ order }) => order > CallOrder.lastCheck);
    },
};

const SpyFunctions = {
    /**
     * Configures this spy behavior in a special
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
    configure(this: SpyInstance, config: Partial<SpyInstanceConfig>): SpyInstance {
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
            registry.persist(this[Symbols.index], this[Symbols.config].persistent);
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
    calls(this: SpyInstance, ...funcs: Array<Function>): SpyInstance {
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
    returns(this: SpyInstance, ...args: Array<any>): SpyInstance {
        return this.calls(...args.map((arg) => () => arg));
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
    resolves(this: SpyInstance, ...args: Array<any>): SpyInstance {
        return this.returns(...(args.length ? args : [undefined]).map((arg) => Promise.resolve(arg)));
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
    rejects(this: SpyInstance, ...msgOrErrors: Array<OptionalMessageOrError>): SpyInstance {
        return this.calls(
            ...(msgOrErrors.length ? msgOrErrors : [undefined]).map(
                (msgOrError) => () => Promise.reject(toError(msgOrError, this[Symbols.name]))
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
    throws(this: SpyInstance, msgOrError: OptionalMessageOrError): SpyInstance {
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
    reset(this: SpyInstance): SpyInstance {
        this[Symbols.calls] = [];
        return this;
    },

    /**
     * Restores the last by this spy manipulated object
     * and removes this special mock.
     *
     * Restoring objects does not disable any
     * other behaviors/features of the spies.
     *
     * If the spy was configured persistent, than this
     * method will throw an exception.
     *
     * Other than "Spy.restoreAll" this method only removes
     * a maximum of one mock.
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    restore(this: SpyInstance): SpyInstance {
        if (this[Symbols.config].persistent) {
            throw new Error(`\n\n${this[Symbols.name]} can not be restored!` + ' It was configured to be persistent.');
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
    transparent(this: SpyInstance): SpyInstance {
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
    transparentAfter(this: SpyInstance, callCount: number): SpyInstance {
        const oldFunc = this[Symbols.func];
        this[Symbols.func] = (...args: any[]) => {
            // before the function call is executed,
            // the call arguments were already saved
            // -> so we are interested if the made calls
            //    are more than the call count were we
            //    need to modify the behavior
            if (this[Symbols.calls].length > callCount) {
                const originalMethod = registry.getOriginalMethod(this[Symbols.index]);
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
     * This method allows to customize the snapshot serialization of the spy.
     * Only works for Jest test runner as of now.
     *
     * @return {SpyInstance} <- BuilderPattern
     */
    addSnapshotSerializer(this: SpyInstance, serialize: string | ((...args: any[]) => string)): SpyInstance {
        if (typeof serialize === 'function') {
            this[Symbols.snapSerializer] = serialize;
            const calls = this[Symbols.calls];
            const lastArgs = calls.length ? calls[calls.length - 1].args : [];
            this[Symbols.snap] = serialize(...lastArgs);
        } else {
            this[Symbols.snap] = serialize;
        }
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
    wasCalled(this: SpyInstance, callCount?: number) {
        const calls = SpyHelperFunctions.getCalls(this);
        const madeCalls = calls.length;
        if (callCount !== undefined) {
            // check exactly the number of calls
            if (madeCalls !== callCount) {
                throw new Error(
                    `\n\n${this[Symbols.name]} was called ${madeCalls} times,` +
                        ` but there were expected ${callCount} calls.\n\n` +
                        'Actually there were:\n\n' +
                        this.showCallArguments()
                );
            }
        } else if (madeCalls === 0) {
            if (this[Symbols.calls].length) {
                throw new Error(
                    `\n\n${this[Symbols.name]} was not called,` +
                        ` but there was expected at least one call.\n\n` +
                        'Actually there were:\n\n' +
                        this.showCallArguments()
                );
            } else {
                throw new Error(`\n\n${this[Symbols.name]} was never called!\n\n`);
            }
        }
        if (callCount !== 0) {
            const checked = calls[(callCount || 1) - 1];
            CallOrder.lastCheck = checked.order;
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
    hasCallHistory(this: SpyInstance, ...callHistory: Array<Array<any> | any>): void {
        const calls = SpyHelperFunctions.getCalls(this);
        const madeCalls = calls.length;
        const callCount = callHistory.length;
        if (madeCalls !== callCount) {
            throw new Error(
                `\n\n${this[Symbols.name]} was called ${madeCalls} times,` +
                    ` but the expected call history includes exactly ${callHistory.length} calls.\n\n` +
                    'Actually there were:\n\n' +
                    this.showCallArguments()
            );
        }
        if (callCount === 0) {
            throw new Error("\n\nPlease use 'wasNotCalled' instead of calling 'hasCallHistory' without any arguments");
        }
        const modifiedCallHistory = callHistory.map((arg) => (Array.isArray(arg) ? arg : [arg]));
        let hasErrors = false;
        const diffInfo = calls.map((call, index) => {
            const diff = differenceOf(call.args, modifiedCallHistory[index], this[Symbols.config]);
            if (diff) hasErrors = true;
            return diff;
        });
        if (hasErrors)
            throw new Error(
                `\n\n${this[Symbols.name]} was expected` +
                    ' to be called with the following arguments in the given order:\n\n' +
                    `${modifiedCallHistory
                        .map((entry, index) => `call ${index}: ${serialize(entry)}`)
                        .join('\n')}\n\n` +
                    'Actually there were:\n\n' +
                    this.showCallArguments(diffInfo)
            );

        CallOrder.lastCheck = calls[callCount - 1].order;
    },

    /**
     * Checks that the spy was never called.
     * Throws an error if the spy was called at least once.
     */
    wasNotCalled(this: SpyInstance): void {
        const calls = SpyHelperFunctions.getCalls(this);
        const madeCalls = calls.length;
        if (madeCalls !== 0) {
            throw new Error(
                `\n\n${this[Symbols.name]} was not expected to be called, but was called ${madeCalls} times.\n\n` +
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
     * const spy = Spy();
     * spy(arg1, arg2, arg3);
     * spy(arg4, arg5);
     * spy.wasCalledWith(arg1, arg2, arg3); // no error
     * spy.wasCalledWith(arg4, arg5); // no error
     * spy.wasCalledWith(arg1); // error!!!
     *
     * @param {Array<any>} args -> The expected arguments
     *                           for any made call.
     */
    wasCalledWith(this: SpyInstance, ...args: Array<any>): void {
        const calls = SpyHelperFunctions.getCalls(this);
        const madeCalls = calls.length;
        const diffInfo = [];
        for (let i = 0; i < madeCalls; i++) {
            const checked = calls[i];
            const diff = differenceOf(checked.args, args, this[Symbols.config]);
            if (!diff) {
                CallOrder.lastCheck = checked.order;
                return;
            }
            diffInfo.push(diff);
        }
        throw new Error(
            `\n\n${this[Symbols.name]} was expected` +
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
     * @param {Array<any>} args -> The not expected arguments
     *                             for any made call.
     */
    wasNotCalledWith(this: SpyInstance, ...args: Array<any>) {
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
     * This method returns all call arguments of all calls. Will be an empty
     * array if the spy was never called.
     *
     * For example:
     * const spy = Spy();
     * spy(arg1, arg2, arg3);
     * spy(arg4, arg5, arg6);
     * spy.getAllCallArguments();
     * // returns [[arg1, arg2, arg3], [arg4, arg5, arg6]]
     *
     * @return {Array<any[]>} -> the call arguments of all calls.
     */
    getAllCallArguments(this: SpyInstance): any[][] {
        return this[Symbols.calls].map(({ args }) => args);
    },

    /**
     * This method returns the call arguments of the
     * n'th made call as array. If less than n calls were made,
     * it will throw an error.
     *
     * By default n = 1. This corresponds to callNr = 0.
     *
     * For example:
     * const spy = Spy();
     * spy(arg1, arg2, arg3);
     * spy.getCallArguments(); // returns [arg1, arg2, arg3]
     *
     * @param {number} callNr -> represents the callNr for which
     *                           the call argument should be returned.
     *
     * @return {Array<any>} -> the call arguments of the (callNr + 1)'th call.
     */
    getCallArguments(this: SpyInstance, callNr: number = 0): Array<any> {
        const madeCalls = this.getAllCallArguments();
        if (callNr % 1 !== 0 || callNr >= madeCalls.length) {
            throw new Error(
                `\n\nThe provided callNr "${callNr}" was not valid.\n\n` +
                    `Made calls for ${this[Symbols.name]}:\n\n` +
                    this.showCallArguments()
            );
        }
        return madeCalls[callNr];
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
     * const spy = Spy();
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
    getCallArgument(this: SpyInstance, callNr: number = 0, argNr: number = 0): any {
        return this.getCallArguments(callNr)[argNr];
    },

    /**
     * Returns the latest call argument.
     *
     * @param {number} argNr -> represents position of the argument
     *                          when the corresponding call was made.
     *
     * @return {any} -> the props
     */
    getLatestCallArgument(this: SpyInstance, argNr: number = 0): any {
        const allArgs = this.getAllCallArguments();
        if (!allArgs.length) {
            throw new Error(`\n\n${this[Symbols.name]} was never called!\n\n`);
        }
        return this.getCallArgument(allArgs.length - 1, argNr);
    },

    /**
     * This method returns the props of a mocked React component.
     * Convenience naming for already existing functionality.
     *
     * @return {any} -> the props
     */
    getProps(this: SpyInstance): any {
        return this.getLatestCallArgument();
    },

    /**
     * Checks if the spy was last call was done with the provided first argument.
     *
     * It throws an error otherwise.
     *
     * @param {any} props
     *
     */
    hasProps(this: SpyInstance, props: any) {
        const currentProps = this.getProps();
        const diff = differenceOf(currentProps, props, this[Symbols.config]);
        if (!diff) return;
        throw new Error(
            `\n\n${this[Symbols.name]} was expected` +
                ' to have the following props:\n\n' +
                `    --> ${serialize(props)}\n\n` +
                'But the current props are:\n\n' +
                `    ${serialize(currentProps)}\n` +
                `    ${diff}`
        );
    },

    /**
     * This method returns the number of made calls on the spy.
     *
     * @return {number} -> the number of made calls.
     */
    getCallCount(this: SpyInstance): number {
        return this.getAllCallArguments().length;
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
    showCallArguments(this: SpyInstance, additionalInformation: (string | undefined)[] = []): string {
        const allMadeCalls = this[Symbols.calls];
        const madeCalls = SpyHelperFunctions.getCalls(this);
        const earlierCalls = allMadeCalls.length - madeCalls.length;
        const usedAdditionalInfo = new Array(earlierCalls)
            .fill('!!! was called earlier (#enforceOrder)')
            .concat(additionalInformation);
        if (allMadeCalls.length === 0) {
            return `${this[Symbols.name]} was never called!\n`;
        }
        let response = '';
        for (let i = 0; i < allMadeCalls.length; i++) {
            const args = serialize(allMadeCalls[i].args);
            response += `call ${i - earlierCalls}: ${args}\n`;
            if (usedAdditionalInfo[i]) {
                response += `        ${usedAdditionalInfo[i]}\n`;
            }
        }
        return response;
    },
};

const AllCreatedSpies: Array<SpyInstance> = [];

type ISpy = {
    (name?: string): SpyInstance;
    configure: typeof configure;
    setup: typeof configureAll;
    IGNORE: Symbol;
    COMPARE: typeof COMPARE;
    MAPPER: typeof MAPPER;
    on<T extends Mockable, K extends keyof T>(obj: T, methodName: K): SpyInstance<T[K]>;
    mock<T extends Mockable, K extends keyof T>(obj: T, ...methodNames: K[]): { [P in K]: SpyInstance<T[P]> };
    mockReactComponents<T extends Mockable, K extends keyof T>(
        obj: T,
        ...methodNames: K[]
    ): { [P in K]: SpyInstance<T[P]> };
    restoreAll(): void;
    resetAll(): void;
};

const _createSpy = (name: string = '', __mock?: any): SpyInstance => {
    const spy: any = function (...args: Array<any>) {
        spy[Symbols.calls].push({ args, order: ++CallOrder.Idx });
        if (spy[Symbols.snapSerializer]) {
            spy[Symbols.snap] = spy[Symbols.snapSerializer](...args);
        }
        return spy[Symbols.func](...args);
    };
    if (__mock && !__LOCK__) {
        spy[Symbols.index] = registry.push(__mock.obj, __mock.methodName);
        spy[Symbols.name] = `the spy on '${name}'`;
        spy[Symbols.snap] = `Spy.on(${name})`;
    } else {
        spy[Symbols.index] = 0;
        spy[Symbols.name] = name || 'the spy';
        spy[Symbols.snap] = `Spy(${name})`;
    }
    spy[Symbols.isSpy] = true;
    spy[Symbols.func] = () => {};
    spy[Symbols.calls] = [];
    spy[Symbols.config] = { ...Config };
    Object.entries(SpyFunctions).forEach(([key, value]) => {
        spy[key] = value;
    });
    AllCreatedSpies.push(spy);
    return spy as SpyInstance;
};

/**
 * This constructor does instantiate a Spy
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
 */
const Spy: ISpy = (name?: string): SpyInstance => _createSpy(name);

/**
 * This static method can be used to configure
 * the default behavior of created spy instances.
 * The most suited place where you could configure
 * spy4js is the "setupTests"-File, which runs
 * before each test suite.
 *
 * For example,
 *
 * Spy.configure({ useOwnEquals: false });
 *
 * would initially configure every spy to not
 * favor own "equals" implementation while
 * comparing any objects.
 *
 * You may also override default test suite hooks
 * by providing afterEach or beforeEach respectively.
 */
Spy.configure = configure;

/**
 * This static attribute can be used to ignore the match
 * of a specific argument when using "wasCalledWith".
 */
Spy.IGNORE = IGNORE;

/**
 * This static attribute can be called with a custom
 * comparator that returns a boolean indicating if the
 * comparison holds. Can be used when calling e.g. "wasCalledWith".
 */
Spy.COMPARE = COMPARE;

/**
 * This static attribute can be used to test mapper
 * functions inside call argument checks. It is similar to
 * Spy.COMPARE, but wraps some mechanics to evaluate the result
 * based on the given input.
 */
Spy.MAPPER = MAPPER;

/**
 * This static method is an alternative way to
 * create a Spy which mocks the objects attribute.
 *
 * The attribute of the object "obj[methodName]" will
 * be replaced by the spy and the previous attribute
 * will be stored in the spy registry.
 * Therefore, this information is always restorable.
 * The most common use case, will be to mock
 * another function as attribute of the object.
 *
 * The method has to meet the following conditions:
 *
 * - The attribute to spy has to be function itself.
 * - The attribute to spy should not be spied already.
 *
 * If the upper conditions are not fulfilled, this
 * method will throw to avoid unexpected behavior.
 *
 * @param {Object} obj -> The manipulated object.
 * @param {string} methodName -> The mocked attributes name.
 *
 * @return {SpyInstance}
 */
Spy.on = <T extends Mockable, K extends keyof T>(obj: T, methodName: K): SpyInstance<T[K]> => {
    const method = obj[methodName];
    if (!(typeof method === 'function')) {
        throw new Error(
            `The object attribute '${String(methodName)}' ` +
                `was: ${serialize(method)}\n\n` +
                'You should only spy on functions!'
        );
    }
    if ((method as any)[Symbols.isSpy]) {
        throw new Error(
            `The objects attribute '${String(methodName)}'` +
                ' was already spied. Please make sure to spy' +
                ' only once at a time at any attribute.'
        );
    }
    __LOCK__ = false;
    const spy = _createSpy(methodName as string, { obj, methodName });
    __LOCK__ = true;
    obj[methodName] = spy as any;
    return spy as any;
};

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
 * @param {Object} obj -> the object to be mocked.
 * @param {string[]} methodNames -> Iterative provided attribute
 *                                  names that will be mocked.
 *
 * @return {Object} Mock. -> The manipulated object. Actual type:
 *                        Before initialization: { [$Keys<typeof methodNames>]: Throwing function }
 *                        After initialization: { [$Keys<typeof methodNames>]: SpyInstance }
 */
Spy.mock = <T extends Mockable, K extends keyof T>(obj: T, ...methodNames: K[]): { [P in K]: SpyInstance<T[P]> } =>
    createMock(obj, methodNames, Spy.on);

/**
 * This static method is very similar to "Spy.mock" but perfectly
 * suited for testing with React components. When using testing tools
 * that render the whole subtree it is sometimes better to mock parts
 * of your nested components.
 *
 * The only difference is that the returned mocks will return "null"
 * instead of "undefined" as default. This is a minimal valid React
 * component.
 *
 * @param {Object} obj -> the object to be mocked.
 * @param {string[]} methodNames -> Iterative provided attribute
 *                                  names that will be mocked.
 *
 * @return {Object} Mock. -> The manipulated object. Actual type:
 *                        Before initialization: { [$Keys<typeof methodNames>]: Throwing function }
 *                        After initialization: { [$Keys<typeof methodNames>]: SpyInstance }
 */
Spy.mockReactComponents = <T extends Mockable, K extends keyof T>(
    obj: T,
    ...methodNames: K[]
): { [P in K]: SpyInstance<T[P]> } =>
    createMock(obj, methodNames, Spy.on, Config.useGenericReactMocks ? createGenericComponent : createMinimalComponent);

/**
 * This static method does restore all
 * manipulated objects and remove therefore
 * all mocks.
 *
 * Restoring objects does not disable any
 * other behaviors/features of the spies.
 *
 * Usually it should get called within one "afterEach"-Hook.
 */
Spy.restoreAll = (): void => {
    registry.restoreAll();
};

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
Spy.resetAll = (): void => {
    AllCreatedSpies.forEach((spy) => spy.reset());
};

const defaultAfterEachCb = () => {
    Spy.restoreAll();
    Spy.resetAll();
};

Spy.setup = (config): void => {
    configureAll(config);
    const { beforeEach, afterEach, expect, runner } = Config;
    if (!beforeEach || !afterEach || !expect) {
        const vitestHint =
            runner === 'vitest'
                ? ` E.g. like this:

import { beforeEach, afterEach, expect } from 'vitest';

Spy.setup({ beforeEach, afterEach, expect });`
                : '';
        throw new Error(`Please provide "beforeEach", "afterEach" and "expect" functions.${vitestHint}`);
    }

    afterEach(() => {
        const cb = Config?.afterEachCb || defaultAfterEachCb;
        cb();
    });

    /**
     * Specific snapshot serialization behavior.
     */
    expect.addSnapshotSerializer({
        test: (v: any) => v && v[Symbols.isSpy],
        print: (spy: SpyInstance) => spy[Symbols.snap],
    });
};

export { Spy };
