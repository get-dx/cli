// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/**"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Ban `process.stdout.write` and `process.stderr.write` outside of canonical locations
    files: ["src/**/*.ts"],
    ignores: [
      // Canonical locations where we WANT to call these functions
      "src/renderers.ts",
      "src/commandHelpers.ts",
      "src/logger.ts",
      // Tests and test helpers
      "**/*.test.ts",
      "src/testSetup.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type=MemberExpression][callee.object.type=MemberExpression][callee.object.object.name=process][callee.object.property.name=stdout][callee.property.name=write]",
          message:
            "Use renderJson or renderRichText from renderers.ts instead of process.stdout.write().",
        },
        {
          selector:
            "CallExpression[callee.type=MemberExpression][callee.object.type=MemberExpression][callee.object.object.name=process][callee.object.property.name=stderr][callee.property.name=write]",
          message:
            "Use the shared logger, renderRichText, or the other allowlisted output sites instead of process.stderr.write().",
        },
      ],
    },
  },
  eslintConfigPrettier,
);
