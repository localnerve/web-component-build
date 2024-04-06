import js from '@eslint/js';
import jest from 'eslint-plugin-jest';
import globals from 'globals';

export default [
  {
    files: [
      '__tests__/fixtures/**/*'
    ],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: [
      '__tests__/**/*.spec.js'
    ],
    ...jest.configs['flat/recommended'],
    languageOptions: {
      globals: {
        ...jest.configs['flat/recommended'].languageOptions.globals,
        ...globals.node
      }
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/no-conditional-expect': 'off'
    }
  },
  js.configs.recommended,
  {
    rules: {
      indent: [2, 2, {
        SwitchCase: 1,
        MemberExpression: 1
      }],
      quotes: [2, 'single'],
      'dot-notation': [2, {allowKeywords: true}]
    }
  }
];