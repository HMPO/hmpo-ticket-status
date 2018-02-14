'use strict';

const React = require('react');

class LoadingDialog extends React.Component {
    render() {
        return (
            <div className="loading-dialog">
                <span>Loading...</span>
            </div>
        );
    }
}

module.exports = LoadingDialog;
