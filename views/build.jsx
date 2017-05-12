'use strict';

const React = require('react');
const BuildStatus = require('./build-status');
const Promotion = require('./promotion');
const config = require('../lib/config');

class Build extends BuildStatus {
    render() {
        let resultClass = (this.props.build.result || 'missing').toLowerCase();

        let promotions = [];

        if (this.props.build.promotions) {
            let environments = config.get('jenkins.environments');
            promotions = environments.map(envName => this.props.build.promotions[envName]).filter(Boolean);
        }

        let style = {
            top: this.Y(this.props.top)
        };

        let name = this.props.build.id === 'HEAD' ? 'HEAD' : '⚙ Build ' + this.props.build.id;

        return (
            <div id={'build-' + this.props.build.id} className={'build ' + resultClass} style={style}>
                <a
                    name={'build-' + this.props.build.id}
                    target={'build-' + this.props.build.id}
                    href={this.props.build.link}>{name}</a>
                <span className="date">{this.formatDate(this.props.build.date)}</span>
                {promotions.map((promotion, index) => <Promotion key={index} promotion={promotion} />)}
            </div>
        );
    }
}

module.exports = Build;
