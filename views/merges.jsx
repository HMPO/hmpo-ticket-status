'use strict';

const React = require('react');
const ReleaseStatus = require('./release-status');
const Merge = require('./merge');

class Merges extends ReleaseStatus {
    render() {
        let mergeReleases = Object.keys(this.props.merges);
        return (
            <div>
                { mergeReleases.map(releaseId => <Merge
                    key={releaseId}
                    merge={this.props.merges[releaseId]}
                    left={this.props.left}
                    top={this.props.releaseIndexes[releaseId]} />) }
            </div>
        );
    }
}

module.exports = Merges;
