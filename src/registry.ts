import { Symbols } from './symbols';

/**
 * This file is part of spy4js which is released under MIT license.
 *
 * The LICENSE file can be found in the root directory of this project.
 *
 */
const restoreAttributeForEntry = (value: any): void => {
    const { obj, method, methodName } = value;
    if (obj) {
        obj[methodName]?.[Symbols.onRestore]?.();
        obj[methodName] = method;
    }
};

type SpyRegister = { [index: number]: { obj: any; method: Function; methodName: string } };

export class SpyRegistry {
    register: SpyRegister;
    persReg: SpyRegister;
    registerCount: number;

    /**
     * The SpyRegistry is a class to handle the
     * correct restoration of spied objects.
     *
     * You may push an objects information about
     * a spied method to store it and be able to
     * restore it at any time.
     * Consider the SpyRegistry as information storage
     * for spied objects.
     *
     * @constructor
     */
    constructor() {
        this.register = {};
        this.persReg = {};
        this.registerCount = 0;
    }

    /**
     * If called, the SypRegistry will be resetting to its initial state.
     * Exception: the unique register count will not be touched.
     * Meaning that all stored object information will be restored
     * to their individual previous state.
     */
    restoreAll(): void {
        Object.values(this.register).forEach((entry) => {
            restoreAttributeForEntry(entry);
        });
        this.register = {};
    }

    /**
     * If called, the SpyRegistry will restore the object,
     * which was registered at given index and is getting lose
     * of the stored information.
     *
     * If the registry entry for the given index does not exist,
     * nothing will happen.
     *
     * @param {number} index -> the unique identifier of stored information.
     */
    restore(index: number): void {
        const entry = this.register[index];
        if (entry) {
            restoreAttributeForEntry(entry);
            delete this.register[index];
        }
    }

    /**
     * If called, the SpyRegistry will store the given information.
     * The unique identifier index will be returned.
     *
     * @param {Object} obj -> The related object, which will be spied.
     * @param {string} methodName -> The name of the mocked method.
     * @return {number} -> The unique store index.
     */
    push(obj: Object, methodName: keyof typeof obj): number {
        this.registerCount += 1;
        this.register[this.registerCount] = {
            obj,
            method: obj[methodName] as Function,
            methodName,
        };
        return this.registerCount;
    }

    /**
     * If called, the stored method for the corresponding index
     * will be returned. If the registry entry does not exist,
     * undefined will be returned.
     *
     * @param {number} index -> the unique identifier of stored information.
     * @return {any} -> Any stored information can be returned.
     *                   BUT: Usually this method returns a function or
     *                        undefined.
     */
    getOriginalMethod(index: number): Function | void {
        const entry = this.register[index];
        if (entry) {
            return entry.method;
        }
    }

    /**
     * If called, the stored method will be moved from the standard
     * registry into the persistent registry or vice versa.
     * This can make restore and restoreAll having no effect anymore.
     *
     * @param {number} index -> the unique identifier of stored information.
     * @param {boolean} intoPersReg -> boolean to determine the moving
     *                                 direction.
     */
    persist(index: number, intoPersReg: boolean): void {
        const fromReg = intoPersReg ? this.register : this.persReg;
        const toReg = intoPersReg ? this.persReg : this.register;
        const entry = fromReg[index];
        if (entry) {
            toReg[index] = entry;
            delete fromReg[index];
        }
    }
}
