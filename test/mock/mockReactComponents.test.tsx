import React from 'react';
import { Spy } from '../../src/spy';
import { Component1, Component2, Component3 } from './test.reactComponents';
import { render } from '@testing-library/react';

describe('mockReactComponents - minimal', () => {
    Spy.configure({ useGenericReactMocks: false });
    const Mock$TestReactComponents = Spy.mockReactComponents('./test.reactComponents', 'Component1', 'Component2');

    it('mocks as plain function', () => {
        expect(Component1({ foo: 'bar' })).toBe(null);
        Mock$TestReactComponents.Component1.wasCalledWith({ foo: 'bar' });
    });

    it('renders component snapshot - nested mocks', () => {
        const { container } = render(
            <Component2>
                <Component1 foo={'bar'} />
            </Component2>
        );
        expect(container).toMatchSnapshot();
    });

    it('renders component snapshot - contained mock', () => {
        const { container } = render(<Component3 />);
        expect(container).toMatchSnapshot();
    });
});

describe('mockReactComponents - generic', () => {
    Spy.configure({ useGenericReactMocks: true });
    const Mock$TestReactComponents = Spy.mockReactComponents('./test.reactComponents', 'Component1', 'Component2');

    it('mocks as plain function', () => {
        expect(Component1({ foo: 'bar' })!.props.foo).toBe('bar');
        Mock$TestReactComponents.Component1.wasCalledWith({ foo: 'bar' });
    });

    it('renders component snapshot - nested mocks', () => {
        const { container } = render(
            <Component2>
                <Component1 foo={'bar'} />
            </Component2>
        );
        expect(container).toMatchSnapshot();
    });

    it('renders component snapshot - contained mock', () => {
        const { container } = render(<Component3 />);
        expect(container).toMatchSnapshot();
    });
});
