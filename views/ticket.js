'use strict';

const BuildStatus = require('./build-status');
const _ = require('lodash');
const config = require('../config');

class Ticket extends BuildStatus {
    commits() {
        return _.uniq(_.map(this.props.ticket.commits, commit => {
            return commit.title + '\n' +
            '- ' + commit.author + ' - ' + this.formatDate(commit.date);
        }));
    }

    className(ticket) {
        if (ticket.status === 'NOJIRA') return 'nojira'
        let classNames = config.jira.statusMap;
        return classNames[ticket.status] || 'unknown';
    }

    buildStyle() {
        let height = Math.max(this.Y(this.props.bottom) - this.Y(this.props.top), 0) + 12;
        return {
            top: this.Y(this.props.top),
            left: this.X(this.props.left),
            height
        };
    }
}

module.exports = Ticket;
