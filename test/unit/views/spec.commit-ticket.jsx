'use strict';

import React from 'react';
import expect from 'expect';
import { shallow } from 'enzyme';
import CommitTicket from '../../../views/commit-ticket.jsx';
// import {shallow} from "enzyme/build/index";

describe('CommitTicket', () => {
    it('renders title', () => {
        let ticket = {
            title: 'Title'
        };

        const commitTicket = shallow(<CommitTicket ticket={ticket}/>);
        expect(commitTicket.find('span').text()).toEqual('⚐ Title');
    });

    // it.skip('sets title attribute', () => {
    //     let ticket = {
    //         title: 'Title'
    //     };
    //
    //     // const commitTicket = shallow(<CommitTicket ticket={ticket}/>);
    //     // expect(commitTicket.find('div')[0].attribs('title')).toEqual('⚐ Title');
    // });
});
