'use strict';

import React, { Component } from 'react';
import {SafeAreaView,ActivityIndicator, Button, Text,StyleSheet, TouchableHighlight} from 'react-native';
import {
  ViroConstants,
  ViroARScene,
  ViroARImageMarker,
  ViroVideo,
  ViroMaterials,
  ViroSound,
  ViroARTrackingTargets,
  ViroAmbientLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';

export default class GpsScene extends Component {
  constructor(props) {
    super(props);
    let params = this.props.sceneNavigator.viroAppProps;
    // Set initial state here
    this.toogleButtonAudio = params.toggleButtonAudio;
    this.state = {
      text : "You Found me ...",
      server: params.server,
      appName: params.appName,
      appDir: params.appDir,
      storyDir: params.appDir+'/stories/',
      story: params.story,
      index: params.index,
      pIndex: 0,
      scene_options: params.stage.scene_options,
      stage: params.stage,
      pictures: params.pictures,
      picturePath: "",
      audioPath: "",
      paused: (params.paused) ? params.paused : false,
      muted: (params.muted) ? params.muted : false,
      MatchAudioPath: null,
      MatchAudioPaused: true,
      MatchAudioMuted: false,
      MatchAudioLoop: false,
      audios: [],
      video: {},
      audioLoop: false,
      videoPath: "",
      videoLoop: false,
      onZoneEnter: params.onZoneEnter,
      onZoneLeave: params.onZoneLeave,
      onPictureMatch: params.onPictureMatch
    };
    console.log('index', params.index);
    this.onInitialized = this.onInitialized.bind(this);
    this.buildTrackingTargets = this.buildTrackingTargets.bind(this);
    this.setVideoComponent = this.setVideoComponent.bind(this);
    this.loadAndPlayAudio = this.loadAndPlayAudio.bind(this);
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      await this.dispatchMedia();
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => {
    try {
      await KeepAwake.deactivate();
    } catch(e) {
      console.log(e.message);
    }

  }
  onInitialized(state, reason) {
    if (state == ViroConstants.TRACKING_NORMAL) {
      this.setState({
        text : "Search for me ..."
      });
    } else if (state == ViroConstants.TRACKING_NONE) {
      // Handle loss of tracking
    }
  }
  audio = null
  dispatchMedia = async () => {
    try  {
      const {story, index, storyDir} = this.state;
      const stage =  story.stages[index];
      let audios = [];
      let videos = [];
      audios['onZoneEnter'] = (stage.onZoneEnter && stage.onZoneEnter.length > 0 ) ? stage.onZoneEnter.filter(item => item.type === 'audio'): null;
      audios['onPictureMatch'] = (stage.onPictureMatch && stage.onPictureMatch.length > 0) ? stage.onPictureMatch.filter(item => item.type === 'audio') : null;
      videos['onZoneEnter'] = (stage.onZoneEnter && stage.onZoneEnter.length > 0 ) ? stage.onZoneEnter.filter(item => item.type === 'video') : null;
      videos['onPictureMatch'] = (stage.onPictureMatch && stage.onPictureMatch.length > 0) ? stage.onPictureMatch.filter(item => item.type === 'video') : null;

      this.setState({audios: audios, videos: videos});

      if (audios['onPictureMatch'] && audios['onPictureMatch'].length > 0 ) {
        let MatchAudio = audios['onPictureMatch'][0];
        let Matchpath = MatchAudio.path.replace(" ", "\ ");
        Matchpath = 'file://'+ storyDir + path.replace("assets/stories", "");
        let Matchloop = MatchAudio.loop;
        this.setState({'MatchAudioPath': Matchpath,'MatchAudioLoop': Matchloop });
      }
      if (audios['onZoneEnter'] && audios['onZoneEnter'].length > 0 ) {
        let audio = audios['onZoneEnter'][0];
        let path = audio.path.replace(" ", "\ ");
        path = 'file://'+ storyDir + path.replace("assets/stories", "");
        let loop = audio.loop;
        this.setState({'audioPath': path,'audioLoop': loop });
      }
    } catch(e) {
      console.log(e);
    }

  }
  loadAndPlayAudio = (zone) => {
    // play the first audio onZoneEnter or onPictureMatch after the video is finished
    // @zone string onZoneEnter or onPictureMatch
    const {audios, storyDir} = this.state;
      // set path & loop to audios : one by zone
      (zone === 'onPictureMatch') ? this.setState({MatchAudioPaused: false}) : this.setState({audioPaused: true});
  }
  toggleButtonAudio = async () => this.props.sceneNavigator.viroAppProps.toggleButtonAudio()
  onFinishSound = () => {
    this.toggleButtonAudio();
    console.log("Sound terminated");
  }
  onFinishVideo = () => {
    this.loadAndPlayAudio('onPictureMatch');
    console.log("Video terminated");
  }
  onVideoError = (event) => {
    console.log("Video loading failed with error: " + event.nativeEvent.error);
  }
  onErrorSound = (event) => {
    console.log("Audio loading failed with error: " + event.nativeEvent.error);
  }
  toPath = (radius) => {
      console.log('radius', radius);
  }
  onButtonGaze() {
      this.setState({ buttonStateTag: "onGaze" });
  }
  onButtonTap() {
      this.setState({ buttonStateTag: "onTap" });
  }
  render = () => {
    const {index, pIndex, scene_options, MatchaudioPath, MatchAudioLoop, MatchAudioPaused, MatchAudioMuted, audioPath, audioLoop, videoPath, videoLoop } = this.state;
    const {audioPaused, audioMuted} = this.props.sceneNavigator.viroAppProps;
    console.log('audioPaused', audioPaused);
    console.log('index',index);
    return (
      <SafeAreaView>
      <ViroARScene onTrackingUpdated={this.onInitialized}  >
        <ViroSound
           paused={audioPaused}
           muted={audioMuted}
           source={{uri: audioPath }}
           loop={audioLoop}
           volume={.8}
           onFinish={this.onFinishSound}
           onError={this.onErrorSound}
        />
        {(MatchaudioPath) ?
          <ViroSound
             paused={MatchAudioPaused}
             muted={MatchAudioMuted}
             source={{uri: MatchAudioPath }}
             loop={MatchAudioLoop}
             volume={1.0}
             onFinish={this.onFinishSound}
             onError={this.onErrorSound}
          /> : null}
      </ViroARScene>
      </SafeAreaView>
    );
  }
}
ViroMaterials.createMaterials({
  chromaKeyFilteredVideo : {
    chromaKeyFilteringColor: "#00FF00"
  },
});

var styles = StyleSheet.create({
  helloWorldTextStyle: {
    fontFamily: 'Arial',
    fontSize: 30,
    color: '#ffffff',
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});
