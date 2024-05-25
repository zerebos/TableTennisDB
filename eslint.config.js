const globals = require("globals");
const eslintjs = require("@eslint/js");

module.exports = [
    eslintjs.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: globals.node
        },
        rules: {
            "no-undef": "error",
            "semi": "error",
            "space-infix-ops": "error",
            "quotes": ["error", "double", {allowTemplateLiterals: true}],
            "no-console": "off",
            "no-shadow": ["warn", {builtinGlobals: false, hoist: "functions", allow: []}],
            "no-redeclare": ["error", {builtinGlobals: true}],
            "brace-style": ["error", "stroustrup", {allowSingleLine: true}],
            "keyword-spacing": "error",
            "no-else-return": "error",
            "curly": ["error", "multi-line", "consistent"],
            "dot-notation": "error",
            "yoda": "error",
            "linebreak-style": ["error", "windows"],
            "quote-props": ["error", "consistent-as-needed", {keywords: true}],
            "object-curly-spacing": ["error", "never", {objectsInObjects: false}],
            "no-var": "error",
            "prefer-const": "error"
        },
    }
];