'use strict';

const React = require('react');
const Builds = require('./builds');
const Tickets = require('./tickets');
const MoreLink = require('./more-link');
const ReloadLink = require('./reload-link');
const ListLink = require('./list-link');
const _ = require('lodash');
const sortBuilds = require('../js/sortbuilds');
const hash = require('./hash');

class Project extends React.Component {
    constructor(props) {
        super(props);
    }

    onMouseDown(e) {
        let target = e.target.name || e.target.id || e.target.tagName;
        if (target) target = target.split('-');
        let type = target && target[0];
        let build = type === 'build' ? target[1]: null;
        if (build) this.selectBuild(build);
        if (type === 'HTML') this.selectBuild(null);
    }

    selectBuild(build) {
        hash.setHash(this.props.project.name, build);
    }

    render() {
        window.document.title = this.props.project.name + ' - Ticket Status';

        // sort builds
        let builds = _.values(this.props.project.builds).sort(sortBuilds).reverse();

        // collect build indexes
        let buildIndexes = {};
        builds.forEach((build, index) => buildIndexes[build.id] = index );

        // collect updates
        let updates = [];
        builds.forEach((build, index) => {
            if (build.updates && build.updates.length) {
                updates.push({
                    top: index,
                    buildId: build.id,
                    updates: build.updates
                });
            }
        });

        return (
            <div onMouseDown={this.onMouseDown.bind(this)}>
                <a className="header" onClick={this.props.onReload}>{this.props.project.name}</a>
                <Builds
                    builds={builds}
                    promotions={this.props.project.promotions}
                    selectedBuild={this.props.project.selectedBuild} />
                <Tickets
                    tickets={this.props.project.tickets}
                    updates={updates} buildIndexes={buildIndexes}/>
                <MoreLink
                    onClick={this.props.onLoadMore} />
                <ReloadLink
                    onClick={this.props.onReload} />
                <ListLink/>
            </div>
        );
    }
}

module.exports = Project;
