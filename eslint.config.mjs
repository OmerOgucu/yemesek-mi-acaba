import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), 'apps/api/package.json'));
const tseslint = require('typescript-eslint');

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/prisma/migrations/**', '**/.next/**', 'uploads/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
