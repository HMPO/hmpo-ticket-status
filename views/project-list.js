'use strict';

const React = require('react');

class ProjectList extends React.Component {
    render() {
        window.document.title = 'Project List - Ticket Status';
        return (
            <div className="project-list">
                <div><p className="header">Project List</p></div>
                <ul>
                    { this.props.projects &&
                        this.props.projects.map(project =>
                            <li key={project.id}><a
                            href={'#' + encodeURIComponent(project.name)}
                            >{project.name}</a> - <i>{project.description}</i></li>
                        )
                    }
                </ul>
            </div>
        );
    }
}

module.exports = ProjectList;
