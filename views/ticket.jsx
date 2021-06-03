'use strict';

const ReleaseStatus = require('./release-status');
const _ = require('lodash');

class Ticket extends ReleaseStatus {
    commits() {
        return _.uniq(_.map(this.props.ticket.commits, commit => {
            return commit.title + '\n' +
            '- ' + commit.author + ' - ' + this.formatDate(commit.date);
        }));
    }

    className(ticket) {
        if (ticket.status === 'NOTICKET') return 'noticket';
        return ticket.statusClass || 'unknown';
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
