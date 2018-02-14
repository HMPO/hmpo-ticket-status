'use strict';

module.exports = {
    get(name) {
        try {
            return JSON.parse(window.localStorage.getItem(name));
        } catch (e) {
            return undefined;
        }
    },

    compactArray(data, ignoreKeyPattern) {
        let dest = [];
        let v;
        for (v of data) {
            v = this.compact(v, ignoreKeyPattern);
            if (v !== null && v !== undefined) dest.push(v);
        }
        if (!dest.length) return;
        return dest;
    },

    compactObject(data, ignoreKeyPattern) {
        let dest = {};
        let k;
        for (k in data) {
            if (ignoreKeyPattern && ignoreKeyPattern.test(k)) continue;
            let v = this.compact(data[k], ignoreKeyPattern);
            if (v !== null && v !== undefined) dest[k] = v;
        }
        if (!Object.keys(dest).length) return;
        return dest;
    },

    compact(data, ignoreKeyPattern) {
        if (data === null) return;
        if (typeof data === 'function') return;
        if (Array.isArray(data)) return this.compactArray(data, ignoreKeyPattern);
        if (data && typeof data === 'object') return this.compactObject(data, ignoreKeyPattern);
        return data;
    },

    set(name, value) {
        try {
            return window.localStorage.setItem(name, JSON.stringify(value));
        } catch (e) {
            return undefined;
        }
    },

    remove(name) {
        try {
            return window.localStorage.removeItem(name);
        } catch (e) {
            return undefined;
        }
    }
};

