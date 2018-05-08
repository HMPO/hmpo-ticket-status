'use strict';

const React = require('react');
const ReleaseStatus = require('./release-status');
const Build = require('./build');

class Release extends ReleaseStatus {
    render() {
        let style = {
            top: this.Y(this.props.top)
        };

        let name = this.props.release.id === 'HEAD' ? 'HEAD' : '⚙ ' + this.props.release.id;

        return (
            <div id={'release-' + this.props.release.id} className={'release'} style={style}>
                <a title={this.props.release.ids && this.props.release.ids.join(' ')}>{name}</a>
                <span className="date">{this.formatDate(this.props.release.date)}</span>
                {this.props.release.builds && this.props.release.builds.map((build, index) => <Build key={index} build={build} promotions={this.props.promotions} />)}
            </div>
        );
    }
}

module.exports = Release;
