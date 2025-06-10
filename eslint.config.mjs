import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import react from "eslint-plugin-react";
import jest from "eslint-plugin-jest";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const config = {
	languageOptions: {
		parser: tsParser,
		parserOptions: {
			ecmaVersion: 6,
			sourceType: "module",
		},
		globals: {
			...js.configs.recommended.languageOptions.globals,
			window: "readonly",
			document: "readonly",
		},
	},
	linterOptions: {
		reportUnusedDisableDirectives: true,
	},
	plugins: {
		react,
		jest,
		"@typescript-eslint": tseslint,
	},
	settings: {
		react: {
			createClass: "createReactClass",
			pragma: "React",
			version: "detect",
			flowVersion: "0.53",
		},
	},
	rules: {
		...js.configs.recommended.rules,
		...react.configs.recommended.rules,
		...jest.configs.recommended.rules,
		...tseslint.configs.recommended.rules,
		"no-prototype-builtins": "off",
		"no-undef": "off",
		"no-useless-escape": "off",
	},
};

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	...config,
];

export default eslintConfig;
