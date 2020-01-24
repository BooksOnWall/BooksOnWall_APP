'use strict';

import React, { Component } from 'react';

import {SafeAreaView,ActivityIndicator, Button, Text,StyleSheet, TouchableHighlight} from 'react-native';
//import { Button, Icon } from 'react-native-elements';
import {
  ViroConstants,
  ViroARScene,
  ViroARImageMarker,
  ViroVideo,
  ViroText,
  ViroSound,
  ViroARTrackingTargets,
  ViroAmbientLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';


export default class ArScene extends Component {
  constructor(props) {
    super(props);
    let params = this.props.sceneNavigator.viroAppProps;
    // Set initial state here
    this.state = {
      text : "You Found me ...",
      server: params.server,
      appName: params.appName,
      appDir: params.appDir,
      story: params.story,
      index: params.index,
      stage: params.story.stages[params.index],
      pictures: params.pictures,
      picturePath: "",
      audioPath: "",
      audioLoop: false,
      videoPath: "",
      videoLoop: false,
      onZoneEnter: params.onZoneEnter,
      onZoneLeave: params.onZoneLeave,
      onPictureMatch: params.onPictureMatch
    };
    // console.table(this.state.pictures);
    // console.log(params.appDir);
    // bind 'this' to functions
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
    await KeepAwake.deactivate();
    await audio.release();
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
    try {
      let pictures = this.state.pictures;
      //for (let picture of pictures) {
        //let path = picture.path;
        let path = pictures[0].path;
        let radius = this.state.stage.radius;
        let dimension = this.state.stage.dimension.split("x");
        let width = parseFloat(dimension[0]);
        let height = parseFloat(dimension[1]);
        path = 'file://' + this.state.appDir + path.replace("assets/stories", "");
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
    } catch(e) {
      console.log(e);
    }
  }
  setVideoComponent = () => {
    let path = this.state.stage.onPictureMatch[0].path;
    path = 'file://' + this.state.appDir + path.replace("assets/stories", "");
    let loop = this.state.stage.onPictureMatch[0].loop;
    this.setState({'videoPath': path, 'videoLoop': loop});
  }
  loadAndPlayAudio = async () => {
    try {
      let path = this.state.stage.onZoneEnter[0].path;
      path = 'file://'+this.state.appDir + path.replace("assets/stories", "");
      let loop = this.state.stage.onZoneEnter[0].loop;
      this.setState({'audioPath': path,'audioLoop': loop });
    } catch(e) {
      console.log(e);
    }
  }
  onFinishSound = () => {
    console.log("Sound terminated");
  }
  onErrorSound = (error) => {
    console.log(error);
  }
  toPath = (radius) => {
      console.log('radius', radius);
  }
  render = () => {
    return (
      <ViroARScene onTrackingUpdated={this.onInitialized} displayPointCloud >
        <ViroSound
           paused={false}
           muted={false}
           source={{uri: this.state.audioPath }}
           loop={this.state.audioLoop}
           volume={1.0}
           onFinish={this.onFinishSound}
           onError={this.onErrorSound}
        />
        <ViroARImageMarker target={"targetOne"} >
            <ViroVideo
              source={{uri: this.state.videoPath}}
              height={3}
              width={3}
              loop={this.state.videoLoop}
              position={[0,2,-5]}
            />
        </ViroARImageMarker>
      </ViroARScene>
    );
  }
}

var styles = StyleSheet.create({
  helloWorldTextStyle: {
    fontFamily: 'Arial',
    fontSize: 30,
    color: '#ffffff',
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});
