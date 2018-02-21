'use strict';

const React = require('react');

class Update extends React.Component {
    render() {
        return (
            <a className="update"
                href={'/' + this.props.update.module + '#release-' + this.props.update.version}
                target={'module-' + this.props.update.module}
                title={'Version ' + this.props.update.version}>⟰ {this.props.update.module}</a>
        );
    }
}

module.exports = Update;
