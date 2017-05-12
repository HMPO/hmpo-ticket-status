'use strict';

const React = require('react');

class Layout extends React.Component {
    render() {
        return (
            <html>
            <head>
                <title>{this.props.title} - Ticket Status</title>
                <link href="/app.css" rel="stylesheet" type="text/css" />
                <script src="/app.js"/>
            </head>
            <body>
                {this.props.children}
            </body>
            </html>
        );
    }
}

module.exports = Layout;
