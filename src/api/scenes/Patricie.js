'use strict';

import React, { Component } from 'react';
import {
  ViroConstants,
  ViroImage,
  ViroText,
  ViroFlexView,
  ViroAnimations,
  ViroAmbientLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';
import Bubble from '../../../assets/materials/patricie.png';
import I18n from "../../utils/i18n";

ViroAnimations.registerAnimations({
  rotate:{
    properties:{
      scaleX: "+=-2",
      rotateX:"+=180",
      rotateY:"+=180",
      rotateZ: "+=180"},
    easing:"EaseInEaseOut",
    duration: 2000
  },
  moveRight:{
    properties:{
      positionX:"+=0.3"
    },
    easing:"EaseInEaseOut",
    duration: 500
  },
  moveLeft:{
    properties:{
      positionX:"-=0.3"
    },
    easing:"EaseInEaseOut",
    duration: 500
  },
  movePicture:[
    ["moveRight", "rotate", "moveLeft"]
  ]
});
const Patricie = ({animate, finishAll, goToMap, text, textColor, font }) => {
  return (
    <>
    <ViroFlexView
      style={{flexDirection: 'row', padding: 0, backgroundColor: 'transparent'}}
      animation={animate}
      width={1}
      height={1}
      position={[0,0,-2]}
      visible={finishAll}
      opacity={1}
      onPress={() => goToMap()}
      rotation={[0, 0, 0]} >
      <ViroImage
        width={1}
        height={1}
        visible={finishAll}
        animation={animate}
        resizeMode="ScaleToFit"
        source={Bubble}
        onPress={() => goToMap()}
        position={[0,-.5,-.2]}
      />
    </ViroFlexView >
    <ViroFlexView
      style={{flexDirection: 'row', padding: 0, backgroundColor: 'transparent'}}
      animation={animate}
      width={1}
      height={1}
      position={[0,0,-21.9]}
      visible={finishAll}
      opacity={1}
      onPress={() => goToMap()}
      rotation={[0, 0, 0]} >
      <ViroText
        text={text}
        textAlign="center"
        textAlignVertical="top"
        textLineBreakMode="Justify"
        textClipMode="ClipToBounds"
        width={.3}
        height={.3}
        visible={finishAll}
        onPress={() => goToMap()}
        style={{
          fontFamily: font,
          fontWeight: 'bold',
          fontSize: 6,
          color: textColor
        }}
        position={[0,0,0]}
        />
        </ViroFlexView >
        </>
  );
}
export {Patricie}
