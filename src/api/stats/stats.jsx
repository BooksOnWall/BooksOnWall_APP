import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { Icon, registerCustomIconType } from 'react-native-elements';
import I18n from "../../utils/i18n";
import IconSet from '../../utils/Icon';
import Orientation from 'react-native-orientation';

registerCustomIconType('booksonwall', IconSet);



export default class Stats extends Component {
  static navigationOptions = {
    headerShown: false,
  };
  componentDidMount = () => Orientation.lockToPortrait()
  getStat = () => async {
    console.log('stat')
    return "toto";
  }
  render() {

      return (
      <Text>toto</Text>
      );
    }

}
