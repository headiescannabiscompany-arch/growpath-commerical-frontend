const path = require("path");
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const tsParser = require("@typescript-eslint/parser");
const prettierPlugin = require("eslint-plugin-prettier");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const rawCompat = compat.config(require(path.join(__dirname, ".eslintrc.json")));

// Strip rules that are referenced but not available in the installed plugin set.
const compatConfigs = rawCompat.map((cfg) => {
  if (!cfg || typeof cfg !== "object") return cfg;
  if (!cfg.rules) return cfg;

  const nextRules = { ...cfg.rules };
  // Your install doesn't provide this rule, so ESLint hard-errors on load.
  delete nextRules["@typescript-eslint/no-require-imports"];

  return { ...cfg, rules: nextRules };
});

module.exports = [
  {
    ignores: [
      "src/screens/**",
      "**/__tests__/**",
      "**/*.test.*",
      "**/*.spec.*"
    ]
  },

  ...compatConfigs,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      }
    }
  },

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": ["error", { endOfLine: "auto" }]
    }
  },

  {
    rules: {
      "no-restricted-syntax": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-useless-catch": "off",
      "no-empty": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off"
    }
  }
];