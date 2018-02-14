'use strict';

const React = require('react');
const BuildStatus = require('./build-status');

class Merge extends BuildStatus {
    render() {
        let style = {
            top: this.Y(this.props.top),
            left: this.X(this.props.left)
        };
        return (
            <a className="merge"
                style={style}
                target={'merge-' + this.props.merge.id}
                href={this.props.merge.link}
                title={'Merge ' + this.props.merge.id} />
            );
    }
}

module.exports = Merge;
