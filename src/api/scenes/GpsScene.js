'use strict';

import React, { Component } from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {
  ViroConstants,
  ViroARScene,
  ViroARPlane,
  ViroARImageMarker,
  ViroMaterials,
  ViroVideo,
  ViroSound,
  ViroARTrackingTargets,
  ViroAmbientLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';
import { Patricie } from './Patricie';
import I18n from "../../utils/i18n";

export default class GpsScene extends Component {
  constructor(props) {
    super(props);
    let params = this.props.sceneNavigator.viroAppProps;
    this.toogleButtonAudio = params.toggleButtonAudio;
    this.goToMap = params.goToMap;
    this.next = params.next;
    // Set initial state here
    let scene_options = (typeof(params.stage.scene_options) === 'string') ? JSON.parse(params.stage.scene_options) : params.stage.scene_options;

    this.toogleButtonAudio = params.toggleButtonAudio;
    this.state = {
      server: params.server,
      appName: params.appName,
      appDir: params.appDir,
      storyDir: params.appDir+'/stories/',
      story: params.story,
      index: params.index,
      pIndex: 0,
      scene_options: scene_options,
      stage: params.stage,
      pictures: params.pictures,
      picturePath: "",
      audioPath: "",
      paused: (params.paused) ? params.paused : false,
      muted: (params.muted) ? params.muted : false,
      MatchAudioPath: false,
      MatchAudioPaused: true,
      MatchAudioMuted: false,
      MatchAudioLoop: false,
      finishAll: params.finishAll,
      anchorFound: false,
      imageTracking: params.imageTracking,
      animate: {name: 'movePicture'},
      message : I18n.t("NextPath", "Go to the next point"),
      theme: params.theme,
      fontFamily: params.theme.font3 ,
      color: params.theme.color2,
      audios: [],
      video: {},
      audioLoop: false,
      videoPath: "",
      videoLoop: false,
      lockVideo: false,
      onZoneEnter: params.onZoneEnter,
      onZoneLeave: params.onZoneLeave,
      onPictureMatch: params.onPictureMatch
    };
    console.log('index', params.index);
    this.onInitialized = this.onInitialized.bind(this);

    this.setVideoComponent = this.setVideoComponent.bind(this);
    this.loadAndPlayAudio = this.loadAndPlayAudio.bind(this);
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      await this.dispatchMedia();
      await this.setVideoComponent();
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
      // this.setState({
      //   text : "Search for me ..."
      // });
    } else if (state == ViroConstants.TRACKING_NONE) {
      // Handle loss of tracking
    }
  }
  audio = null
  stopAudio = () => {
    const {anchorFound} = this.state;
    console.log('anchorFound', anchorFound);
    if(anchorFound === null) {
      console.log('stop audio');
      this.setState({anchorFound: true, audioLoop: false});
      this.toggleButtonAudio();
    }
  }
  dispatchMedia = async () => {
    try  {
      const {story, index, storyDir} = this.state;
      let stage =  story.stages[index];
      stage.onZoneEnter = (typeof(stage.onZoneEnter) === 'string') ? JSON.parse(stage.onZoneEnter) : stage.onZoneEnter;
      stage.onPictureMatch = (typeof(stage.onPictureMatch) === 'string') ? JSON.parse(stage.onPictureMatch) : stage.onPictureMatch;
      let audios = [];
      let videos = [];
      audios['onZoneEnter'] = (stage.onZoneEnter && stage.onZoneEnter.length > 0 ) ? stage.onZoneEnter.filter(item => item.type === 'audio'): null;
      audios['onPictureMatch'] = (stage.onPictureMatch && stage.onPictureMatch.length > 0) ? stage.onPictureMatch.filter(item => item.type === 'audio') : null;
      videos['onPictureMatch'] = (stage.onPictureMatch && stage.onPictureMatch.length > 0) ? stage.onPictureMatch.filter(item => item.type === 'video') : null;

      this.setState({audios: audios, videos: videos});

      if (audios['onPictureMatch'] && audios['onPictureMatch'].length > 0 ) {
        let MatchAudio = audios['onPictureMatch'][0];
        let Matchpath = MatchAudio.path.replace(" ", "\ ");
        Matchpath = 'file://'+ storyDir + Matchpath.replace("assets/stories", "");
        let Matchloop = MatchAudio.loop;
        this.setState({MatchAudioPath: Matchpath,MatchAudioLoop: Matchloop });
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
  setVideoComponent = () => {
    const { videos, storyDir} = this.state;

    if (videos.onPictureMatch && videos.onPictureMatch.length > 0 ) {
      const video =  videos.onPictureMatch[0];
      if (video) {
        let path = video.path.replace(" ", "\ ");
        path = 'file://' + storyDir + path.replace("assets/stories/", "");
        let loop = video.loop;
        this.setState({'videoPath': path, 'videoLoop': loop});
      }
    }
  }
  loadAndPlayAudio = (zone) => {
    // play the first audio onZoneEnter or onPictureMatch after the video is finished
    // @zone string onZoneEnter or onPictureMatch
    const {audios, storyDir} = this.state;
      // set path & loop to audios : one by zone
      (zone === 'onPictureMatch' && audios && audios[zone] && audios[zone].length > 0) ? this.setState({MatchAudioPaused: false}) : this.setState({audioPaused: true, finishAll: true});
  }
  toggleButtonAudio = async () => this.props.sceneNavigator.viroAppProps.toggleButtonAudio()
  onFinishAll = () => this.setState({finishAll: true})
  onAnchorFound = e => {
    const {lockVideo} = this.state;
    console.log('lockVideo',lockVideo);
    if(!lockVideo) {
      this.setState({lockVideo: true});
      this.toggleButtonAudio();
    }
    console.log(e);
  }
  onFinishSound = () => {
    this.toggleButtonAudio();
    console.log("Sound terminated");
  }
  onBufferStart = () => {

    console.log("On Buffer Start");
  }
  onFinishVideo = () => {
    this.setState({imageTracking:  false});
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
    const {index, animate, fontFamily, color, imageTracking, finishAll, theme, pIndex, scene_options, MatchAudioPath, MatchAudioLoop, MatchAudioPaused, MatchAudioMuted, audioPath, audioLoop, videoPath, videoLoop, message } = this.state;
    const {audioPaused, audioMuted} = this.props.sceneNavigator.viroAppProps;
    console.log('audioPaused', audioPaused);
    console.log('MatchAudioPath',MatchAudioPath);
    console.log('scene_options videos',scene_options.videos);
    console.log('typeof scene_options', typeof(scene_options));
    const font = String(theme.font3,theme.font2,theme.font1);
    const textColor = String(color);
    console.log('videoPath', videoPath);
    return (
      <SafeAreaView>
      <ViroARScene  >
        <ViroSound
           paused={audioPaused}
           muted={audioMuted}
           source={{uri: audioPath }}
           loop={audioLoop}
           volume={.8}
           onFinish={this.onFinishSound}
           onError={this.onErrorSound}
        />

          <ViroVideo
            source={{uri: videoPath}}
            dragType="FixedToWorld"
            onDrag={()=>{}}
            width={parseFloat(scene_options.videos[0].width)}
            height={parseFloat(scene_options.videos[0].height)}
            muted={false}
            paused={false}
            loop={videoLoop}
            position={[0,0,-2.5]}
            rotation={[0,0,0]}
            opacity={1}
            onBufferStart={this.onBufferStart}
            onFinish={this.onFinishVideo}
            onError={this.onVideoError}
            materials={["chromaKeyFilteredVideo"]}
          />

        <Patricie
          animate={{name: 'movePicture', run: finishAll, loop: false}}
          animate2={{name: 'moveBaloon', run: finishAll, loop: false}}
          animate3={{name:  'moveText', run: finishAll, loop: false }}
          finishAll={finishAll}
          theme={theme}
          next={this.next}
          message={message}
          theme={theme}
          font={font}
          textColor={color}
          />
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
