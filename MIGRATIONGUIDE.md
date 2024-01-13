# Migration Guide

You can find here tips for migrating breaking changes.

## 4.0.0

The library was previously causing side effects on import. This behavior changed now and requires manual
invocation of `Spy.setup()`. This can be done ideally in some central setup file for all of your tests.

The default configuration changed now. In order to continue using the previous defaults, you can do this:

```ts
Spy.setup({ enforceOrder: false, useGenericReactMocks: false, useOwnEquals: true });
```

The method `Spy.initMocks` was removed now as it was previously already more of an internal function. Mocks
get initialized in test runner or provided `beforeEach` callbacks. This also means that `Spy.mock`,
`Spy.mockReactComponents` cannot be invoked anymore inside the `test` (`it`) function.

The library was also doing some custom module mocking that is no longer maintainable considering that it
was based on CommonJS and does not work with `vitest` or the new (still experimental) ESM mode from `jest`.

The method `Spy.mockModule` was removed. To achieve the same you need to transform like this:

```ts
Spy.mockModule('./my-module', 'foo'); // OLD
Spy.mock(require('./my-module'), 'foo'); // NEW
Spy.mock(require('./my-module') as typeof import('./my-module'), 'foo'); // with type safety

```

The method `Spy.mockReactComponents` uses also no build-in module mocks anymore and requires this change:

```ts
Spy.mockReactComponents('./my-module', 'MyComponent'); // OLD
Spy.mockReactComponents(require('./my-module'), 'MyComponent'); // NEW
Spy.mockReactComponents(require('./my-module') as typeof import('./my-module'), 'MyComponent'); // with type safety
```

Please note that it is rather recommended to use `await import('./my-module')` syntax with build-in type-safety
that is explained in the main documentation.

Since mocks are type safe now, you might need to fix some type issues or have to cast the mocked instance to `any`
as it was before and lose the type safety. E.g. just using `require('./my-module')`
or this `(await import('./my-module')) as any`.

## 3.0.0

- `new Spy()` -> `Spy()`

## 2.0.0

- If you have previously added an own hook, which called `Spy.restoreAll` after each test suite, you may remove it.
- If you get troubles with the automatically added test hooks, you can override/remove it by usage of `Spy.configure`
- If you have used `Spy.onMany` you have to switch to `Spy.mock`. Depending on your special case, this can get aweful. Here an example, how someone could accomplish it. Let's assume this v1 code:

```js
describe('Test', () => {
    let spy1 = new Spy();
    let spy2 = new Spy();

    beforeEach(() => {
        [spy1, spy2] = Spy.onMany(LOG, 'error', 'info');
    });

    it('logs an info if job runs', () => {
        // run the job (...)
        spy1.wasNotCalled();
        spy2.hasCallHistory('job finished');
    });
});
```

This can be changed to:

```js
// I recommend to initialize mocks ouside of the describe-Block (or update to 2.1 which includes scoped mocks)
const Mock$LOG = Spy.mock(LOG, 'error', 'info');

describe('Test', () => {
    it('logs an info if job runs', () => {
        // run the job (...)
        Mock$LOG.error.wasNotCalled();
        Mock$LOG.info.hasCallHistory('job finished');
    });
});
```

Notice how much more readable the test code became. Have fun :v:
