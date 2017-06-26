'use strict';

const React = require('react');
const Layout = require('./layout');

class List extends React.Component {
    render() {
        return (
            <Layout title="Project List">
                <div><p className="header">Project List</p></div>
                <ul className="projects">
                    { this.props.projects.map(project => <li key={project.id}><a href={'/' + encodeURI(project.name)}>{project.name}</a> - <i>{project.description}</i></li>) }
                </ul>
            </Layout>
        );
    }
}

module.exports = List;
