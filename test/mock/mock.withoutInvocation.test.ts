/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { createMock } from '../../src/mock';
import { Config } from '../../src/config';
import { Spy } from '../../src';
import { expect, describe, it } from 'vitest';

Config.expect = undefined;
const Matrix = { tearDown: () => 1337, startup: () => 1 };

describe('Mocks - without invocation of setup', () => {
    it('throws an error', () => {
        expect(() => createMock(Matrix, ['startup'], Spy.on)).toThrowError(
            'You need to call Spy.setup() in order to use mocks.'
        );
    });
});
