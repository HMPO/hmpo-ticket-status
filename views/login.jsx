'use strict';

const React = require('react');
const Layout = require('./layout');

class Login extends React.Component {
    render() {
        return (
            <Layout title="Login">
                <div className="login">
                    <form method="POST">
                        { Object.keys(this.props.missingCredentials).map(engineName =>
                            this.props.missingCredentials[engineName].username !== undefined ? (
                                <div key={ engineName }>
                                    <p>{ engineName } Credentials</p>
                                    <p>Username: <input type="text" name={engineName + '_username'} value={this.props.missingCredentials[engineName].username} autoComplete={engineName + '_username'}/></p>
                                    <p>Password: <input type="password" name={ engineName + '_password'}/></p>
                                </div>
                            ) : (
                                <div key={ engineName }>
                                    <p>{ engineName } Token</p>
                                    <p>Token: <input type="text" name={engineName + '_token'} autoComplete={engineName + '_token'}/></p>
                                </div>
                            )
                        ) }
                        <input type="submit"/>
                    </form>
                </div>
            </Layout>
        );
    }
}

module.exports = Login;
