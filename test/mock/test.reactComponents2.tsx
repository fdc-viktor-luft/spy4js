import React from 'react';
import { Component1 } from './test.reactComponents';

// only if its a separate file the mocking works reliable in jest
export const Component3: React.FC = () => (
    <div id={'component-3'}>
        <Component1 foo={'in-component-3'} />
    </div>
);
