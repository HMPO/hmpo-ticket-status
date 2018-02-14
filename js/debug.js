'use strict';

module.exports = name => {
    name = name + ':';
    return function () {
        let args = [].slice.apply(arguments);
        args.unshift(name);
        console.log.apply(console, args);
    };
};
