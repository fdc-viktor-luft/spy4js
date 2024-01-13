export default {
    testMatch: ['<rootDir>/test/**/(*.)jest.ts?(x)'],
    testEnvironment: 'jsdom',
    transform: { '\\.(js|jsx|ts|tsx)$': '@sucrase/jest-plugin' },
};
