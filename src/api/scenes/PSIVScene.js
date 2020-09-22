'use strict';

import React, { Component } from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {
  ViroConstants,
  ViroARScene,
  ViroARImageMarker,
  ViroMaterials,
  ViroVideo,
  ViroSound,
  ViroARTrackingTargets,
  ViroAmbientLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';
import {Patricie} from './Patricie';

import I18n from "../../utils/i18n";

export default class PSIVScene extends Component {
  constructor(props) {
    super(props);
    let params = this.props.sceneNavigator.viroAppProps;
    // Set initial state here
    this.toogleButtonAudio = params.toggleButtonAudio;
    this.state = {
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
      finishAll: false,
      animate: {name: 'movePicture'},
      text : I18n.t("NextPath", "Go to the next point"),
      theme: params.theme,
      fontFamily: params.theme.font1,
      color: params.theme.color2,
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
      await this.setVideoComponent();
      await this.buildTrackingTargets();
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
  buildTrackingTargets = async () => {
    const {pIndex, stage, pictures, storyDir, scene_options} = this.state;
    try {
        let path = pictures[0].path.replace(" ", "\ ");
        let radius = stage.radius;
        console.log('psiv',scene_options.videos[0]);
        let width = (scene_options.pictures && scene_options.pictures.length >0 ) ? parseFloat(scene_options.pictures[pIndex].width) : 1;
        let height = (scene_options.pictures && scene_options.pictures.length >0 ) ? parseFloat(scene_options.pictures[pIndex].height) : 1;
        path = 'file://' + this.state.storyDir + path.replace("assets/stories", "");
        //this.setState({picturePath: path});
        await ViroARTrackingTargets.createTargets({
          "targetOne" : {
            source : { uri: path },
            orientation : "Up",
            physicalWidth : width, // real world width in meters
            type: 'Image'
          },
        });

       // create materials

    } catch(e) {
      console.log(e);
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
  setVideoComponent = () => {
    const { videos, storyDir} = this.state;

    if (videos.onPictureMatch && videos.onPictureMatch.length > 0 ) {
      const video =  videos.onPictureMatch[0];
      if (video) {
        let path = video.path.replace(" ", "\ ");
        path = 'file://' + storyDir + path.replace("assets/stories", "");
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
    const {index, finishAll, animate,text, fontFamily, color, pIndex, scene_options, MatchaudioPath, MatchAudioLoop, MatchAudioPaused, MatchAudioMuted, audioPath, audioLoop, videoPath, videoLoop } = this.state;
    const {audioPaused, audioMuted} = this.props.sceneNavigator.viroAppProps;
    console.log('audioPaused', audioPaused);
    console.log('index',index);
    const font = String(fontFamily);
    const textColor = String(color);
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
        <ViroARImageMarker target={"targetOne"} >
            <ViroVideo
              source={{uri: videoPath}}
              dragType="FixedToWorld"
              onDrag={()=>{}}
              width={parseFloat(scene_options.videos[0].width)}
              height={parseFloat(scene_options.videos[0].height)}
              muted={false}
              paused={false}
              visible={true}
              loop={videoLoop}
              position={(scene_options.pictures[pIndex].videoPosition) ? [parseFloat(scene_options.pictures[pIndex].videoPosition.x),parseFloat(scene_options.pictures[pIndex].videoPosition.y),parseFloat(scene_options.pictures[pIndex].videoPosition.z)] : [0,0,0]}
              rotation={[-90,0,0]}
              opacity={1}
              onError={this.onVideoError}
              onFinish={this.onFinishVideo}
              materials={["chromaKeyFilteredVideo"]}
            />


        </ViroARImageMarker>
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
          <Patricie
            animate={{name: 'movePicture', run: finishAll, loop: false}}
            finishAll={finishAll}
            goToMap={this.goToMap}
            text={text}
            font={font}
            textColor={textColor}
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
