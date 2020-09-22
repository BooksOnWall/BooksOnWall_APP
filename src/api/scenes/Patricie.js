'use strict';

import React, { Component } from 'react';
import { Text } from 'react-native';
import {
  ViroConstants,
  ViroImage,
  ViroText,
  ViroFlexView,
  ViroAnimations,
  ViroAmbientLight,
  ViroParticleEmitter,
  ViroSpotLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';
import Bubble from '../../../assets/materials/patricie.png';
import Leaf from '../../../assets/materials/leaf.png';
import I18n from "../../utils/i18n";

ViroAnimations.registerAnimations({
  rotate:{
    properties:{
      scaleX: "+=-2",
      scaleY: "+=-2",
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
const Patricie = ({animate, finishAll, next, message, textColor, font }) => {
  return (
        <>
      <ViroSpotLight position={[0, -0.25, 0]}
        color="#FF9900"
        direction={[0, 0, -1]}
        attenuationStartDistance={5}
        attenuationEndDistance={10}
        innerAngle={5}
        outerAngle={20}
        castsShadow={true}
      />
      <ViroParticleEmitter
        position={[0, 4.5, 0]}
        duration={2000}
        run={finishAll}
        visible={finishAll}
        delay={0}
        loop={true}
        fixedToEmitter={true}
        image={{
          source: Leaf,
          height:0.1,
          width:0.1,
          bloomThreshold:1.0
        }}
        spawnBehavior={{
          particleLifetime:[4000,4000],
          emissionRatePerSecond:[15, 20],
          spawnVolume:{
            shape:"box",
            params:[20, 1, 20],
            spawnOnSurface:false
          },
          maxParticles:80
        }}
        particleAppearance={{
          opacity:{
            initialRange:[0, 0],
            factor:"Time",
            interpolation:[
              {endValue:0.5, interval:[0,500]},
              {endValue:1.0, interval:[4000,5000]}
            ]
          },
          rotation:{
            initialRange:[0, 360],
            factor:"Time",
            interpolation:[
              {endValue:1080, interval:[0,5000]},
            ]
          },
          scale:{
            initialRange:[[5,5,5], [10,10,10]],
            factor:"Time",
            interpolation:[
              {endValue:[3,3,3], interval:[0,4000]},
              {endValue:[0,0,0], interval:[4000,5000]}
            ]
          },
          }}
          particlePhysics={{
            velocity:{
            initialRange:[[-2,-.5,0], [2,-3.5,0]]}
          }}
      />
      <ViroFlexView
        style={{flexDirection: 'row', padding: 0, backgroundColor: 'transparent'}}
        width={1}
        height={1}
        position={[0,0,-2]}
        animation={animate}
        visible={finishAll}
        opacity={1}
        onPress={() => next()}
        onClick={() => next()}
        rotation={[0, 0, 0]} >
        <ViroImage
          width={1}
          height={1}
          visible={finishAll}
          animation={animate}
          resizeMode="ScaleToFit"
          source={Bubble}
          onPress={() => next()}
          onClick={() => next()}
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
        onPress={() => next()}
        onClick={() => next()}
        rotation={[0, 0, 0]} >
        <ViroText
          text={message}
          textAlign="center"
          textAlignVertical="top"
          textLineBreakMode="Justify"
          textClipMode="ClipToBounds"
          width={.3}
          height={.3}
          visible={finishAll}
          onPress={() => next()}
          onClick={() => next()}
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
export { Patricie }
