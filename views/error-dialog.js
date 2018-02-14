'use strict';

const React = require('react');

class ErrorDialog extends React.Component {
    render() {
        return (
            <div className="error-dialog">
                <span><strong>URL:</strong> { this.props.error.url }</span>
                <span><strong>Code:</strong> { this.props.error.code || this.props.error.status || this.props.error.errcode }</span>
                <span><strong>Message:</strong> { this.props.error.message }</span>
                <button onClick={ (e) => { e.preventDefault(); this.props.onClose(); } }>OK</button>
            </div>
        );
    }
}

module.exports = ErrorDialog;
