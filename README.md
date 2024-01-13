[![GitHub license][license-image]][license-url]
[![npm package][npm-image]][npm-url]
[![GitHub Push][push-image]][push-url]
[![Coverage Status][coveralls-image]][coveralls-url]

# ![spy4js logo](spy-logo.svg?sanitize=true) spy4js

### Benefits

- `TypeScript` support included
- Performance
- No foreign dependencies
- Optimized error messages
- Customizable
- Intuitive
- Used in production of large projects

### Introduction

**spy4js** provides a stand-alone spy framework that can be integrated well with the frameworks
[Vitest](https://vitest.dev/) and [Jest](https://jestjs.io/).

⚠️ Disclaimer: You don't need this library as the frameworks already include everything in order
to achieve everything without this library.

**spy4js** exports only one object called `Spy`. The spy instances
come with a lot of useful features. See below for more.

**Hint**:
If you are using other frameworks you might not be able to benefit from all features of this library.
Since the test frameworks already include excellent spies themselves, you might ask yourself, why `spy4js`... 

Because it can make your tests more readable.

Advantages over Jest/Vitest spies:

- Very important for tests is their readability. This spy API is much easier to learn, and
  the tests can be understood even without any previous knowledge.
- Error messages should be extremely helpful, because development time is very valuable.
  In error cases made comparisons will be printed with detailed information.
- The used serialization for objects can be directly copied into your test code, which increases
  your speed while writing tests.
- Last but not least there are several nice features Jest doesn't provide out-of-the-box, and you
  could even combine both spy sorts.

### Installation

##### With yarn

```sh
yarn add --dev spy4js
```

##### With npm

```sh
npm install --save-dev spy4js
```

### Interface

A spy instance can be initialized differently.

```ts
import { Spy } from 'spy4js';

// initialize directly
const spy1 = Spy();

// initialize directly and supply an identifier for debugging purpose (default: 'the spy')
const spy2 = Spy('special spy for me');

// initialize by mocking another objects attribute (usually this attribute is a function)
const someObject1 = new Date(2017, 1, 15);
const spy3 = Spy.on(someObject1, 'toJSON');
// (spy name will be accordingly: "the spy on 'toJSON'")

// initialize many by mocking another objects attributes
const someObject2 = new Date(2017, 1, 15);
const someObject2$Mock = Spy.mock(someObject2, 'toJSON', 'toString', 'getDate');

// mock exported functions from other modules
// if your test runner executes with CJS
const myModuleMocksInJest = Spy.mock(require('./my-module'), 'useMe');
const myModuleMocksInJestTypeSafe = Spy.mock(require('./my-module') as typeof import('./my-module'), 'useMe');

// if your test runner supports ESM
vi.mock('./my-module', async () => ({ ...((await vi.importActual('./my-module')) as any) }));
const myModuleMocksInVitest = Spy.mock(await import('./my-module'), 'useMe');

// mock React components from other modules
// if your test runner executes with CJS
const mockedReactComponentsInJest = Spy.mockReactComponents(require('./my/fancy/Calculator'), 'Calculator');
const mockedReactComponentsInJestTypeSafe = Spy.mockReactComponents(
  require('./my/fancy/Calculator') as typeof import('./my/fancy/Calculator'), 
  'Calculator'
);

// if your test runner supports ESM
vi.mock('./my/fancy/Calculator', async () => ({ ...((await vi.importActual('./my/fancy/Calculator')) as any) }));
const mockedReactComponentsInVitest = Spy.mockReactComponents(await import('./my/fancy/Calculator'), 'Calculator');
```

You may apply additional behavior to every spy. The valid operations here are:

- `configure` (allows to override some behavior of the spy)
- `calls` (does make the spy call the provided functions sequentially)
- `returns` (does make the spy return the provided params sequentially)
- `throws` (does make the spy throw an error when called)
- `resolves` (does make the spy resolve the provided params sequentially) #Promise
- `rejects` (does make the spy reject an error when called) #Promise
- `transparent` (does make the spy call the original method of a mocked object)
- `transparentAfter` (does make the spy call the original method of a mocked object after a certain amount of made calls)
- `reset` (resets the registered calls which were already made)
- `restore` (does make the spy restore the mocked object)
- `addSnapshotSerializer` (defines in `jest` snapshots how the spy will be serialized)

All those methods on a spy has been designed in a builder pattern. So you may chain any of
these configurations. Be aware some behaviors override existing behaviors.

```ts
const spy = Spy.on(someObject, 'someMethod');

// configure it to use NOT own "equals" implementations
spy.configure({ useOwnEquals: false });

// make it call any functions
spy.calls(func1, func2, func3);
someObject.someMethod(arg); // returns func1(arg)
someObject.someMethod(arg1, arg2); // returns func2(arg1, arg2)
someObject.someMethod(arg); // returns func3(arg)
someObject.someMethod(arg1, arg2, arg3); // returns func3(arg1, arg2, arg3) // sticks to the last

// make it return any values
spy.returns(value1, value2);
someObject.someMethod(arg); // returns value1
someObject.someMethod(arg1, arg2); // returns value2
someObject.someMethod(arg); // returns value2 // sticks to the last

// make it throw any message (the message is optional)
spy.throws('throw this');
someObject.someMethod(arg); // throws new Error('throw this')

// make it return always the current date and transparentAfter 2 calls
spy.calls(() => new Date()).transparentAfter(2);
someObject.someMethod(arg); // returns new Date()
someObject.someMethod(arg1, arg2); // returns new(er) Date()
someObject.someMethod(arg); // returns someObject.someMethod(arg) // sticks to this behavior

// make it immediatly transparent
spy.transparent();

// make it reset
spy.reset();

// make it restore
spy.restore(); // other than "transparent" does not control input and output of the mocked function anymore
```

Even as important are the "facts", we want to display:

- `wasCalled` (does display that the spy has been called a specifiable amount of times)
- `wasNotCalled` (does display that the spy has never been called)
- `wasCalledWith` (does display that the spy has been called at least once like with the provided params)
- `wasNotCalledWith` (does display that the spy was never like with the provided params)
- `hasCallHistory` (does display that the spy has been called with the following params in the given order)
- `hasProps` (does display that the spy has been called with the given argument on the last invocation. In the
                context of React: The spy being a mocked React component has currently the given props.)

Those methods on a spy display facts. Facts have to be true, otherwise they
will throw an Exception, which displays in a formatted debug message why the
given fact was a lie. By writing those facts in your tests, a big refactoring
loses its scare.

```ts
const spy = Spy();

spy.wasNotCalled();

spy([1, 'test', {attr: [4]}]);

spy.wasCalled();  // called at least once
spy.wasCalled(1); // called exactly once

spy('with this text');

spy.wasCalled(2); // called exactly 2 times

// the spy was called at least once with equal params
spy.wasCalledWith([1, 'test', {attr: [4]}]);

// the spy was not called with those params
spy.wasNotCalledWith([1, 'test', {attr: [3]}]);

// the spy was called twice with the following params and in same order
spy.hasCallHistory([ [1, 'test', {attr: [4]}] ], 'with this text');
```

Sometimes it is necessary to have access to some call arguments with
which the spy had been called.

- `getAllCallArguments` (returns all call arguments for all calls in an array containing arrays)
- `getCallArguments` (returns all call arguments for a specified call in an array)
- `getCallArgument` (same as getCallArguments, but returns only a single element of the array)
- `getLatestCallArgument` (same as getCallArgument, but for the latest call)
- `getProps` (same as getLatestCallArgument, but only for the first param. Can be useful for mocked React components)
- `getCallCount` (returns the number of made calls)

```ts
const spy = Spy();

// make some calls
spy('string', 1);
spy([1, 2, 3]);
spy();
spy(null);

spy.getAllCallArguments();     // returns [['string', 1], [[1, 2, 3]], [], [null]]
spy.getCallCount();     // returns 4
spy.getCallArguments(/* default = 0 */);     // returns ['string', 1]
spy.getCallArgument(/* defaults = (0, 0) */); // returns 'string'
spy.getCallArgument(0, 1); // returns 1

spy.getCallArguments(1);                     // returns [[1, 2, 3]]
spy.getCallArgument(1);                 // returns [1, 2, 3]

spy.getCallArguments(2);                     // returns []
spy.getCallArgument(2);                 // returns undefined

spy.getCallArguments(3);                     // returns [null]
spy.getCallArgument(3);                 // returns null

spy.getCallArguments(4);                     // throws Exception because less calls were made
spy.getCallArgument(4);                 // throws same Exception
```

The last method is `showCallArguments`. It is mostly used internally to improve the
debugging messages, but can be while you are in a console.log-mania.

## Method-Details

### Constructor

```ts
Spy(spyName:string = 'the spy') => SpyInstance
```

The returned Spy instance has his own name-attribute (only) for debugging purpose.

### setup (static)

```ts
Spy.setup(config: {
    useOwnEquals?: boolean;
    enforceOrder?: boolean;
    useGenericReactMocks?: boolean;
    afterEachCb?: () => void;
    afterEach?: (cb: () => void) => void;
    beforeEach?: (cb: () => void) => void;
    expect?: { addSnapshotSerializer: (serializer: any) => void; getState: () => { currentTestName?: string } };
    runner?: 'jest' | 'vitest' | 'other';
}) => void
```

This function should be ideally called in some setup-test file, but is required to be called to get all
benefits of `spy4js`.

- **afterEach**: The test runners `afterEach` hook (default: `global.afterEach`)
- **beforeEach**: The test runners `beforeEach` hook (default: `global.beforeEach`)
- **runner**: The test runner name (default: determines if "jest" or "vitest")

For the other options see [below](#configure-static).

### configure (static)

```ts
Spy.configure(config: {
    useOwnEquals?: boolean;
    enforceOrder?: boolean;
    useGenericReactMocks?: boolean;
    afterEachCb?: () => void;
}) => void
```

Using this function you may edit the default behavior `spy4js` itself.

- **useOwnEquals**: Applies for all spy instances. See [configure](#configure) for more details.
- **enforceOrder**: Opt-in to the [enforce-order mode](#enforce-order-mode).
- **useGenericReactMocks**: Lets you opt in into using generic react components for mocks
  created via [mockReactComponents](#mockreactcomponents-static).
- **afterEachCb**: Lets you override the default afterEach fuctionality.

### on (static)

```ts
Spy.on(object: object, methodName: string) => SpyInstance
```

Initializing a spy on an object, simply replaces the original function by a spy and
stores the necessary information to be able to restore the mocked method.

If the attribute has already been spied or is not a function, the Spy will throw an exception
to avoid unexpected behavior. You never want to spy other attributes than functions and
for no purpose a spy should ever be spied.

### mock (static)

```ts
Spy.mock(object: object, ...methodNames: string[]) => Object (Mock)
```

Creating an object that references spies for all given methodNames.
Initialize as many spies as required for the same object. Only
after `Spy.initMocks` gets called, the created mock does affect the given object.

### mockReactComponents (static)

```ts
Spy.mockReactComponents(object: object, ...methodNames: string[]) => Object (Mock)
```

Same as [mock](#mock-static) but designed for ReactJS components. The registered
spies return `null` instead of `undefined`. This makes minimal usable React components.
Even if in most cases the pure mocking is nice enough, you can even test the number
of rerender cycles and the provided props of the mocked component. Works perfectly
with [enzyme](https://www.npmjs.com/package/enzyme) and
[@testing-library/react](https://testing-library.com/docs/react-testing-library/intro).

### initMocks (static)

```ts
Spy.initMocks(scope?: string) => void
```

Does initialize all global and scope-related mocks by applying spies. Mocks can be
created with [mock](#mock-static) or [mockReactComponents](#mockreactcomponents-static). This function has not to
be called manually, if you rely on the default test suite hooks.

### restoreAll (static)

```ts
Spy.restoreAll() => void
```

Does restore all mocked objects to their original state. See [restore](#restore) for
further information. This function has not be called manually, if you rely on
the default test suite hooks.

### resetAll (static)

```ts
Spy.resetAll() => void
```

Does reset all existing spies. This applies even to persistent spies.
See [reset](#reset) for further information. This function has not to be
called manually in between different tests, if you rely on the default
test suite hooks.

### IGNORE (static)

```ts
Spy.IGNORE = $Internal Symbol$
```

This object can be passed anywhere where you want the "[wasCalledWith](#wascalledwith-fact)"
or "[hasCallHistory](#hascallhistory-fact)" to ignore that object or value for comparison.

```ts
spy({prop: 'value', other: 13}, 12);

spy.wasCalledWith(Spy.IGNORE, 12);
spy.wasCalledWith({prop: Spy.IGNORE, other: 13}, 12);
```

### COMPARE (static)

```ts
Spy.COMPARE(comparator: (arg: any) => boolean | void) => SpyComparator
```

This function can be called with a custom comparator and passed anywhere where you want the "[wasCalledWith](#wascalledwith-fact)"
or "[hasCallHistory](#hascallhistory-fact)" to apply your custom comparison. Very useful if
the spy gets called with functions that you want to test additionally.

```ts
spy(() => ({ prop: 'value', other: 13 }), 12);

spy.wasCalledWith(Spy.COMPARE(fn => fn().prop === 'value'), 12);
spy.wasCalledWith(Spy.COMPARE(fn => {
    expect(fn()).toEqual({ prop: 'value', other: 13 });
}), 12);
```

### MAPPER (static)

```ts
Spy.MAPPER(from: any | any[], to: any) => SpyComparator
```

This function can be called in the same places like `Spy.COMPARE`. It is not that much
customizable but provides a nice way to evaluate mapper functions. Meaning pure
functions that return some output for given inputs. The function will be called exactly
once for each comparison, so you can even rely on site effects you might want to test,
if you want to use this for non-pure functions.

```ts
spy((value: number) => ({ prop: 'here', other: value }), 12);
spy((value: number, num: number) => ({ prop: 'here', value, num }), 12);

spy.wasCalledWith(Spy.MAPPER('foo', { prop: 'here', other: 'foo' }), 12);
spy.wasCalledWith(Spy.MAPPER(['foo', 44], { prop: 'here', value: 'foo', num: 44 }), 12);
```

### configure

```ts
spy.configure(config: { useOwnEquals?: boolean, persistent?: boolean }) => (this) SpyInstance
```

With `configure` the spy can be configured. One configuration possibility
is to ignore any `equals` methods while comparing objects. There might be libraries which
come with those methods, but do not support ES6 classes or anything else. By default, this
configuration has been set to favor own `equals` implementations while comparing objects.

Another possible configuration is to make the spy persist while other spies have to restore
when ["restoreAll"](#restoreall-static) was called. This spy can ONLY RESTORE the mocked object when
you configure it back to be NOT PERSISTENT. This configuration can only be applied to mocking
spies. For Spies created with `Spy()` this configuration will throw an exception.

### calls

```ts
spy.calls(...functions:Array<Function>) => (this) SpyInstance
```

The provided functions will be called sequentially in order when the spy will be called.
Meaning `spy.calls(func1, func2, func3)` will call first `func1` then `func2` and the rest
of the time `func3`.

### returns

```ts
spy.returns(...args: Array<any>) => (this) SpyInstance
```

The provided arguments will be returned sequentially in order when the spy will be called.
Meaning `spy.returns(arg1, arg2, arg3)` will return first `arg1` then `arg2` and the rest
of the time `arg3`.

### resolves

```ts
spy.resolves(...args: Array<any>) => (this) SpyInstance
```

The provided arguments will be resolved sequentially in order when the spy will be called.
Meaning `spy.resolves(arg1, arg2, arg3)` will return first `Promise.resolve(arg1)` then `Promise.resolve(arg2)` and the rest
of the time `Promise.resolve(arg3)`.

### rejects

```ts
spy.rejects(...args: Array<?string | Error>) => (this) SpyInstance
```

The provided arguments will be rejected sequentially in order when the spy will be called.
Meaning `spy.rejects('foo', null, new Error('bar'))` will return first `Promise.reject(new Error('foo'))`
then `Promise.reject(new Error('<SPY_NAME> was requested to throw'))` and the rest
of the time `Promise.reject(new Error('bar'))`.

### throws

```ts
spy.throws(message: ?string | Error) => (this) SpyInstance
```

Perform this on a spy to make it throw an error when called. The error message can be
provided, but a default has also been implemented. If an Error instance will be passed,
exactly this one will be thrown.

### reset

```ts
spy.reset() => (this) SpyInstance
```

Does reset the registered calls on that spy.

### restore

```ts
spy.restore() => (this) SpyInstance
```

Restores the spied object, if existing, to its original state. The spy won't lose any
other information. So it is still aware of made calls, can be plugged anywhere else
and can still be called anywhere else, but it loses all references to the spied object.

If the spy has been configured persistent this method will throw an error.

### transparent

```ts
spy.transparent() => (this) SpyInstance
```

Can be useful with spies on objects. It does make the spy behave like not existing. So
the original function of the "mocked" object will be called, but the spy does remember
the call information.

### transparentAfter

```ts
spy.transparentAfter(callCount:number) => (this) SpyInstance
```

Works like [transparent](#transparent) but the spy will get transparent after called as
often as specified. Meaning `spy.transparentAfter(num)` will not be transparent on the first
`num` calls.

### addSnapshotSerializer

```ts
spy.addSnapshotSerializer(serialize: string | ((...args: any[]) => string)) => (this) SpyInstance
```

Determines the rendered output of `jest` snapshots when the certain spy would get rendered.

### wasCalled (fact)

```ts
spy.wasCalled(callCount: number = 0) => void
```

This call does display a fact. So if the spy is violating the fact, it is told to throw
an error. The provided argument does represent the registered calls on that spy.

### wasNotCalled (fact)

```ts
spy.wasNotCalled() => void
```

This fact displays that the spy has never been called. Directly after the spy was [reset](#reset)ed,
this fact will be given.

### wasCalledWith (fact)

```ts
spy.wasCalledWith(...args: Array<any>) => void
```

This fact displays that the spy has been called at least once with equal arguments.

The equality check is a deep equality check, which (by default) does consider
own "equals" implementations.

By supplying `Spy.IGNORE` anywhere inside the expected call arguments, you
can avoid that the comparison will be further executed. See [Spy.IGNORE](#ignore-static) for further information and examples.

The deep equality check does also recursively iterate to the first difference found and is able
to return a string which contains valuable information about the first found difference.

If any difference will be detected, the fact isn't true, and a helpful error message will be displayed.
If using monospaced consoles for the output which do support new lines, there will be really
neat output. For examples see [showCallArguments](#showcallarguments).

### wasNotCalledWith (fact)

```ts
spy.wasNotCalledWith(...args: Array<any>) => void
```

This fact displays simply the opposite of [wasCalledWith](#wascalledwith-fact).

### hasCallHistory (fact)

```ts
spy.hasCallHistory(...callHistory: Array<Array<any> | any>) => void
```

Works similar to [wasCalledWith](#wascalledwith-fact) but instead matches each
call one by one in **correct order** and **correct call count**.
ATTENTION: single argument calls can be provided without wrapping into an array. E.g. if
the single argument is an array itself, then you have to warp it also yourself. (Inspired by jest
data providers)

### hasProps (fact)

```ts
spy.hasProps(props: any) => void
```

This fact displays that the spy has currently the given props in React context of a mocked component.

This is the corresponding fact for [getProps](#getprops) using the spy diffing.

### getAllCallArguments

```ts
spy.getAllCallArguments() => Array<any[]>
```

Returns the call arguments of all made calls to the spy.
Especially returning an empty array if the spy has never been called.

### getCallArguments

```ts
spy.getCallArguments(callNr: number = 0) => Array<any>
```

Returns the call arguments that were registered on the given call. Meaning
`spy.getCallArguments(num)` does return the (num + 1)'th call arguments.

Throws an exception if the provided (`callNr` - 1) is bigger than the made calls.

### getCallArgument

```ts
spy.getCallArgument(callNr: number = 0, argNr: number = 0) => any
```

Same as [getCallArguments](#getcallarguments) but returns only a single entry out
of the array of arguments. Most useful in situations where exactly one call param is expected.
If `argNr` is given, it returns the (argNr + 1)'th argument of the call.

### getLatestCallArgument

```ts
spy.getLatestCallArgument(argNr: number = 0) => any
```

Same as [getCallArgument](#getcallargument) but uses only the latest call.

### getProps

```ts
spy.getProps() => any
```

Same as [getLatestCallArgument](#getlatestcallargument) but uses only the first arg. Can be useful in
combination with [mockReactComponents](#mockreactcomponents-static).

### getCallCount

```ts
spy.getCallCount() => number
```

This method simply returns the number of made calls on the spy.

### showCallArguments

```ts
spy.showCallArguments(additionalInformation: Array<string> = []) => string
```

This primarily internally used method is responsible for returning formatted informative debug
messages when facts aren't true. Let's do an example:

```ts
const spy = Spy('my awesome spy');
spy(42, 'test', { attr1: [1, 2, new Date(2017, 1, 20)], attr2: 1337 });
spy(42, 'test', { attr1: [0, 2, new Date(2017, 1, 20)], attr2: 1336 });
spy(42, 'test', { attr1: [1, 2, new Date(2017, 1, 21)], attr2: 1336 });
spy(42, 'tes', { attr1: [1, 2, new Date(2017, 1, 20)], attr2: 1336 });
spy(42, 'test');
```

The following broken fact...

```ts
spy.wasCalledWith(42, 'test', {attr1: [1, 2, new Date(2017, 1, 20)], attr2: 1336});
```

...would produce the following error output:

```text
Error: 

my awesome spy was expected to be called with the following arguments:

    --> [42, 'test', {attr1: [1, 2, new Date(1487545200000)], attr2: 1336}]

Actually there were:

call 0: [42, 'test', {attr1: [1, 2, new Date(1487545200000)], attr2: 1337}]
        --> 2 / attr2 / different number [1337 != 1336]
call 1: [42, 'test', {attr1: [0, 2, new Date(1487545200000)], attr2: 1336}]
        --> 2 / attr1 / 0 / different number [0 != 1]
call 2: [42, 'test', {attr1: [1, 2, new Date(1487631600000)], attr2: 1336}]
        --> 2 / attr1 / 2 / different date [new Date(1487631600000) != new Date(1487545200000)]
call 3: [42, 'tes', {attr1: [1, 2, new Date(1487545200000)], attr2: 1336}]
        --> 1 / different string ['tes' != 'test']
call 4: [42, 'test']
        --> 2 / one was undefined [undefined != {attr1: [1, 2, new Date(1487545200000)], attr2: 1336}]
```

There you can see that the arguments of the fact (displayed above all others) does not
match any of the call arguments on the 5 made calls.

For each call we display additional error information (the first found difference).
If the additional information begins with a `-->` there was made a deep equality.
If you would travers with the displayed keys you would be directed to those objects which differ.

In this example the arguments differ for `call 0` in `-->` the third argument (`2`) and
its attribute `attr2` because there was a different number.

While recursively traversing down in the deep equality check, the object keys will be reported.
Meaning that `2` is representing the index of the array. So for example if you want to grep the
different objects you could:

```ts
const callArgs = spy.getCallArguments(0/* for the 0'th call above*/);
const differentNumber = callArgs[2]['attr2'];
```

## Enforce-Order Mode

You can opt-in to the enforce-order mode. Which might become the default in some
future version but will need first further evaluation and will always stay configurable.

```ts
Spy.configure({ enforceOrder: true });
```

This mode enforces that the "facts" will be called in the correct order.

```ts
// success
spy1();
spy2();
spy1.wasCalled();
spy2.wasCalled();

// error
spy1();
spy2();
spy2.wasCalled();
spy1.wasCalled(); // would fail here because spy1 wasn't called after spy2 was called
```

Be aware "facts" that you might need to get used to it, because the following would be valid, too.

```ts
// success
spy();
spy.wasCalled();
spy.wasNotCalled();

// error
spy();
spy.wasCalled();
spy.wasCalled(); // would fail here because we already checked that the spy was called
```

Nevertheless, this mode should make your tests more readable and clear, because you can avoid
checking the same things on and on again or resetting the spies in tests. Another example:

```ts
const mock_WS = Spy.mock(WS, 'fetchData', 'fetchFallback');

it('fetches fallback data if fetching data does not work', async () => {
    // given
    const dummyData = Symbol('dummyData'); 
    mock_WS.fetchData.rejects('ups');
    mock_WS.fetchFallback.resolves(dummyData);

    // when
    expect(await MyService.fetchAppData({ filtered: true })).toBe(dummyData);

    // then
    mock_WS.fetchData.hasCallHistory({ filtered: true }, { filtered: true, retry: true });
    mock_WS.fetchFallback.wasCalledWith({ filtered: true, reason: 'ups' });
});
```

## Bun Support

[`bun`](https://bun.sh/) includes an alternative fast runtime to NodeJS.
In order to use this library with `bun test`, you need to add a `bunfig.toml` with
a preload script:

```toml
[test]
preload = "./bun-preload.ts"
```

And the preload script should implement missing test APIs. At the time of writing that would be
at least this:

```ts
// necessary until Bun has implemented them
expect.addSnapshotSerializer = () => null;
expect.getState = () => ({}) as any;
```

**⚠️ Disclaimers:**

- You cannot call `Spy.setup()` in a single place inside of the preload script as the `beforeEach` hook of
  will be differently scoped, when you want/need to support scoped mocks. However, you can call the `Spy.setup`
  again in the tests where you need scoped mocks and provide it a new `beforeEach` hook.
- Since `expect.getState` is not correctly implemented, you will not be prevented correctly from instantiating mocks
  inside of test runs.

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/fdc-viktor-luft/spy4js/blob/master/LICENSE
[push-image]: https://github.com/fdc-viktor-luft/spy4js/actions/workflows/push.yml/badge.svg
[push-url]: https://github.com/fdc-viktor-luft/spy4js/actions/workflows/push.yml
[npm-image]: https://img.shields.io/npm/v/spy4js.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/spy4js
[coveralls-image]: https://coveralls.io/repos/github/fdc-viktor-luft/spy4js/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/fdc-viktor-luft/spy4js?branch=master
