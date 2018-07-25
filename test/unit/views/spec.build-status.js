'use strict';

// import React from 'react';
// import expect from 'expect';
// import { shallow } from 'enzyme';
// import {shallow} from "enzyme/build/index";

import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import TestUtils from 'react-dom/test-utils';


import BuildStatus from '../../../views/build-status';


describe('BuildStatus', () => {
    let Wrapper = React.createClass({
        render: function() {
            return this.props.children;
        }
    });

    it('should do something', () => {
        // const component = shallow(<BuildStatus />);

        instance = TestUtils.renderIntoDocument(
            <Wrapper>
                <BuildStatus />
            </Wrapper>
        );

        console.log(instance.Y(100));
    });
});
