/**
 * Stryker Mutation Testing Configuration
 * Al-Shaye Family Tree Application
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  // Package manager
  packageManager: 'npm',

  // Test runner
  testRunner: 'jest',
  testRunnerNodeArgs: ['--experimental-vm-modules'],

  // Reporters
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],

  // Files to mutate
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    // Exclude test files
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    // Exclude types and configs
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/**/constants.ts',
    // Exclude generated files
    '!src/generated/**',
    // Exclude layout and error boundaries (mostly UI)
    '!src/app/**/layout.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
  ],

  // Jest-specific configuration
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    config: {
      testEnvironment: 'jest-environment-jsdom',
    },
  },

  // Mutation thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail if mutation score drops below 50%
  },

  // Concurrency
  concurrency: 4,

  // Timeouts
  timeoutMS: 60000,
  timeoutFactor: 2.5,

  // Incremental mode for faster subsequent runs
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json',

  // Dashboard configuration (for CI integration)
  dashboard: {
    project: 'github.com/alshaya00/Alshaya',
    version: 'main',
    module: 'family-tree',
    reportType: 'full',
  },

  // Ignore patterns for specific mutations that are not valuable
  ignorePaths: [
    // Ignore console logs
    '**/console.*',
  ],

  // Disable specific mutators if needed
  // mutator: {
  //   excludedMutations: ['StringLiteral'],
  // },

  // Clear text reporter options
  clearTextReporter: {
    allowColor: true,
    logTests: true,
    maxTestsToLog: 3,
  },

  // HTML reporter options
  htmlReporter: {
    fileName: 'reports/mutation/mutation-report.html',
  },

  // Temp directory
  tempDirName: '.stryker-tmp',

  // Clean temp files
  cleanTempDir: true,

  // Log level
  logLevel: 'info',

  // Coverage analysis
  coverageAnalysis: 'perTest',

  // Disable bail (continue even on errors)
  disableBail: false,

  // Plugins
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker',
  ],

  // TypeScript checker
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',

  // Warning configuration
  warnings: true,
};

export default config;
