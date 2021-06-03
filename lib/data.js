'use strict';

const config = require('./config');
const MergedApis = require('./merged-apis');

let data;
const projects = {};

module.exports = {
    reset() {
        data = null;
    },

    get() {
        if (!data) data = new MergedApis(config);
        return data;
    },

    addProject(project) {
        if (project) projects[project] = true;
    },

    getProjects() {
        return Object.keys(projects);
    }
};
