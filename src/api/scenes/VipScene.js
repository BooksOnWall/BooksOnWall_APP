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

export default class VipScene extends Component {
  constructor(props) {
    super(props);
    let params = this.props.sceneNavigator.viroAppProps;
    // Set initial state here
    this.state = {
      text : "You Found me ...",
      server: params.server,
      appName: params.appName,
      appDir: params.appDir,
      storyDir: params.appDir+'/stories/',
      story: params.story,
      index: params.index,
      stage: params.stage,
      pictures: params.pictures,
      picturePath: "",
      audioPath: "",
      paused: (params.paused) ? params.paused : false,
      muted: (params.muted) ? params.muted : false,
      audioLoop: false,
      videoPath: "",
      videoLoop: false,
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
      this.setState({
        text : "Search for me ..."
      });
    } else if (state == ViroConstants.TRACKING_NONE) {
      // Handle loss of tracking
    }
  }
  buildTrackingTargets = async () => {
    const {stage, pictures, storyDir} = this.state;
    try {
      //for (let picture of pictures) {
        //let path = picture.path;
        let path = pictures[0].path.replace(" ", "\ ");
        let radius = stage.radius;
        let dimension = (stage.dimension) ? stage.dimension.split("x"): null;
        let width = (dimension) ? parseFloat(dimension[0]) : 1;
        let height = (dimension) ? parseFloat(dimension[1]) : 1;
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
       //}
       // create materials

    } catch(e) {
      console.log(e);
    }
  }
  setVideoComponent = () => {
    const {story, index, storyDir} = this.state;
    const stage =  story.stages[index];
    let path = stage.onPictureMatch[0].path.replace(" ", "\ ");
    path = 'file://' + storyDir + path.replace("assets/stories", "");
    let loop = stage.onPictureMatch[0].loop;
    this.setState({'videoPath': path, 'videoLoop': loop});
  }
  loadAndPlayAudio = async () => {
    try {
      let path = this.state.stage.onZoneEnter[0].path.replace(" ", "\ ");
      path = 'file://'+this.state.storyDir + path.replace("assets/stories", "");
      let loop = this.state.stage.onZoneEnter[0].loop;
      this.setState({'audioPath': path,'audioLoop': loop });
    } catch(e) {
      console.log(e);
    }
  }
  onFinishSound = () => {
    console.log("Sound terminated");
  }
  onFinishVideo = () => {
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
    const {audioPath, audioLoop, videoPath, videoLoop } = this.state;
    const {audioPaused, audioMuted} = this.props.sceneNavigator.viroAppProps;
    console.log(audioPaused);
    return (
      <SafeAreaView>
      <ViroARScene onTrackingUpdated={this.onInitialized}  >
        <ViroSound
           paused={audioPaused}
           muted={audioMuted}
           source={{uri: audioPath }}
           loop={audioLoop}
           volume={1.0}
           onFinish={this.onFinishSound}
           onError={this.onErrorSound}
        />
        <ViroARImageMarker target={"targetOne"} >
            <ViroVideo
              source={{uri: videoPath}}
              dragType="FixedToWorld"
              onDrag={()=>{}}
              muted={false}
              paused={false}
              visible={true}
              loop={videoLoop}
              position={[0,0,0]}
              rotation={[-90,0,0]}
              opacity={1}
              onFinish={this.onFinishVideo}
              materials={["chromaKeyFilteredVideo"]}
            />
        </ViroARImageMarker>
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
