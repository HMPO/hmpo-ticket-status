'use strict';

const React = require('react');
const Build = require('./build');

class Builds extends React.Component {
    render() {
        return (
            <div className="builds">
                {this.props.builds.map(
                    (build, index) => <Build key={build.id} build={build} top={index} />)}
            </div>
        );
    }
}

module.exports = Builds;
