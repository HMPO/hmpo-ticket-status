'use strict';

const React = require('react');
const BuildStatus = require('./build-status');
const Promotion = require('./promotion');
const config = require('../lib/config');
const _ = require('lodash');

class Build extends BuildStatus {
    render() {
        let resultClass = (this.props.build.result || 'missing').toLowerCase();

        let promotions = [];

        if (this.props.promotions) {
            let environments = _.uniq(_.concat(
                [],
                _.values(config.get('jenkinsPromote.environments')),
                _.values(config.get('jenkins.environments'))
            ));
            promotions = environments
                .map(envName => this.props.promotions[envName])
                .filter(promotion => promotion && promotion.buildId === this.props.build.id);
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
