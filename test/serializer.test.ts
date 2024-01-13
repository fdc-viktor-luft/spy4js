/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */

import { serialize, IGNORE } from '../src/serializer';
import { describe, it, expect } from 'vitest';

describe('serialize', () => {
    it('serializes arrays with IGNORED entry', () => {
        expect(serialize([])).toBe('[]');
        expect(serialize([1, 'test', IGNORE, /^abc$/])).toBe("[1, 'test', >IGNORED<, //^abc$//]");
    });

    it('serializes all together', () => {
        const o: any = { prop1: 'test', prop2: { prop21: 12 } };
        o.prop3 = o;
        o.prop2.prop22 = o;
        class Clazz {
            _prop: number;
            constructor(prop: number) {
                this._prop = prop;
            }
        }
        const inst = new Clazz(12);
        o.prop4 = [1, 3, inst, { attr: IGNORE, attr2: Symbol.for('test') }];

        expect(serialize(o)).toBe(
            "{prop1: 'test', " +
                'prop2: {prop21: 12, prop22: >CYCLOMATIC<}, ' +
                'prop3: >CYCLOMATIC<, ' +
                "prop4: [1, 3, Clazz{_prop: 12}, {attr: >IGNORED<, attr2: Symbol.for('test')}]}"
        );
    });
});
