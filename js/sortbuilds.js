'use strict';

module.exports = (a, b) => (
    (a.id && b.id) ?
        (a.id === 'HEAD' ? 1 : a.id - b.id)
    :
        (a === 'HEAD' ? 1 : a - b)
);

