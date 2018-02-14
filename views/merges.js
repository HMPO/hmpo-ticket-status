'use strict';

const React = require('react');
const BuildStatus = require('./build-status');
const Merge = require('./merge');

class Merges extends BuildStatus {
    render() {
        let mergeBuilds = Object.keys(this.props.merges);
        return (
            <div>
                { mergeBuilds.map(buildId => <Merge
                    key={buildId}
                    merge={this.props.merges[buildId]}
                    left={this.props.left}
                    top={this.props.buildIndexes[buildId]} />) }
            </div>
        );
    }
}

module.exports = Merges;
