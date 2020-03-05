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

import KeepAwake from 'react-native-keep-awake';
import SafeAreaView from 'react-native-safe-area-view';
import { ButtonGroup } from 'react-native-elements';
import Icon from "../../../utils/Icon";


/*
AR Scene type:
#1 VIP aka Video inside Picture to detect
#2 VAAP aka Video aside anchored picture
#3 VAAMP aka Video anchored with multiple pictures
#4 PORTAL aka Portal
*/
import VIP from '../../scenes/VipScene';
import VAAMP from '../../scenes/VaampScene';
import VAAP from '../../scenes/VaapScene';
import PORTAL from '../../scenes/PortalScene';
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
      position: this.props.navigation.getParam('position'),
      arIndex: -1,
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
      await this.setState({ navigatorType : UNSET });
      await KeepAwake.deactivate();
    } catch(e) {
      console.log(e);
    }
  }
  reload = () => this.props.navigation.push('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: this.state.index} )
  map = () => this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: this.state.index} )
  next = () => {

  }
  // Replace this function with the contents of _getVRNavigator() or _getARNavigator()
  // if you are building a specific type of experience.
  render() {
    let params = {
      sharedProps: this.state.sharedProps,
      server: this.state.server,
      story: this.state.story,
      stages: this.state.story.stages,
      sceneType: this.state.stage.scene_type,
      index: this.state.index,
      pictures: this.state.stage.pictures,
      onZoneEnter: this.state.stage.onZoneEnter,
      onZoneLeave: this.state.stage.onZoneLeave,
      onPictureMatch: this.state.stage.onPictureMatch,
      appDir: this.state.appDir,
    };
    const storyReload = () => <Icon size={40} name='reload-circle' color='#4D0101' onPress={() => this.reload()} />;
    const storyMap = () => <Icon size={40} name='geopoint-circle' color='#4D0101' onPress={() => this.map()} />;
    const storyNext = () => <Icon size={40} name='next-circle' color='#4D0101' onPress={() => this.next()} />;
    const arButtons = [ { element: storyReload }, { element: storyMap }, { element: storyNext} ];
    const arScene = {
      'vip':  { scene: VIP },
      'vaap':  { scene: VAAP },
      'vaamp':  { scene: VAAMP },
      'portal':  { scene: PORTAL}
    };
    let types = ['vip', 'vaap', 'vaamp', 'portal'];
    let type = (this.state.stage.scene_type) ? types[this.state.stage.scene_type] : 'vip';
    return (
      // options shadowsEnabled={true} bloomEnabled={true} hdrEnabled={true} bugged on my LG Q6
      // ref={(component) => {this.nav = component}} do we need ref ?
      <SafeAreaView style={styles.mainContainer}>
        <ViroARSceneNavigator hdrEnabled {...this.state.sharedProps} viroAppProps={params} initialScene={arScene[type]} style={styles.viroContainer}/>
        <ButtonGroup style={styles.menu}
          buttonStyle={{ backgroundColor: 'transparent', borderWidth: 0, borderColor: '#4B4F53', margin: 0, minHeight: 50, maxHeight: 50}}
          onPress={this.updateDlIndex}
          selectedIndex={this.state.arIndex}
          selectedButtonStyle= {{backgroundColor: '#750000'}}
          buttons={arButtons}
          containerStyle= {{flex: 1, borderWidth: 0, borderColor: '#4B4F53', minHeight: 50, maxHeight: 50, backgroundColor: 'transparent', borderRadius: 0, margin: 0, padding: 0}}
          innerBorderStyle= {{ color: '#750000' }}
          />
      </SafeAreaView>
    );
  }
}

var styles = StyleSheet.create({
  mainContainer: {
    flex : 1,
    backgroundColor: "transparent",
  },
  menu: {
    backgroundColor: "transparent",
  },
  viroContainer :{
    flex : 1,
    backgroundColor: "transparent",
  }
});
