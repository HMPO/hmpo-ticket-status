'use strict';

const React = require('react');
const ReleaseStatus = require('./release-status');
const Promotion = require('./promotion');
const PromoteLink = require('./promote-link');
const config = require('../lib/config');
const _ = require('lodash');

class Build extends ReleaseStatus {
    render() {
        let resultClass = (this.props.build.result).toLowerCase();

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

        return (
            <div id={'build-' + this.props.build.id} className={'build ' + resultClass}>
                <a target={'build-' + this.props.build.id}
                    title={this.props.build.link}
                    href={this.props.build.link}>Build {this.props.build.id}</a>
                {this.props.build.promoteLink && <PromoteLink env="prd" link={this.props.build.promoteLink} />}
                {promotions.map((promotion, index) => <Promotion key={index} promotion={promotion} />)}
            </div>
        );
    }
}

module.exports = Build;
