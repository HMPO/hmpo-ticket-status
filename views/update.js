'use strict';

const React = require('react');
const hash = require('./hash');

class Update extends React.Component {
    render() {
        return (
            <a className="update"
                href={hash.makeHash(this.props.update.module, this.props.update.version)}
                target={'module-' + this.props.update.module}
                title={'Version ' + this.props.update.version}
                >⟰ {this.props.update.module}</a>
        );
    }
}

module.exports = Update;
