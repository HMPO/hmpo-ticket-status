'use strict';

const React = require('react');
const Layout = require('./layout');
const Releases = require('./releases');
const Tickets = require('./tickets');
const MoreLink = require('./more');

class Main extends React.Component {
    render() {
        // collect build indexes
        let releaseIndexes = {};
        this.props.releases.forEach((release, index) => releaseIndexes[release.id] = index );

        // collect updates
        let updates = [];
        this.props.releases.forEach((release, index) => {
            if (release.updates && release.updates.length) {
                updates.push({
                    top: index,
                    releaseId: release.id,
                    updates: release.updates
                });
            }
        });

        return (
            <Layout title={this.props.project}>
                <a className="header" href="/">{this.props.project}</a>
                <Releases releases={this.props.releases} promotions={this.props.promotions} />
                <Tickets tickets={this.props.tickets} updates={updates} releaseIndexes={releaseIndexes} />
                <MoreLink options={this.props.options} />
            </Layout>
        );
    }
}

module.exports = Main;
