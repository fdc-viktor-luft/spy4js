/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
import { SpyRegistry } from '../src/registry';
import { describe, it, expect } from 'vitest';

/**
 * The tests are written not method specific.
 * Meaning that storing objects information
 * does not restrict to functions although this
 * will be the central use case for the spy utils.
 */
describe('Spy - Utils', () => {
    it('should not allow to use the constructor of the Spy without new', () => {
        expect(SpyRegistry).toThrow();
    });

    it('should register an arbitrary object attribute correctly', () => {
        const testObject = { attr1: 'string', attr2: 88, attr3: new Date() };
        const reg: any = new SpyRegistry();

        const returnedRegisterCount = reg.push(testObject, 'attr1');

        expect(reg.registerCount).toEqual(1);
        expect(returnedRegisterCount).toEqual(1);
        expect(reg.register[1].obj).toEqual(testObject);
        expect(reg.register[1].method).toEqual(testObject.attr1);
        expect(reg.register[1].methodName).toEqual('attr1');
    });

    it('does nothing on restore for not existing key', () => {
        const testObject = { func: () => {} };
        const expectedRegisterEntry = {
            obj: testObject,
            method: testObject.func,
            methodName: 'func',
        };

        const reg: any = new SpyRegistry();

        const key = reg.push(testObject, 'func');
        expect(reg.register).toEqual({ [key]: expectedRegisterEntry });

        reg.restore(123);
        expect(reg.register).toEqual({ [key]: expectedRegisterEntry });
    });

    it('does only delete the register entry on restore if stored object has invalid structure', () => {
        const reg: any = new SpyRegistry();
        reg.register[1] = { noObjKey: 'here' };
        reg.restore(1);
        expect(reg.register).toEqual({});
    });

    it('should be able to restore a registered object', () => {
        const someDate = new Date();
        const testObject: any = { attr1: 'string', attr2: 88, attr3: someDate };
        const reg: any = new SpyRegistry();

        const registerEntry1 = reg.push(testObject, 'attr1');
        const registerEntry2 = reg.push(testObject, 'attr2');

        const someFunc: any = () => {};
        testObject.attr1 = someFunc;
        delete testObject.attr2;

        expect(testObject.attr3).toEqual(someDate);

        reg.restore(registerEntry1);

        expect(testObject.attr3).toEqual(someDate);

        reg.restore(registerEntry2);

        expect(testObject.attr3).toEqual(someDate);
    });

    it('should be able to restore all registered objects properties at once', () => {
        const someDate = new Date();
        const testObject: any = { attr1: 'string', attr2: 88, attr3: someDate };
        const reg: any = new SpyRegistry();

        reg.push(testObject, 'attr1');
        reg.push(testObject, 'attr2');

        const someFunc: any = () => {};
        testObject.attr1 = someFunc;
        delete testObject.attr2;

        expect(testObject.attr3).toEqual(someDate);

        reg.restoreAll();

        expect(testObject.attr3).toEqual(someDate);
    });

    it('should be able to to return the stored value without restoring the object', () => {
        const someDate = new Date();
        const testObject: any = { attr1: 'string', attr2: 88, attr3: someDate };
        const reg: any = new SpyRegistry();

        const registerEntry1 = reg.push(testObject, 'attr1');
        reg.push(testObject, 'attr2');

        const someFunc: any = () => {};
        testObject.attr1 = someFunc;
        delete testObject.attr2;

        expect(reg.getOriginalMethod(registerEntry1)).toEqual('string');
        expect(testObject.attr3).toEqual(someDate);
    });

    it('is able to make stored information persistent', () => {
        const testObject = {
            func1: () => 'testObjectFunc1',
            func2: () => 'testObjectFunc1',
        };
        const reg: any = new SpyRegistry();

        expect(Object.keys(reg.register).length).toEqual(0);
        expect(Object.keys(reg.persReg).length).toEqual(0);

        const registerEntry1 = reg.push(testObject, 'func1');
        reg.push(testObject, 'func2');

        expect(Object.keys(reg.register).length).toEqual(2);
        expect(Object.keys(reg.persReg).length).toEqual(0);

        reg.persist(registerEntry1, true);

        expect(Object.keys(reg.register).length).toEqual(1);
        expect(Object.keys(reg.persReg).length).toEqual(1);

        reg.restore(registerEntry1);

        expect(Object.keys(reg.register).length).toEqual(1);
        expect(Object.keys(reg.persReg).length).toEqual(1);

        reg.restoreAll();

        expect(Object.keys(reg.register).length).toEqual(0);
        expect(Object.keys(reg.persReg).length).toEqual(1);

        reg.persist(registerEntry1, false);

        expect(Object.keys(reg.register).length).toEqual(1);
        expect(Object.keys(reg.persReg).length).toEqual(0);

        reg.restoreAll();

        expect(Object.keys(reg.register).length).toEqual(0);
        expect(Object.keys(reg.persReg).length).toEqual(0);
    });

    it('does nothing on persist for not existing key', () => {
        const testObject = { func: () => {} };

        const reg: any = new SpyRegistry();

        const key = reg.push(testObject, 'func');
        expect(reg.register[key].obj).toEqual(testObject);

        reg.persist(123, true);
        expect(reg.register[key].obj).toEqual(testObject);
    });
});
