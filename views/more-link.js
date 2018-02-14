'use strict';

const React = require('react');

class MoreLink extends React.Component {
    render() {
        return (
            <div className="more link">
                <a onClick={this.props.onClick}>Load More</a>
            </div>
        );
    }
}

module.exports = MoreLink;
