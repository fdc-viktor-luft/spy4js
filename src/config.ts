type SpyNonSetupConfig = {
    useOwnEquals: boolean;
    enforceOrder: boolean;
    useGenericReactMocks: boolean;
    afterEachCb?: () => void;
};

export type SpyConfig = SpyNonSetupConfig & {
    afterEach?: (cb: () => void) => void;
    beforeEach?: (cb: () => void) => void;
    expect?: { addSnapshotSerializer: (serializer: any) => void; getState: () => { currentTestName?: string } };
    runner: 'jest' | 'vitest' | 'other';
};

/**
 * Initial default settings for every
 * spy instance. Can be modified only
 * implicitly by "Spy.configure".
 */
const defaults: SpyConfig = {
    useOwnEquals: false,
    enforceOrder: true,
    useGenericReactMocks: false,
    afterEach: (global as any).afterEach,
    beforeEach: (global as any).beforeEach,
    expect: (global as any).expect,
    runner: process.env.JEST_WORKER_ID !== undefined ? 'jest' : 'vitest',
};

export const Config = { ...defaults };

export const configure = (config: Partial<SpyNonSetupConfig>) => configureAll(config);

export const configureAll = (config: Partial<SpyConfig> = {}): void => {
    Object.entries(config).forEach(([name, value]) => {
        if (value !== undefined) {
            Config[name as keyof SpyConfig] = value as never;
        }
    });
};
