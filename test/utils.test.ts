/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { COMPARE, differenceOf, MAPPER } from '../src/utils';
import { IGNORE } from '../src/serializer';
import { describe, it, expect } from 'vitest';

describe('Spy - Equality', () => {
    it('should make an equality check for classes correctly', () => {
        const TestClass = class {
            attr1: string;
            attr2: number;
            attr3: Date;

            constructor(attr1: string, attr2: number, attr3: Date) {
                // eslint-disable-line
                this.attr1 = attr1;
                this.attr2 = attr2;
                this.attr3 = attr3;
            }

            method(): string {
                // eslint-disable-line require-jsdoc
                return this.attr1 + this.attr2.toString() + this.attr3.toDateString();
            }
        };

        const someInstance = new TestClass('test', 42, new Date(Date.UTC(2016, 12, 24)));
        const someOtherInstance = new TestClass('test', 42, new Date(Date.UTC(2016, 12, 24)));
        const someDifferentInstance = new TestClass('test', 42, new Date(Date.UTC(2016, 12, 23)));

        expect(someInstance).not.toBe(someOtherInstance);
        expect(differenceOf(someInstance, someOtherInstance)).toBe(undefined);
        expect(differenceOf(someInstance, someDifferentInstance)).toBe(
            '--> attr3 / different date [new Date(1485216000000) != new Date(1485129600000)]'
        );
    });

    it('assumes always equality for the IGNORE object', () => {
        expect(differenceOf(IGNORE, null)).toBe(undefined);
        expect(differenceOf(new Date(), IGNORE)).toBe(undefined);
        expect(differenceOf({ a: 'any attribute' }, { a: IGNORE })).toBe(undefined);
        expect(differenceOf(['first', Symbol.for('_TEST_'), 'third'], ['first', IGNORE, 'third'])).toBe(undefined);
    });

    it('should detect flat differences correctly', () => {
        // null and/or undefined
        expect(differenceOf(null, null)).toBe(undefined);
        expect(differenceOf(undefined, undefined)).toBe(undefined);
        expect(differenceOf(null, 'test2')).toBe('one was null');
        expect(differenceOf(undefined, null)).toBe('one was undefined');
        // different types
        expect(differenceOf('test', 123)).toBe('different object types: [object String] <-> [object Number]');
        // string
        expect(differenceOf('test', 'test')).toBe(undefined);
        expect(differenceOf('test1', 'test2')).toBe('different string');
        // functions
        const func = () => {};
        expect(differenceOf(func, func)).toBe(undefined);
        expect(differenceOf(func, () => {})).toBe('different function');
        // async functions
        const asyncFunc = async () => {};
        expect(differenceOf(asyncFunc, asyncFunc)).toBe(undefined);
        expect(differenceOf(asyncFunc, async () => {})).toBe('different async function');
        // regexp
        expect(differenceOf(/./g, /./g)).toBe(undefined);
        expect(differenceOf(/abc/, /ab/)).toBe('different regexp');
        // number
        expect(differenceOf(123, 123)).toBe(undefined);
        expect(differenceOf(NaN, NaN)).toBe(undefined);
        expect(differenceOf(NaN, 123)).toBe('different number');
        expect(differenceOf(12, -13)).toBe('different number');
        // BigInt
        expect(differenceOf(BigInt(123), BigInt(123))).toBe(undefined);
        expect(differenceOf(BigInt(123), BigInt(124))).toBe('different BigInt');
        // date
        expect(differenceOf(new Date(2016, 12, 24), new Date(2016, 12, 24))).toBe(undefined);
        expect(differenceOf(new Date(2016, 12, 24), new Date(2017, 12, 24))).toBe('different date');
        // boolean
        expect(differenceOf(true, true)).toBe(undefined);
        expect(differenceOf(true, false)).toBe('different bool');
        // errors
        expect(differenceOf(new Error('foo'), new Error('foo'))).toBe(undefined);
        expect(differenceOf(new Error('foo'), new Error('bar'))).toBe('different error');
        // symbols
        expect(differenceOf(Symbol.for('foo'), Symbol.for('foo'))).toBe(undefined);
        expect(differenceOf(Symbol.for('foo'), Symbol.for('bar'))).toBe('different symbols');
        expect(differenceOf(Symbol('foo'), Symbol('foo'))).toBe(
            // ATTENTION: Symbols created this way are always unique
            'different symbols'
        );
    });

    it('should detect flat differences for classes correctly', () => {
        const TestClass1 = class {
            attr: string;
            constructor(attr: string) {
                // eslint-disable-line require-jsdoc
                this.attr = attr;
            }
        };
        const TestClass2 = class {
            attr: string;
            constructor(attr: string) {
                // eslint-disable-line require-jsdoc
                this.attr = attr;
            }
        };
        expect(differenceOf(new TestClass1('some String'), new TestClass1('some String'))).toBe(undefined);
        expect(differenceOf(new TestClass1('some String'), new TestClass2('some String'))).toBe(
            'different constructor'
        );
    });

    it('treats undefined props the same as if the prop has an undefined value', () => {
        expect(differenceOf([1, 2, 'test', undefined], [1, 2, 'test'])).toBe(undefined);
        expect(differenceOf({ prop1: 'test' }, { prop1: 'test', prop2: undefined })).toBe(undefined);
    });

    it('should compare with defined equals key, if this exists', () => {
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
        expect(differenceOf(new TestClass(2), new TestClass(4))).toBe(undefined);
        // we want to use substr, so return a string for flow
        const diff = differenceOf(new TestClass(2), new TestClass(5)) || '';
        expect(diff.substr(0, 24)).toBe('own equals method failed');
        expect(
            differenceOf(new TestClass(2), new TestClass(4), {
                useOwnEquals: false,
            })
        ).toBe('--> attr / different number [2 != 4]');
    });

    it('should default circular structures as compared without failure', () => {
        const a: any = { d: 'test' };
        a.c = a;
        const b: any = { d: 'test' };
        b.c = b;
        expect(differenceOf(a, b)).toBe(undefined);
        b.d = 'test2';
        expect(differenceOf(a, b)).toBe("--> d / different string ['test' != 'test2']");
    });

    it('should make deep equality checks correctly', () => {
        const obj1 = { a: [{ a: 'someString' }, { b: 'someString' }] };
        const obj2 = { a: [{ a: 'someString' }, { b: 'someOtherString' }] };
        expect(differenceOf(obj1, obj2)).toBe("--> a / 1 / b / different string ['someString' != 'someOtherString']");
    });

    it('considers all keys when comparing objects', () => {
        const obj11 = { a: 'same', b1: undefined, c1: 'some' };
        const obj12 = { a: 'same', b2: undefined, c2: undefined };
        expect(differenceOf(obj11, obj12)).toBe("--> c1 / one was undefined ['some' != undefined]");

        const obj21 = { a: 'same', b1: undefined, c1: undefined };
        const obj22 = { a: 'same', b2: undefined, c2: 'some' };
        expect(differenceOf(obj21, obj22)).toBe("--> c2 / one was undefined [undefined != 'some']");
    });

    it('applies custom comparisons via SpyComparator', () => {
        expect(
            differenceOf(
                COMPARE((arg) => arg.length === 2),
                ['foo', 'bar']
            )
        ).toBe(undefined);
        expect(
            differenceOf(
                COMPARE((arg) => arg.length !== 2),
                ['foo', 'bar']
            )
        ).toBe('Spy.COMPARE failed');

        const obj1 = { a: 'same', b1: undefined, c1: 'some' };
        const obj11 = {
            a: 'same',
            b2: undefined,
            c1: COMPARE((arg) => arg === 'some'),
        };
        expect(differenceOf(obj1, obj11)).toBe(undefined);

        const obj12 = {
            a: 'same',
            b2: undefined,
            c1: COMPARE((arg) => arg !== 'some'),
        };
        expect(differenceOf(obj1, obj12)).toBe("--> c1 / Spy.COMPARE failed [called with: 'some']");
    });

    it('applies mapper evaluation via SpyComparator MAPPER', () => {
        expect(differenceOf(MAPPER(undefined, 42), () => 42)).toBe(undefined);
        expect(differenceOf(MAPPER(2, 42), (num: number) => 42 + num)).toBe(
            'Spy.MAPPER failed [44 did not match 42: different number]'
        );
    });
});
