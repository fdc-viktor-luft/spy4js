/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { Env } from './env';
import { Symbols } from './symbols';

export type Mockable = Record<string, any>;

// returns a spy instance
type SpyOn = (obj: Mockable, method: keyof typeof obj) => any;

const uninitialized = (method: keyof any) => () => {
    throw new Error(`Method '${String(method)}' was not initialized on Mock.`);
};

type MockInfo = {
    mock: Mockable;
    mocked: Mockable;
    scope: string;
    callsFactory?: (methodName: string) => (...args: any[]) => any;
    moduleName?: string;
    active: boolean;
};
type MockScope = MockInfo[];

export const defaultScope: string = Symbol('__Spy_global__') as any;
export const _mocks: { [scoping: string]: MockScope } = { [defaultScope]: [] };

let scope = defaultScope;
export const setScope = (scoping?: string): void => {
    if (scoping) {
        _mocks[scoping] = [];
        scope = scoping;
    } else scope = defaultScope;
};

const registerMock = (mocked: Mockable, callsFactory?: MockInfo['callsFactory'], moduleName?: string) => {
    const mock = {};
    _mocks[scope].push({ mocked, mock, scope, callsFactory, moduleName, active: false });
    return mock;
};

export const createMock = <T extends Mockable, K extends keyof T>(
    obj: T,
    methods: K[],
    callsFactory?: MockInfo['callsFactory'],
    moduleName?: string
): { [P in K]: any } => {
    const mock = registerMock(obj, callsFactory, moduleName) as { [P in K]: any };
    methods.forEach((method) => {
        mock[method] = uninitialized(method);
    });
    return mock;
};

export const couldNotInitError = (scope: string, additional: string) =>
    new Error(
        `Could not initialize mock for ${
            scope === defaultScope ? 'global scope' : `scope "${scope}"`
        }, because:\n${additional}`
    );

const initMock = (mockInfo: MockInfo, spyOn: SpyOn): void => {
    const { mocked, mock, scope, callsFactory, moduleName, active } = mockInfo;
    Object.keys(mock).forEach((method) => {
        if (active) return;
        try {
            const spy = spyOn(mocked, method as keyof typeof mock);
            mockInfo.active = true;
            if (callsFactory) {
                spy.calls(callsFactory(method));
                spy.displayName = method; // TODO: test if name works, too
            }
            spy[Symbols.onRestore] = () => {
                mockInfo.active = false;
            };
            mock[method as keyof typeof mock] = spy;
        } catch (e) {
            let msg = (e as Error).message;
            if (Env.isJest && msg.includes('has only a getter')) {
                msg += `
Inserting a jest module mock might resolve this problem. Put this outside of the "describe":

jest.mock('${moduleName}');

Or if you don't want to mock everything from this module, you can use this:

jest.mock('${moduleName}', () => ({
    ...jest.requireActual('${moduleName}'),
    '${method}': () => {},
}));`;
            }
            throw couldNotInitError(scope, msg);
        }
    });
};

const initMockScope = (scoping: string, spyOn: SpyOn): void => {
    Object.values(_mocks[scoping]).forEach((mock) => initMock(mock, spyOn));
};

export const initMocks = (spyOn: SpyOn, scoping?: string): void => {
    initMockScope(defaultScope, spyOn);
    scoping && initMockScope(scoping, spyOn);
};
