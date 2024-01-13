/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { Symbols } from './symbols';
import { Config } from './config';

export type Mockable = Record<string, any>;

// returns a spy instance
type SpyOn = (obj: Mockable, method: keyof typeof obj) => any;

const uninitialized = (method: keyof any) => () => {
    throw new Error(`Method '${String(method)}' was not initialized on Mock.`);
};

export const createMock = <T extends Mockable, K extends keyof T>(
    obj: T,
    methods: K[],
    spyOn: SpyOn,
    callsFactory?: MockInfo['callsFactory']
): { [P in K]: any } => {
    const mock = registerMock(obj, spyOn, callsFactory) as { [P in K]: any };
    methods.forEach((method) => {
        mock[method] = uninitialized(method);
    });
    return mock;
};

type MockInfo = {
    mock: Mockable;
    mocked: Mockable;
    callsFactory?: (methodName: string) => (...args: any[]) => any;
    activeMethods: Set<string>;
};

const registerMock = (mocked: Mockable, spyOn: SpyOn, callsFactory?: MockInfo['callsFactory']) => {
    const mock = {};
    const { beforeEach, expect } = Config;

    if (!beforeEach || !expect) throw new Error('You need to call Spy.setup() in order to use mocks.');
    const { currentTestName } = expect.getState();
    if (currentTestName) throw new Error('Mocks can only be created outside of tests');

    const activeMethods = new Set<string>();
    beforeEach(() => {
        initMock({ mocked, mock, callsFactory, activeMethods }, spyOn);
    });

    return mock;
};

export const couldNotInitError = (additional: string) => new Error(`Could not initialize mock because:\n${additional}`);

const initMock = (mockInfo: MockInfo, spyOn: SpyOn): void => {
    const { mocked, mock, callsFactory, activeMethods } = mockInfo;
    Object.keys(mock).forEach((method) => {
        if (activeMethods.has(method)) return;
        try {
            const spy = spyOn(mocked, method as keyof typeof mock);
            mockInfo.activeMethods.add(method);
            if (callsFactory) {
                spy.calls(callsFactory(method));
                spy.displayName = method; // TODO: test if name works, too
            }
            spy[Symbols.onRestore] = () => {
                mockInfo.activeMethods.delete(method);
            };
            mock[method as keyof typeof mock] = spy;
        } catch (e) {
            let msg = (e as Error).message;
            const utilName = Config.runner === 'jest' ? 'jest' : Config.runner === 'vitest' ? 'vi' : undefined;
            if (utilName && msg.includes('has only a getter')) {
                const actual =
                    utilName === 'jest'
                        ? `() => ({ ...jest.requireActual('<module-name>') })`
                        : `async () => ({ ...((await vi.importActual('<module-name>')) as any) })`;
                msg += `
Inserting a module mock might should resolve this problem. Run this code beforehand:

${utilName}.mock('<module-name>');

Or if you don't want to mock everything from this module, you can use this:

${utilName}.mock('<module-name>', ${actual});`;
            }
            throw couldNotInitError(msg);
        }
    });
};
