'use strict';

const reHash = /^#?([a-z0-9-]+)(\/([0-9]+)?)?$/;

let previousHash;

module.exports = {
    makeHash(name, selectedBuild) {
        let hash = '';
        if (name) hash = '#' +  encodeURIComponent(name);
        if (selectedBuild) hash = hash + '/' + Number(selectedBuild);
        return hash;
    },

    setHash(name, selectedBuild) {
        let hash = this.makeHash(name, selectedBuild);
        window.location.hash = hash
    },

    watchHash(cb) {
        let readHash = this.readHash.bind(this, cb);
        if (window.addEventListener) {
            window.addEventListener("hashchange", readHash, false);
        } else {
            setInterval(readHash, 1000);
        }

        setTimeout(readHash, 100);
    },

    readHash(cb) {
        console.log('readHash', window.location.hash);
        let hash = window.location.hash;
        if (hash === previousHash) return;
        this.previousHash = hash;
        let hashMatch = hash && reHash.exec(hash);
        if (!hashMatch) return cb();
        cb(hashMatch[1], hashMatch[3] || null);
    }
}
