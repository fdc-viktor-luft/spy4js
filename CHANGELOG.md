# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0-beta.2] - 2023-03-17

### Added

- Support for `vitest` and `jest` ESM mode
- `Spy.setup` to set up the library
- Added section about `bun test` in documentation

### Changed

- `Spy.mockModule` removed
- `Spy.mockReactComponents` changed first param type
- side effects removed: `Spy.setup` needs to be invoked
- default configs changed:
  - `enforceOrder`: false -> true
  - `useGenericReactMocks`: false -> true
  - `useOwnEquals`: true -> false
- `Spy.on`, `Spy.mock` and `Spy.mockReactComponents` are now type safe

For more detailed information please see [Migration Guide v4](https://github.com/fdc-viktor-luft/spy4js/blob/master/MIGRATIONGUIDE.md#400)

## [3.4.1] - 2022-05-25

### Fixed

- Only use generated TS declaration files instead of sources to avoid TS errors in peers.

## [3.4.0] - 2022-03-30

### Added

- `spy.hasProps` to check for current props.

## [3.3.2] - 2022-03-21

### Fixed

- Generic React mocks were causing issues due to illegal named properties.

## [3.3.1] - 2022-02-11

### Fixed

- Support nested `describe` suites when using mocks.

## [3.3.0] - 2022-02-09

### Added

- [spy.getLatestCallArgument](//github.com/fdc-viktor-luft/spy4js#getLatestCallArgument)
- [spy.getProps](//github.com/fdc-viktor-luft/spy4js#getProps)
- [Spy.configure](//github.com/fdc-viktor-luft/spy4js#configure-static): New configuration option `useGenericReactMocks`.

## [3.2.0] - 2021-11-24

### Added

- [spy.addSnapshotSerializer](//github.com/fdc-viktor-luft/spy4js#addSnapshotSerializer)

### Fixed

- Serialization of `window` and `document` globals of `jest-dom` caused errors.

## [3.1.5] - 2021-09-16

### Added

- Mocking instructions in case of modules exporting properties with only getters.

### Fixed

- CommonJS and Jest runner detection.

## [3.1.4] - 2021-08-31

### Fixed

- Fix some types after TS update.
- Fix serialization problems of Jest-DOM `HTMLElement`s.

## [3.1.3] - 2021-07-03

### Fixed

- Fix some types for packages using "strict" TS option with value `false` (not recommended).

## [3.1.2] - 2021-07-01

### Fixed

- NextJS stopped working because setting `"type": "module"` in own `package.json` was overriding
  the default of the package importer. Hence, the package could only be used as ESM.

## [3.1.1] - 2021-06-30

### Fixed

- Stricter TS checks and some typing improvements to be included in packages with stricter type
  checking without causing issues.

## [3.1.0] - 2020-11-08

### Added

- Enforce-Order mode

### Changed

- Calling `spy.hasCallHistory()` without any arguments will always fail now and refers to use
  `spy.wasNotCalled()` instead if the spy wasn't called.

## [3.0.0] - 2020-11-01

### Fixed

- `spy.getAllCallArguments` was returning a wrong value.

### Removed

- `flow` support
- `node` support for versions lower than 12

### Added

- Better TS support and improved auto-import for package users.

### Changed

- `new Spy()` -> `Spy()` (`Spy` is no longer a class)

## [2.10.0] - 2019-11-06

### Added

- `spy.getAllCallArguments`: Provides a little more flexibility when observing call arguments.

## [2.9.1] - 2019-11-04

### Fixed

- Fixed node module resolution for `Spy.mockModule`

## [2.9.0] - 2019-11-03

### Added

- `Spy.MAPPER`: A nice shortcut variant of `Spy.COMPARE` to test the output of given function
  depending on some defined input. See
  [here](https://github.com/fdc-viktor-luft/spy4js#mapper-static) for more details.

## [2.8.0] - 2019-11-03

### Added

- `Spy.mockModule`: Allows you to mock functions on module level. Can replace the usage of
  `jest.mock` in most situations. One example:

  ```js
  // some module with name "my-module.js"
  export const useMe = (some: string) => 'foo' + some;

  // testing somewhere else
  const Mock$MyModule = Spy.mockModule('../my-stuff/my-module', 'useMe');

  Mock$MyModule.useMe.returns(42);

  expect(useMe('test')).toBe(42);

  Mock$MyModule.useMe.hasCallHistory('test');
  ```

## [2.7.0] - 2019-11-03

### Changed

- More detailed error messages. 
  - Before: `--> foo / different string` 
  - Now: `--> foo / different string ['bar' != 'test']`
- Improved UX for `Spy.COMPARE`. You can make assertions that throw instead of returning a 
  boolean indicator. E.g.

  ```js
  spy.wasCalledWith(Spy.COMPARE(fn => {
      expect(fn()).toEqual({ foo: 'bar' });
  }));
  ```

## [2.6.1] - 2019-08-26

### Changed

- Allow to spy on all kind of bound methods (e.g. `window.console.error` which is no 
  instance of `Function` on JSDom)

## [2.6.0] - 2019-08-15

### Added

- Improved comparison for BigInt and AsyncFunction

## [2.5.0] - 2019-05-21

### Added

- TypeScript support

### Changed

- Improved types for `Spy.on` and `Spy.mock` (this might lead to new type errors)

## [2.3.2] - 2019-03-01

### Changed

- improved IDE support by distributing with Rollup

## [2.3.1] - 2018-12-05

### Added

- Snapshot serialization for `jest` snapshots improved

## [2.2.0] - 2018-12-02

### Added

- `Spy.resetAll`: Calls the reset for all ever instantiated spies.

### Changed

- The default `afterEach` Test-Suite-Hook now also calls `Spy.resetAll`. Therefore created 
  spies should not be able to effect other tests. Since the reset operation is a very cheap 
  operation, this change should not effect the performance of your tests visibly. If any of 
  your tests should break, consider to clean those up, because you should not write 
  conditionally related tests, if it is avoidable.

## [2.1.0] - 2018-11-12

### Added

- Added scopes to mocks: You may use different mocks within different `describe` blocks.

## [2.0.0] - 2018-11-11

### Added

- [Migration Guide](https://github.com/fdc-viktor-luft/spy4js/blob/master/MIGRATIONGUIDE.md#200)
- `Spy.mock`: Create mocks for more control, clarity and developer comfort
- `Spy.initMocks`: Hereby your created mocks are initialized (but you do need to call it manually)
- Default Test Suite Hooks: `beforeEach(Spy.initMocks)` and `afterEach(Spy.restoreAll)` are applied
  to each test suite automatically as soon as you use any spies. (very small runtime overhead)

## [1.9.0] - 2018-11-08

### Added

- `spy.returns` reduces the overhead when resolving promises for e.g. any spied async functions
- `spy.rejects` reduces the overhead when rejecting promises for e.g. any spied async functions

## [1.8.0] - 2018-10-22

### Added

- `Spy.COMPARE` to apply custom comparators into arbitrary nested objects to make any equality assumptions.

### Changed

- `spy.hasCallHistory` has now a slightly optimized error messages.

## [1.7.0] - 2018-09-13

### Changed

- `spy.hasCallHistory` has now a slightly modified interface.
- Improved error visualisation for `spy.hasCallHistory` and `spy.wasCalled`

## [1.6.0] - 2018-07-08

### Changed

- Moved serializer into a separate package `serialize-as-code`

## [1.5.0] - 2018-06-23

### Added

- Basic serialization of React JSX

## [1.4.0] - 2018-06-17

### Added

- `spy.hasCallHistory` as more explicit check on call count and order.

## [1.3.2] - 2017-11-21

### Fixed

- Treating a property with undefined value the same as a not existing property

### Added

- Implemented an own serializer to render any objects

## [1.3.0] - 2017-11-17

### Added

- `Spy.IGNORE` as flexible replacement for object properties or whole arguments which should be
  ignored on comparison with `spy.wasCalledWith`
  
### Fixed

- Instead of rendering `undefined` just like `null` as `null` it will be rendered as the string "UNDEFINED"

## [1.2.2] - 2017-10-29

### Fixed

- Comparing Functions returns only equality if functions are identical
