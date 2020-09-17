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
import { DEBUG_MODE } from '@env';
import KeepAwake from 'react-native-keep-awake';
import SafeAreaView from 'react-native-safe-area-view';
import { ButtonGroup } from 'react-native-elements';
import Icon from "../../../utils/Icon";
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import  distance from '@turf/distance';
import Geolocation from '@react-native-community/geolocation';
import Toast from 'react-native-simple-toast';
import I18n from "../../../utils/i18n";
/*
AR Scene type: INT(1-7)
#1 VIP aka Video inside Picture to detect
#2 VAAP aka Video aside anchored picture
#3 VAAMP aka Video anchored with multiple pictures
#4 PORTAL aka Portal
#5 PIV Picture inside Video
#6 PSIV multiple Pictures inside Video
#7 3D
*/
import VIP from '../../scenes/VipScene';
import VAAMP from '../../scenes/VaampScene';
import VAAP from '../../scenes/VaapScene';
import PORTAL from '../../scenes/PortalScene';
import PIV from '../../scenes/PIVScene';
import PSIV from '../../scenes/PSIVScene';
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
const sceneTypes = ['Scene types', 'VIP', 'VAAP', 'VAAMP', 'Portal', 'PIV', 'PSIV', '3D'];

const DebugArea = ({distance, debug}) => {
  console.log(distance);
  return (
    <View style={{margin: '5%', minWidth: '20%', minHeight: '10%', opacity: .5}}>
      <Text style={{color: '#FFF', fontSize: 24, fontWeight: 'bold'}}>{(distance*1000)+' Metros'}</Text>
      <Text style={{color: '#FFF', fontSize: 24, fontWeight: 'bold'}}>DEBUG: {debug}</Text>
  </View>
  );
};
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
      selected: 1,
      buttonaudioPaused: true,
      audioPaused: false,
      debug_mode: (DEBUG_MODE === 'true') ? true : false,
      audioMuted: false,
      completed: null,
      timeout: 10000,
      distance: this.props.navigation.getParam('distance'),
      radius: this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')].radius,
      initialPosition: null,
      fromLat: null,
      fromLong: null,
      toLong: null,
      toLat: null,
      lastPosition: null,
      scene_type: this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')].scene_type,
      scene_options: this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')].scene_options,
      index: this.props.navigation.getParam('index'),
      stage: this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')],
      sharedProps : sharedProps
    }
    console.log('index', this.props.navigation.getParam('index'));
    console.log('stage', this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')]);
    console.log('scene_options', this.state.scene_options);
    console.log('scene type',sceneTypes[this.state.scene_type]);
  }
  static navigationOptions = {
    title: 'To Augmented Reality',
    headerShown: false
  };
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      await this.getSelected();
      await this.getCurrentLocation();
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => {
    try {
      this.setState({timeout:0});
      await Geolocation.clearWatch(this.watchId);
      this.watchID = null;
      await this.setState({ navigatorType : UNSET });
      await KeepAwake.deactivate();
    } catch(e) {
      console.log(e);
    }
  }
  getCurrentLocation = async () => {
    let {story, index, timeout} = this.state;
    try {
      // Instead of navigator.geolocation, just use Geolocation.
      await Geolocation.getCurrentPosition(
        position => {
          const initialPosition = position;
          this.setState({
            initialPosition,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: timeout, maximumAge: 1000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => {
        this.setState({lastPosition: position,fromLat: position.coords.latitude, fromLong: position.coords.longitude});
        let from = {
          "type": "Feature",
          "properties": {},
            "geometry": {
              "type": "Point",
              "coordinates": [this.state.fromLong,this.state.fromLat ]
            }
          };
          let to = {
            "type": "Feature",
            "properties": {},
              "geometry": {
                "type": "Point",
                "coordinates": story.stages[index].geometry.coordinates
              }
            };
          let units = I18n.t("kilometers","kilometers");
          let dis = distance(from, to, "kilometers");
          if (dis) {
            this.setState({distance: dis.toFixed(3)});
            Toast.showWithGravity(I18n.t("GetOutZone","To continue your story , please go outside the AR search zone"), Toast.LONG, Toast.TOP);
          };
      },
      error => error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: timeout, maximumAge: 1000, enableHighAccuracy: true, distanceFilter: 1},
      );
    } catch(e) {
      console.log(e);
    }
  }
  watchID: ?number = null;
  cancelTimeout = () => this.setState({timeout: 0})
  reload = () => {
    this.togglePlaySound();
    this.setState({ navigatorType : UNSET });
    this.props.navigation.push('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: this.state.index} );
  }
  map = () => {
    this.togglePlaySound();
    this.setState({ navigatorType : UNSET });
    this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: this.state.index} );
  }

  getSelected = async() => {
      const {appDir, story,selected, index} = this.state;
      // get history from file
      const storyHF = appDir + '/stories/' + story.id + '/complete.txt';
      // // check if file exist
      await RNFS.exists(storyHF)
      .then( (exists) => {
          if (exists) {
              // get id from file
              RNFetchBlob.fs.readFile(storyHF, 'utf8')
              .then((data) => {
                // handle the data ..
                this.setState({completed: parseInt(data), selected: parseInt(data)});
                return data;
              })
          } else {
              RNFetchBlob.fs.createFile(storyHF, '0', 'utf8').then(()=>{
                this.setState({completed: 0, selected: 1});
              });
          }
      });
  }
  toggleButtonAudio = () => this.setState({buttonaudioPaused: !this.state.buttonaudioPaused})
  togglePlaySound = () => this.setState({audioPaused: !this.state.audioPaused})
  next = async () => {
    const {appDir, story, selected, completed, index} = this.state;
    let newIndex = (index < (story.stages.length-1)) ? (index+1) : null;
    const storyHF = appDir + '/stories/' + story.id + '/complete.txt';
    if (newIndex) {
      // get history from file
      try  {
        // // check if complete need to be updated
          await RNFS.exists(storyHF)
          .then( (exists) => {
              if (exists) {
                  // get write new value to file
                  // rimraf file
                  RNFetchBlob.fs.writeFile(storyHF, JSON.stringify(newIndex), 'utf8').then(()=>{
                  });

              } else {
                  RNFetchBlob.fs.createFile(storyHF, JSON.stringify(newIndex), 'utf8').then(()=>{
                  });
              }
          });
        // clean audio
        await this.setState({buttonaudioPaused: true, audioPaused: true});
        (this.woosh) ? this.woosh.release() : '';
        return await this.props.navigation.push('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: newIndex} );
      } catch(e) {
        console.log(e);
      }
    } else {
      await RNFS.exists(storyHF)
      .then( (exists) => {
          if (exists) {
              // get write new value to file
              // rimraf file
              RNFetchBlob.fs.writeFile(storyHF, JSON.stringify(story.stages.length), 'utf8').then(()=>{
              });

          }
      });
      // clean audio
      await this.setState({navigatorType : UNSET, buttonaudioPaused: true, audioPaused: true});

      return await this.props.navigation.navigate('StoryComplete', {screenProps: this.props.screenProps, story: this.state.story, index: 0} );
    }

  }
  // Replace this function with the contents of _getVRNavigator() or _getARNavigator()
  // if you are building a specific type of experience.
  render() {
    const { distance, debug_mode,  buttonaudioPaused, audioPaused, audioMuted, sharedProps, server, story, stage, sceneType, index, appDir } = this.state;
    let params = {
      sharedProps: sharedProps,
      server: server,
      story: story,
      stages: story.stages,
      stage: stage,
      sceneType: stage.scene_type,
      index: index,
      audioPaused: audioPaused,
      audioMuted: audioMuted,
      debug_mode: debug_mode,
      distance: distance, // en kilometers
      radius: stage.radius, // en meters
      buttonaudioPaused: buttonaudioPaused,
      pictures: stage.pictures,
      onZoneEnter: stage.onZoneEnter,
      onZoneLeave: stage.onZoneLeave,
      onPictureMatch: stage.onPictureMatch,
      appDir: appDir,
      togglePlaySound: this.togglePlaySound,
      toggleButtonAudio: this.toggleButtonAudio,
    };
    const storyReload = () => <Icon size={30} name='reload' type='booksonwall' color='#fff' onPress={() => this.reload()} />;
    const sound = () => {
      if(buttonaudioPaused && !audioPaused) {
        return <Icon size={30} name='pause' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
      } else if(buttonaudioPaused && audioPaused) {
        return <Icon size={30} name='play' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
      } else {
        return null;
      }
    };
    const storyMap = () => (debug_mode) ? <Icon size={30} name='geopoint' type='booksonwall' color='#fff' onPress={() => this.map()} /> : '';
    const storyNext = () => <Icon size={30} name='right-arrow' type='booksonwall' color='#fff' onPress={(e) => this.next()} />;
    const arButtons = [ { element: storyReload }, { element: storyMap }, { element: sound}, { element: storyNext} ];
    const arScene = {
      'vip':  { scene: VIP },
      'vaap':  { scene: VAAP },
      'vaamp':  { scene: VAAMP },
      'portal':  { scene: PORTAL},
      'piv': { scene: PIV},
      'psiv': { scene: PSIV}
    };
    let types = ['null','vip', 'vaap', 'vaamp', 'portal', 'piv', 'psiv'];
    let type = (stage.scene_type) ? types[stage.scene_type] : 'vip';
    console.log(type);
    console.log(arScene[type]);
    return (
      // options shadowsEnabled={true} bloomEnabled={true} hdrEnabled={true} bugged on my LG Q6
      // ref={(component) => {this.nav = component}} do we need ref ?
      <SafeAreaView style={styles.mainContainer}>
        {debug_mode && <DebugArea style={{position: 'absolute', zIndex: 1001}} distance={distance} debug={debug_mode} />}

        <ViroARSceneNavigator hdrEnabled {...this.state.sharedProps} viroAppProps={params} initialScene={arScene[type]} style={styles.viroContainer}/>
        <ButtonGroup style={styles.menu}
          buttonStyle={{ backgroundColor: 'transparent', borderWidth: 0, borderColor: '#4B4F53', margin: 0, minHeight: 44, maxHeight: 44}}
          onPress={this.updateDlIndex}
          selectedIndex={this.state.arIndex}
          selectedButtonStyle= {{backgroundColor: '#750000'}}
          buttons={arButtons}
          containerStyle= {{flex: 1, borderWidth: 0, borderColor: '#4B4F53', minHeight: 44, maxHeight: 44, backgroundColor: '#750000', borderRadius: 0, margin: 0, padding: 0}}
          innerBorderStyle= {{ color: '#570402' }}
          />
      </SafeAreaView>
    );
  }
}

var styles = StyleSheet.create({
  mainContainer: {
    flex : 1,
    backgroundColor: "#750000",
  },
  menu: {
    backgroundColor: "#750000",
  },
  viroContainer :{
    flex : 1,
    backgroundColor: "#750000",
  }
});
