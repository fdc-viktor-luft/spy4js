import { Spy } from '../../src/spy';
import { beforeEach, afterEach, expect, describe, it } from 'vitest';

Spy.setup({ beforeEach, afterEach, expect });

const toBeMocked1 = { func: (v: string) => 'foo:' + v };
const toBeMocked2 = { func: (v: string) => 'foo:' + v };
const toBeMocked3 = { func: (v: string) => 'foo:' + v };
const toBeMocked4 = { func: (v: string) => 'foo:' + v };

const simpleSpy = Spy();
const mock1 = Spy.mock(toBeMocked1, 'func');

// ATTENTION: Every describe scope message needs to be unique in a single file.

describe('First: Nested Level 0', () => {
    const mock2 = Spy.mock(toBeMocked2, 'func');

    describe('First: Nested Level 1', () => {
        const mock3 = Spy.mock(toBeMocked3, 'func');

        it('test 1', () => {
            const spyOn4 = Spy.on(toBeMocked4, 'func');

            simpleSpy('test1simple');
            toBeMocked1.func('test11');
            toBeMocked2.func('test12');
            toBeMocked3.func('test13');
            toBeMocked4.func('test14');

            simpleSpy.wasCalledWith('test1simple');
            mock1.func.wasCalledWith('test11');
            mock2.func.wasCalledWith('test12');
            mock3.func.wasCalledWith('test13');
            spyOn4.wasCalledWith('test14');
        });

        it('test 2', () => {
            const spyOn4 = Spy.on(toBeMocked4, 'func');

            simpleSpy('test2simple');
            toBeMocked1.func('test21');
            toBeMocked2.func('test22');
            toBeMocked3.func('test23');
            toBeMocked4.func('test24');

            simpleSpy.wasCalledWith('test2simple');
            mock1.func.wasCalledWith('test21');
            mock2.func.wasCalledWith('test22');
            mock3.func.wasCalledWith('test23');
            spyOn4.wasCalledWith('test24');
        });
    });
});

describe('Second: Nested Level 0', () => {
    const mock2 = Spy.mock(toBeMocked2, 'func');

    describe('Second: Nested Level 1', () => {
        const mock3 = Spy.mock(toBeMocked3, 'func');

        it('test 1', () => {
            const spyOn4 = Spy.on(toBeMocked4, 'func');

            simpleSpy('test1simple');
            toBeMocked1.func('test11');
            toBeMocked2.func('test12');
            toBeMocked3.func('test13');
            toBeMocked4.func('test14');

            simpleSpy.wasCalledWith('test1simple');
            mock1.func.wasCalledWith('test11');
            mock2.func.wasCalledWith('test12');
            mock3.func.wasCalledWith('test13');
            spyOn4.wasCalledWith('test14');
        });

        it('test 2', () => {
            const spyOn4 = Spy.on(toBeMocked4, 'func');

            simpleSpy('test2simple');
            toBeMocked1.func('test21');
            toBeMocked2.func('test22');
            toBeMocked3.func('test23');
            toBeMocked4.func('test24');

            simpleSpy.wasCalledWith('test2simple');
            mock1.func.wasCalledWith('test21');
            mock2.func.wasCalledWith('test22');
            mock3.func.wasCalledWith('test23');
            spyOn4.wasCalledWith('test24');
        });
    });
});
