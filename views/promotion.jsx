'use strict';

const React = require('react');
const ReleaseStatus = require('./release-status');

class Promotion extends ReleaseStatus {
    render() {
        return (
            <div className={'env ' + this.props.promotion.env + (this.props.promotion.rough ? ' rough': '')}
                title={this.formatDate(this.props.promotion.timestamp)}>
                    {this.props.promotion.env}</div>
        );
    }
}

module.exports = Promotion;
