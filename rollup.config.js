import babel from '@rollup/plugin-babel';
import multi from '@rollup/plugin-multi-entry';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import css from "rollup-plugin-css-only";
import {terser} from 'rollup-plugin-terser';

export default [{
    input: ['src/index.js'],
    output: {
        file: 'build/bundle.js',
        format: 'umd',
        name: 'swp',
    },
    plugins: [
        babel({
            babelHelpers: 'bundled', 
            exclude: 'node_modules/**'
        }),
        multi(),
        nodeResolve(),
        commonjs(),
        css({
            output: "build/bundle.css"
        }),
    ],
    onwarn: function(warning, superOnWarn) {
        if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
        }
        superOnWarn(warning);
    },
},];