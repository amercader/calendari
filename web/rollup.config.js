import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from '@rollup/plugin-terser';
import css from 'rollup-plugin-import-css';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/app.js',
	output: {
		file: 'public/app.js',
		format: 'iife', // immediately-invoked function expression — suitable for <script> tags
		sourcemap: true
	},
	plugins: [
        css({
          output: 'app.css'
        }),
		resolve(), // tells Rollup how to find date-fns in node_modules
		commonjs(), // converts to ES modules
		production && terser() // minify, but only in production
	]
};
