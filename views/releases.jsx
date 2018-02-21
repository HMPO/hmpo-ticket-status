'use strict';

const React = require('react');
const Release = require('./release');

class Releases extends React.Component {
    render() {
        return (
            <div className="releases">
                {this.props.releases.map(
                    (release, index) => <Release key={release.id} release={release} promotions={this.props.promotions} top={index} />)}
            </div>
        );
    }
}

module.exports = Releases;
