'use strict';

const React = require('react');
const Layout = require('./layout');
const Builds = require('./builds');
const Tickets = require('./tickets');
const MoreLink = require('./more');
const _ = require('lodash');

class Main extends React.Component {
    render() {
        // sort builds
        let builds = _.values(this.props.builds)
            .sort( (a, b) => b.id === 'HEAD' ? 1 : b.id - a.id );

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
            <Layout title={this.props.project}>
                <a className="header" href="/">{this.props.project}</a>
                <Builds builds={builds} promotions={this.props.promotions} />
                <Tickets tickets={this.props.tickets} updates={updates} buildIndexes={buildIndexes} />
                <MoreLink options={this.props.options} />
            </Layout>
        );
    }
}

module.exports = Main;
