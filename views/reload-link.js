'use strict';

const React = require('react');

class ReloadLink extends React.Component {
    render() {
        return (
            <div className="reload link">
                <a onClick={this.props.onClick}>Reload</a>
            </div>
        );
    }
}

module.exports = ReloadLink;
