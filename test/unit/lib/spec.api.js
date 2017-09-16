'use strict';

const chai = require('chai');
chai.use(require('chai-string'));

global.chaiExpect = chai.expect;

const Api = require('../../../lib/api');


describe('api', () => {
    describe('getCacheFileName', () => {
        it('returns cacheFileName for a custom service', () => {
            let api = new Api({
                api: 'custom'
            });
            let cacheFileName = api.getCacheFileName();

            chaiExpect(cacheFileName).endsWith('cache/custom.json');
            // expect(cacheFileName).endsWith('cache/custom.json');
        });

        it('returns a default based upon config.api', () => {
            let api = new Api();
            let cacheFileName = api.getCacheFileName();

            chaiExpect(cacheFileName).endsWith('cache/generic.json');
        });
    });
    // it('adds 1 + 2 to equal 3', () => {
    //     expect(sum(1, 2)).toBe(3);
    // });
});
