import React from 'react';
import {View} from 'react-native';

import sheet from '../styles/sheet';
import colors from '../styles/colors';

import BaseExamplePropTypes from './BaseExamplePropTypes';

class Page extends React.Component {
  static propTypes = {
    ...BaseExamplePropTypes,
  };

  render() {
    return (
      <View style={sheet.matchParent}>
        {this.props.children}
      </View>
    );
  }
}

export default Page;
