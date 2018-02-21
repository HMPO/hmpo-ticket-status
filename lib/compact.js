'use strict';

function compactArray(data, ignoreKeyPattern) {
    let dest = [];
    let v;
    for (v of data) {
        v = compact(v, ignoreKeyPattern);
        if (v !== null && v !== undefined) dest.push(v);
    }
    if (!dest.length) return;
    return dest;
}

function compactObject(data, ignoreKeyPattern) {
    let dest = {};
    let k;
    for (k in data) {
        if (ignoreKeyPattern && ignoreKeyPattern.test(k)) continue;
        let v = compact(data[k], ignoreKeyPattern);
        if (v !== null && v !== undefined) dest[k] = v;
    }
    if (!Object.keys(dest).length) return;
    return dest;
}

function compact(data, ignoreKeyPattern) {
    if (data === null) return;
    if (typeof data === 'function') return;
    if (Array.isArray(data)) return compactArray(data, ignoreKeyPattern);
    if (data && typeof data === 'object') return compactObject(data, ignoreKeyPattern);
    return data;
}

module.exports = compact;
