module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: [
    'airbnb-typescript-prettier',
    'eslint:recommended',
    'plugin:react/recommended', 							// 1. Uses the recommended rules from @eslint-plugin-react
    'plugin:jsx-a11y/recommended',
    'plugin:import/typescript', 							// extends the recommended import with typescript import/resolver support for .ts and .tsx
    'plugin:@typescript-eslint/recommended', 	// 2. Uses the recommended rules from the @typescript-eslint/eslint-plugin   
		'prettier/react',
    'prettier/@typescript-eslint',						// 3. Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
		'plugin:prettier/recommended', 						// 4. Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2020, 		// Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
		ecmaFeatures: {
			jsx: true, 					// Allows for the parsing of JSX
		},
    //   project: 'tsconfig.json',
    //   tsconfigRootDir: '.'
  },
  env: {
    es6: true,
    browser: true,
    node: true,
    jest: true
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'prettier', 'json', 'import'],
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. '@typescript-eslint/explicit-function-return-type': 'off',

    // https://gist.github.com/1natsu172/a65a4b45faed2bd3fa74b24163e4256e

    /**
     * @description rules of @typescript-eslint
     */
    '@typescript-eslint/prefer-interface': 'off', // also want to use 'type'
    '@typescript-eslint/explicit-function-return-type': 'off', // annoying to force return type
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/interface-name-prefix': 'off', // off = disagree with TS team on usefulness
    '@typescript-eslint/no-explicit-any': 'off', // off = I'm only allergic to implicit any
    '@typescript-eslint/explicit-member-accessibility': 'off', // ok with implicit public
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': 'allow-with-description' }],
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',

		'no-use-before-define': 'off', // note you must disable the base rule as it can report incorrect errors
    '@typescript-eslint/no-use-before-define': ['error'], 

    // note you must disable the base rule as it can report incorrect errors
    camelcase: 'off',
    // '@typescript-eslint/camelcase': ['error', { properties: 'never' }],
    '@typescript-eslint/camelcase': 'off',

    /**
     * @description rules of eslint-plugin-react
     */
    'react/jsx-filename-extension': [
      'warn',
      {
        // also want to use with '.tsx'
        extensions: ['.jsx', '.tsx']
      }
    ],
    'react/jsx-no-bind': 'warn',
    'react/jsx-no-duplicate-props': 'warn',
    // 'react/jsx-one-expression-per-line': 'warn',
    'react/jsx-pascal-case': 'warn',
    // 'react/jsx-props-no-multi-spaces': 'warn',
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-sort-default-props': 'warn',
    // 'react/jsx-tag-spacing': ['error', { 'beforeSelfClosing': 'always' }],
    'react/prop-types': 'off', // Is this incompatible with TS props type?
    'react/no-find-dom-node': 'warn',
    'react/no-string-refs': 'warn',
    'react/no-unused-state': 'warn',
    'react/no-access-state-in-setstate': 'warn',
    // 'react/no-multi-comp': 'warn',
    'react/no-typos': 'error',
    'react/no-unsafe': 'warn',
    'react/no-unused-prop-types': 'warn',
    'react/destructuring-assignment': 'off',
    'react/no-access-state-in-setstate': 'warn',
    'react/no-array-index-key': 'warn',
    'react/static-property-placement': ['warn', 'static public field'],
    'react/prefer-stateless-function': ['warn', { ignorePureComponents: true }],
    'react/require-default-props': 'warn',

    /**
     * @description rules of eslint-plugin-react-hooks
     */
    'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
    'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies

    /**
     * @description rules of eslint
     */
    'no-underscore-dangle': 'off',
    'no-console': 'off',
    'no-nested-ternary': 'off',
    'no-return-assign': 'off',
    'no-shadow': 'off',
    'lines-between-class-members': 'off',
    'prefer-const': 'warn',
    'prefer-destructuring': 'warn',
    'no-dupe-class-members': 'warn',
    'no-else-return': 'warn',
    'no-unneeded-ternary': 'warn',
    'no-restricted-syntax': 'warn',
    'no-cond-assign': 'warn',
    'vars-on-top': 'warn',
    'prefer-template': 'warn',
    'prefer-object-spread': 'warn',
    'no-param-reassign': ['off', { props: true, ignorePropertyModificationsFor: ['draft'] }], // if using warn we support immer, currently off
    'no-plusplus': ['warn', { allowForLoopAfterthoughts: true }],
    'no-unused-expressions': 'warn',
    'object-shorthand': 'warn',
    'consistent-return': 'warn',
    'max-classes-per-file': 'warn',
    'class-methods-use-this': 'warn',
    'guard-for-in': 'warn',
    'default-case': 'warn',
    'spaced-comment': [
      'error',
      'always',
      {
        markers: ['/']
      }
    ],

    /**
     * @description rules of eslint-import-resolver-typescript
     */
    'import/no-cycle': 'off',
    'import/no-unresolved': 'error',
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.spec.ts'] }],

    /**
     * @description rules of eslint-plugin-prettier
     */
    // 'prettier/prettier': [
    //   'error',
    //   {
    //     semi: true,
    //     jsxBracketSameLine: true,
    //     trailingComma: 'none',
    //     singleQuote: true,
    //     printWidth: 120,
    //     tabWidth: 2
    //   }
    // ],

    /**
     * @description rules of eslint-plugin-jsx-a11y
     */
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['to', 'hrefLeft', 'hrefRight'],
        aspects: ['noHref', 'invalidHref', 'preferButton']
      }
    ],
    'jsx-a11y/label-has-for': 'off', // deprecated
    'jsx-a11y/label-has-associated-control': 'warn'
  },
  settings: {
    react: {
      version: 'detect' // Tells eslint-plugin-react to automatically detect the version of React to use
      // React version. 'detect' automatically picks the version you have installed.
      // You can also use `16.0`, `16.3`, etc, if you want to override the detected value.
      // default to latest and warns if missing
      // It will default to 'detect' in the future
    },
    'import/resolver': {
      node: {
        extensions: ['.mjs', '.js', '.json', '.ts', '.tsx']
      }
    }
  }
};
