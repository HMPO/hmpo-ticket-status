'use strict';

const React = require('react');
const Layout = require('./layout');

class NotFound extends React.Component {
    render() {
        return (
            <Layout title="Project Not Found">
                <div><p className="header">Project Not Found: {this.props.project}</p></div>
            </Layout>
        );
    }
}

module.exports = NotFound;
