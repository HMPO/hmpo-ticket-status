'use strict';

const apiData = require('../js/data');
const React = require('react');
const ReactDOM = require('react-dom');
const Project = require('./project');
const ProjectList = require('./project-list');
const ErrorDialog = require('./error-dialog');
const LoadingDialog = require('./loading-dialog');
const hash = require('./hash');

class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = { data: {} };

        this.cache = {};

        hash.watchHash(this.changeProject.bind(this));
    }

    reset() {
        this.setState({
            loading: false,
            project: null,
            error: null
        });
    }

    loadProjectList() {
        apiData.get().getProjects((error, data) => {
            if (error) return this.setState({ error, loading: false });
            this.cache.list = data.projects;
            this.setState({ projectList: data.projects, error: null, loading: false });
        });
        return {
            project: null,
            loading: true
        };
    }

    loadProject(project) {
        project.options = project.options || {};
        project.options.count = project.options.count || 100;
        apiData.get().getData(project.name, project.options, (error, project) => {
            if (error) return this.setState({ error, loading: false });
            this.cache[project.name] = project;
            this.setState({ project, error: null, loading: false });
        });
        return {
            project,
            loading: true
        };
    }

    cancelError() {
        this.setState({ error: null });
    }

    changeProject(name, selectedBuild) {
        if (!name) return this.showList();
        this.reset();
        let project = this.cache[name];
        if (project) {
            if (selectedBuild !== undefined) project.selectedBuild = selectedBuild;
            return this.setState({ project });
        }
        let newState = this.loadProject({ name, selectedBuild });
        this.setState(newState);
    }

    reload() {
        this.setState(state => {
            let project = state.project;
            let newState = this.loadProject(project, true);
            return newState
        });
    }

    loadMore() {
        this.setState(state => {
            let project = state.project;
            project.options.count = project.options.count + 100;
            let newState = this.loadProject(project);
            return newState
        });
    }

    showList() {
        this.reset();
        if (this.cache.list) return this.setState({ projectList: this.cache.list });
        let newState = this.loadProjectList();
        this.setState(newState);
    }

    render() {
        return (
            <div>
                { this.state.project ?
                    <Project
                        project={this.state.project}
                        options={this.state.options}
                        onLoadMore={this.loadMore.bind(this)}
                        onReload={this.reload.bind(this)}/> :
                    <ProjectList
                        projects={this.state.projectList}/>
                }
                { this.state.loading && <LoadingDialog/> }
                { this.state.error && <ErrorDialog error={this.state.error} onClose={this.cancelError.bind(this)}/> }
            </div>
        );
    }

    static mount(container) {
        ReactDOM.render(<Main/>, container);
    }
}

module.exports = Main;
