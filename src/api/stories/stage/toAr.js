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
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';

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
      selected: 1,
      buttonaudioPaused: false,
      audioPaused: false,
      audioMuted: false,
      completed: null,
      index: this.props.navigation.getParam('index'),
      stage: this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')],
      sharedProps : sharedProps
    }
    console.log('index', this.props.navigation.getParam('index'));
  }
  static navigationOptions = {
    title: 'To Augmented Reality',
    headerShown: false
  };
  componentDidMount = async () => {
    await KeepAwake.activate();
    await this.getSelected();
  }
  componentWillUnmount = async () => {
    try {
      await this.setState({ navigatorType : UNSET });
      await KeepAwake.deactivate();
    } catch(e) {
      console.log(e);
    }
  }
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
      console.log(appDir);
      // get history from file
      const storyHF = appDir + '/stories/' + story.id + '/complete.txt';
      console.log(storyHF);
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
                console.log('file created');
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
      console.log('index',index);
      console.log('selected', selected);
      console.log('completed', completed);
      console.log('newIndex', newIndex);
      // get history from file
      try  {
        console.log('newIndex', newIndex);
        // // check if complete need to be updated
          await RNFS.exists(storyHF)
          .then( (exists) => {
              if (exists) {
                  console.log("History File exist");
                  // get write new value to file
                  // rimraf file
                  RNFetchBlob.fs.writeFile(storyHF, JSON.stringify(newIndex), 'utf8').then(()=>{
                    console.log('file writen', newIndex);
                  });

              } else {
                  console.log("File need to be created with index 1");
                  RNFetchBlob.fs.createFile(storyHF, JSON.stringify(newIndex), 'utf8').then(()=>{
                    console.log('file created');
                  });
              }
          });

        await this.setState({audioPaused: true});

        return await this.props.navigation.push('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: newIndex} );
      } catch(e) {
        console.log(e);
      }
    } else {
      await RNFS.exists(storyHF)
      .then( (exists) => {
          if (exists) {
              console.log("History File exist");
              // get write new value to file
              // rimraf file
              RNFetchBlob.fs.writeFile(storyHF, JSON.stringify(story.stages.length), 'utf8').then(()=>{
                console.log('file writen', story.stages.length);
              });

          }
      });
      await this.togglePlaySound();
      return await this.props.navigation.navigate('StoryComplete', {screenProps: this.props.screenProps, story: this.state.story, index: 0} );
    }
  }
  // Replace this function with the contents of _getVRNavigator() or _getARNavigator()
  // if you are building a specific type of experience.
  render() {
    const { buttonaudioPaused, audioPaused, audioMuted, sharedProps, server, story, stage, sceneType, index, appDir } = this.state;
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
      buttonaudioPaused: buttonaudioPaused,
      pictures: stage.pictures,
      onZoneEnter: stage.onZoneEnter,
      onZoneLeave: stage.onZoneLeave,
      onPictureMatch: stage.onPictureMatch,
      appDir: appDir,
      toggleButtonAudio: this.toggleButtonAudio,
    };
    const storyReload = () => <Icon size={30} name='reload' type='booksonwall' color='#fff' onPress={() => this.reload()} />;
    const sound = () => {
      console.log('buttonaudioPaused', buttonaudioPaused);
      if(buttonaudioPaused && !audioPaused) {
        return <Icon size={30} name='pause' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
      } else if(buttonaudioPaused && audioPaused) {
        return <Icon size={30} name='play' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
      } else {
        return null;
      }
    }
    const storyMap = () => <Icon size={30} name='geopoint' type='booksonwall' color='#fff' onPress={() => this.map()} />;
    const storyNext = () => <Icon size={30} name='right-arrow' type='booksonwall' color='#fff' onPress={(e) => this.next()} />;
    const arButtons = [ { element: storyReload }, { element: storyMap }, { element: sound}, { element: storyNext} ];
    const arScene = {
      'vip':  { scene: VIP },
      'vaap':  { scene: VAAP },
      'vaamp':  { scene: VAAMP },
      'portal':  { scene: PORTAL}
    };
    let types = ['null','vip', 'vaap', 'vaamp', 'portal'];
    let type = (stage.scene_type) ? types[stage.scene_type] : 'vip';
    return (
      // options shadowsEnabled={true} bloomEnabled={true} hdrEnabled={true} bugged on my LG Q6
      // ref={(component) => {this.nav = component}} do we need ref ?
      <SafeAreaView style={styles.mainContainer}>
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
