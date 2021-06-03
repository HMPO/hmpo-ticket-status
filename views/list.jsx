'use strict';

const React = require('react');
const Layout = require('./layout');

class List extends React.Component {
    render() {
        return (
            <Layout title="Project List">
                <div><p className="header">Project List</p></div>
                <ul className="projects">
                    { this.props.projects.sort().map(project => <li key={project}><a href={'/' + encodeURI(project)}>{project}</a></li>) }
                </ul>
            </Layout>
        );
    }
}

module.exports = List;
