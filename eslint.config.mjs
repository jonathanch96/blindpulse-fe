import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const moneySafetyPlugin = {
  rules: {
    "no-direct-money-arithmetic": {
      meta: {
        type: "problem",
        docs: { description: "Require decimal-safe handling for price, size and balance arithmetic" },
        messages: { unsafe: "Use decimal.js for price, size and balance arithmetic; direct operators can lose precision." },
        schema: [],
      },
      create(context) {
        return {
          BinaryExpression(node) {
            if (!["+", "-", "*", "/", "%", "**"].includes(node.operator)) return;
            const expression = context.sourceCode.getText(node).toLowerCase();
            if (/(amount|balance|equity|price|quantity|pnl|drawdown|leverage)/.test(expression)) {
              context.report({ node, messageId: "unsafe" });
            }
          },
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Every surface that handles a price, a size, a balance or an R-multiple. These are decimal
    // strings from the API, and a stop loss that has been through parseFloat is a stop loss the
    // server and the screen no longer agree on.
    files: [
      "src/features/account/**/*.{ts,tsx}",
      "src/features/replay/**/*.{ts,tsx}",
      "src/features/session/**/*.{ts,tsx}",
      "src/features/feed/**/*.{ts,tsx}",
      "src/features/chart/**/*.{ts,tsx}",
      "src/features/drawing/**/*.{ts,tsx}",
      "src/features/journal/**/*.{ts,tsx}",
      "src/features/analytics/**/*.{ts,tsx}",
    ],
    plugins: { "blindpulse-money": moneySafetyPlugin },
    rules: {
      "no-restricted-globals": ["error", { name: "parseFloat", message: "Use decimal.js for prices, sizes and balances." }],
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[callee.name='Number']", message: "Use decimal.js for prices, sizes and balances." },
      ],
      "blindpulse-money/no-direct-money-arithmetic": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/types/api.d.ts",
  ]),
]);

export default eslintConfig;
