import React, { Component } from 'react';
import {
  Platform,
  AppRegistry,
  Text,
  View,
  StyleSheet,
  PixelRatio,
  TouchableHighlight,
} from 'react-native';
import { ViroARSceneNavigator} from 'react-viro';
import InitialARScene from './arScene';
import KeepAwake from 'react-native-keep-awake';

/*
 TODO: Insert your API key below unneeded since v.2.17
 */
let sharedProps = {
  apiKey:"API_KEY_HERE",
};
let UNSET = "UNSET";
let AR_NAVIGATOR_TYPE = "AR";

// This determines which type of experience to launch in, or UNSET, if the user should
// be presented with a choice of AR or VR. By default, we offer the user a choice.
let defaultNavigatorType = "AR";

export default class ToAR extends Component {
  constructor(props) {
    super(props);
    this.state = {
      navigatorType : defaultNavigatorType,
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      appDir: this.props.screenProps.AppDir,
      story: this.props.navigation.getParam('story'),
      index: this.props.navigation.getParam('index'),
      stage: this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')],
      sharedProps : sharedProps
    }
  }
  static navigationOptions = {
    title: 'To Augmented Reality',
    headerShown: false
  };
  componentDidMount = async () => await KeepAwake.activate();
  componentWillUnmount = async () => {
    try {
      this.setState({ navigatorType : UNSET });
      await KeepAwake.deactivate();
    } catch(e) {
      console.log(e);
    }
  }
  // Replace this function with the contents of _getVRNavigator() or _getARNavigator()
  // if you are building a specific type of experience.
  render() {
    let params = {
      sharedProps: this.state.sharedProps,
      server: this.state.server,
      story: this.state.story,
      index: this.state.index,
      pictures: this.state.stage.pictures,
      onZoneEnter: this.state.stage.onZoneEnter,
      onZoneLeave: this.state.stage.onZoneLeave,
      onPictureMatch: this.state.stage.onPictureMatch,
      appDir: this.state.appDir,
    };
    return (
      // options shadowsEnabled={true} bloomEnabled={true} hdrEnabled={true} bugged on my LG Q6
      // ref={(component) => {this.nav = component}} do we need ref ?
        <ViroARSceneNavigator hdrEnabled {...this.state.sharedProps} viroAppProps={params} initialScene={{ scene: InitialARScene }} style={styles.viroContainer}/>
    );
  }
}

var styles = StyleSheet.create({
  viroContainer :{
    flex : 1,
    backgroundColor: "black",
  }
});
