'use strict';

const React = require('react');
const Layout = require('./layout');

class Login extends React.Component {
    render() {
        return (
            <Layout title="Login">
                <div className="login">
                    <form method="POST">
                        { this.props.jira ? (
                            <div>
                                <p>Jira Credentials</p>
                                <p>Username: <input type="text" name="jira_username" autoComplete="jira_username"/></p>
                                <p>Password: <input type="password" name="jira_password"/></p>
                            </div>
                        ) : null }
                        { this.props.jenkins ? (
                            <div>
                                <p>Jenkins Credentials</p>
                                <p>Username: <input type="text" name="jenkins_username" autoComplete="jenkins_username"/></p>
                                <p>Password: <input type="password" name="jenkins_password"/></p>
                            </div>
                        ) : null }
                        { this.props.oldJenkins ? (
                            <div>
                                <p>Old Jenkins Credentials</p>
                                <p>Username: <input type="text" name="old_jenkins_username" autoComplete="old_jenkins_username"/></p>
                                <p>Password: <input type="password" name="old_jenkins_password"/></p>
                            </div>
                        ) : null }
                        { this.props.jenkinsPromote ? (
                            <div>
                                <p>Jenkins Promote Credentials</p>
                                <p>Username: <input type="text" name="jenkins_promote_username" autoComplete="jenkins_promote_username"/></p>
                                <p>Password: <input type="password" name="jenkins_promote_password"/></p>
                            </div>
                        ) : null }
                        { this.props.gitlab ? (
                            <div>
                                <p>Gitlab Private Token</p>
                                <p>Token: <input type="text" name="gitlab_token" autoComplete="gitlab_token"/></p>
                            </div>
                        ) : null }
                        <input type="submit"/>
                    </form>
                </div>
            </Layout>
        );
    }
}

module.exports = Login;
