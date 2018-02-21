'use strict';

const React = require('react');
const ReleaseStatus = require('./release-status');
const Promotion = require('./promotion');
const PromoteLink = require('./promote-link');
const config = require('../lib/config');
const _ = require('lodash');

class Release extends ReleaseStatus {
    render() {
        let resultClass = (this.props.release.result || 'missing').toLowerCase();

        let promotions = [];

        if (this.props.promotions) {
            let environments = _.uniq(_.concat(
                [],
                _.values(config.get('jenkinsPromote.environments')),
                _.values(config.get('jenkins.environments'))
            ));
            promotions = environments
                .map(envName => this.props.promotions[envName])
                .filter(promotion => promotion && promotion.releaseId === this.props.release.id);
        }

        let style = {
            top: this.Y(this.props.top)
        };

        let name = this.props.release.id === 'HEAD' ? 'HEAD' : '⚙ ' + this.props.release.id;

        return (
            <div id={'release-' + this.props.release.id} className={'release ' + resultClass} style={style}>
                <a
                    name={'release-' + this.props.release.id}
                    target={'release-' + this.props.release.id}
                    href={this.props.release.link}>{name}</a>
                <span className="date">{this.formatDate(this.props.release.date)}</span>
                {this.props.release.promoteLink ? <PromoteLink env="prd" link={this.props.release.promoteLink} /> : null}
                {promotions.map((promotion, index) => <Promotion key={index} promotion={promotion} />)}
            </div>
        );
    }
}

module.exports = Release;
