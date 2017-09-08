'use strict';

const React = require('react');
const Buildstatus = require('./build-status');

class Promotion extends Buildstatus {
    render() {
        return (
            <div className={'env ' + this.props.promotion.env + (this.props.promotion.rough ? ' rough': '')}
                title={this.formatDate(this.props.promotion.timestamp)}>
                    {this.props.promotion.env}</div>
        );
    }
}

module.exports = Promotion;
