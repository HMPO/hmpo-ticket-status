'use strict';

module.exports = function (wallaby) {

    process.env.NODE_ENV = 'development';


    return {
        files: [
            './lib/**/*.js?(x)',
            './routes/**/*.js?(x)',
            './views/**/*.js?(x)',
            // { pattern: 'views/**/*.js?(x)', load: false}

        ],
        tests: [
            'test/**/spec.*.js?(x)'
        ],

        env: {
            type: 'node',
            runner: 'node'
        },

        testFramework: 'jest',

        debug: true,

        compilers: {
            '**/*.js*': wallaby.compilers.babel({ babelrc: true })
        },

        // setup(wallaby) {
        //     const conf = require('./package.json').jest;
        //     wallaby.testFramework.configure(conf);
        // }
    };
};
