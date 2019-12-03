import React, {Component} from 'react';
import { Button, View, Text } from 'react-native';

export default class FirstRun extends Component {
  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>First Run</Text>
          <Button
            title="Go to Details"
            onPress={() => {
              this.props.navigation.navigate('Details', {
                itemId: 86,
                otherParam: 'anything you want here',
              });
            }}
          />
        </View>
    );
  }
}
