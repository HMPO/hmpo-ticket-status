'use strict';

const React = require('react');
const Ticket = require('./ticket');

class CommitTicket extends Ticket {
    render() {
        let title = this.commits().join('\n\n') || this.props.ticket.title;

        return (
            <div className="ticket noticket" style={this.buildStyle()} title={title}>
                <span>⚐ {this.props.ticket.title}</span>
            </div>
        );
    }
}

module.exports = CommitTicket;
