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

export default class VaampScene extends Component {
  constructor(props) {
    super(props);
    let params = this.props.sceneNavigator.viroAppProps;
    this.toogleButtonAudio = params.toggleButtonAudio;
    this.goToMap = params.goToMap;
    this.next = params.next;
    // Set initial state here
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
      finishAll: params.finishAll,
      animate: {name: 'movePicture'},
      anchorFound: false,
      imageTracking: params.imageTracking,
      animate: {name: 'movePicture'},
      message : I18n.t("NextPath", "Go to the next point"),
      theme: params.theme,
      fontFamily: params.theme.font3,
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
    this.onInitialized = this.onInitialized.bind(this);
    this.buildTrackingTargets = this.buildTrackingTargets.bind(this);
    this.setVideoComponent = this.setVideoComponent.bind(this);
    this.loadAndPlayAudio = this.loadAndPlayAudio.bind(this);
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      await this.loadAndPlayAudio();
      await this.setVideoComponent();
      await this.buildTrackingTargets();
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => {
    try {
      await KeepAwake.deactivate();
      if(audio) await audio.release();
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
    try {
      let pictures = this.state.pictures;
      //for (let picture of pictures) {
        //let path = picture.path;
        let path = pictures[0].path;
        let radius = this.state.stage.radius;
        let dimension = this.state.stage.dimension.split("x");
        let width = parseFloat(dimension[0]);
        let height = parseFloat(dimension[1]);
        path = 'file://' + this.state.storyDir + path.replace("assets/stories", "");
        //this.setState({picturePath: path});
        await ViroARTrackingTargets.createTargets({
          "targetVAMP" : {
            source : { uri: path },
            orientation : "Up",
            physicalWidth : width, // real world width in meters
            type: 'Image'
          },
        });
       //}
       // create materials

    } catch(e) {
      console.log(e);
    }
  }
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
    let path = this.state.stage.onPictureMatch[0].path;
    path = 'file://' + this.state.storyDir + path.replace("assets/stories", "");
    let loop = this.state.stage.onPictureMatch[0].loop;
    this.setState({'videoPath': path, 'videoLoop': loop});
  }
  loadAndPlayAudio = async () => {
    try {
      let path = this.state.stage.onZoneEnter[0].path;
      path = 'file://'+this.state.storyDir + path.replace("assets/stories", "");
      let loop = this.state.stage.onZoneEnter[0].loop;
      this.setState({'audioPath': path,'audioLoop': loop });
    } catch(e) {
      console.log(e);
    }
  }
  onFinishAll = () => this.setState({finishAll: true})
  onAnchorFound = e => {
    const {lockVideo} = this.state;
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
    const font = String(theme.font3,theme.font2,theme.font1);
    const textColor = String(color);
    return (
      <SafeAreaView>
      <ViroARScene onTrackingUpdated={this.onInitialized}  >
        <ViroSound
           paused={false}
           muted={false}
           source={{uri: this.state.audioPath }}
           loop={this.state.audioLoop}
           volume={1.0}
           onFinish={this.onFinishSound}
           onError={this.onErrorSound}
        />
      <ViroARImageMarker target={"targetVAMP"} onAnchorFound={this.onAnchorFound} >
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
                position={[parseFloat(scene_options.videos[0].x),parseFloat(scene_options.videos[0].y),parseFloat(scene_options.videos[0].z)]}
                rotation={[-90,0,0]}
                opacity={1}
                onBufferStart={this.onBufferStart}
                onError={this.onVideoError}
                onFinish={this.onFinishVideo}
                materials={["chromaKeyFilteredVideo"]}
              />


          </ViroARImageMarker>
          {(MatchAudioPath) ?
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
