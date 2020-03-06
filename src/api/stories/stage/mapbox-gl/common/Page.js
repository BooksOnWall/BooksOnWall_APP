import React from 'react';
import {View} from 'react-native';

import sheet from '../styles/sheet';
import colors from '../styles/colors';

class Page extends React.Component {

  render() {
    return (
      <View style={sheet.matchParent}>
        {this.props.children}
      </View>
    );
  }
}

export default Page;
