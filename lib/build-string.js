'use strict';

const rePlaceholder = /\{([a-z0-9]+)(:date|:enc|:alpha)?\}/ig;

function buildString(str, options, defaultValue) {
    if (typeof str !== 'string') return str;
    return str.replace(rePlaceholder, (match, key, encoding) => {
        let val = buildString(options[key], options);
        if (typeof val === 'function') val = val(options);
        if (encoding === ':alpha')
            return String(val).replace(/[^a-z0-9-]/gi, '');
        if (encoding === ':enc')
            return encodeURIComponent(String(val));
        if (encoding === ':date')
            return val !== undefined ? new Date(val).toISOString() : '';
        return String(val === undefined ? defaultValue : val);
    });
}

module.exports = buildString;
