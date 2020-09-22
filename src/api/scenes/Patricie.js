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
    ["rotate","moveRight", "moveLeft"]
  ]
});
const Patricie = ({animate, finishAll, goToMap, text, textColor, font }) => {
  return (
    <>
    <ViroFlexView
      style={{flexDirection: 'row', padding: 0, backgroundColor: 'transparent'}}
      animation={{name: animate, run: finishAll, loop: false}}
      width={1}
      height={1}
      position={[0,0,-2]}
      visible={finishAll}
      opacity={1}
      onPress={() => goToMap()}
      onClick={() => goToMap() }
      rotation={[0, 0, 0]} >
      <ViroImage
        width={1}
        height={1}
        visible={finishAll}
        animation={{name: animate, run: finishAll, loop: false}}
        resizeMode="ScaleToFit"
        source={Bubble}
        onPress={() => goToMap()}
        onClick={() => goToMap() }
        position={[0,-.5,-.2]}
      />
    </ViroFlexView>
      <ViroText
        text={text}
        textAlign="top"
        textAlignVertical="top"
        textLineBreakMode="Justify"
        textClipMode="ClipToBounds"
        width={1}
        height={1}
        visible={finishAll}
        style={{
          fontFamily: font,
          fontWeight: 'bold',
          fontSize: 12,
          zIndex: 1500,
          color: textColor
        }}
        scale: [1,1,1],
        position={[0,0,-1.9]}
        />
        </>
  );
}
export {Patricie}
