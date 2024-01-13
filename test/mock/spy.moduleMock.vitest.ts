import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/utils', async () => ({ ...((await vi.importActual('../../src/utils')) as any) }));
vi.mock('../../src/serializer', async () => ({ ...((await vi.importActual('../../src/serializer')) as any) }));
vi.mock('@testing-library/react');

import { differenceOf } from '../../src/utils';
import { Spy } from '../../src/spy';
import { serialize } from '../../src/serializer';
import { render } from '@testing-library/react';

Spy.setup({ expect, beforeEach, afterEach });

describe('Spy.mockModule', async () => {
    const Mock$Utils = Spy.mock(await import('../../src/utils'), 'differenceOf', 'toError');

    it('does something', () => {
        Mock$Utils.differenceOf.returns('42');
        expect(differenceOf('foo', 'bar')).toBe('42');
        expect(serialize({ foo: 'bar' })).toBe("{foo: 'bar'}");
    });
});

describe('Spy.mockModule.2', async () => {
    const Mock$Serializer = Spy.mock(await import('../../src/serializer'), 'serialize');

    it('does something', () => {
        Mock$Serializer.serialize.returns('42');
        expect(differenceOf('foo', 'bar')).toBe('different string');
        expect(serialize({ foo: 'bar' })).toBe('42');
    });
});

describe('Spy.mockModule - with only getter property', async () => {
    const Mock$ReactTestingLibrary = Spy.mock(await import('@testing-library/react'), 'render');

    it('replaces the function by our spy', () => {
        expect(render).toBe(Mock$ReactTestingLibrary.render);
        expect(render('foo' as any)).toBe(undefined);
        Mock$ReactTestingLibrary.render.wasCalledWith('foo');
    });
});
