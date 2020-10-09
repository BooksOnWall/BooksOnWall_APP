'use strict';

import React, { Component } from 'react';
import { Text } from 'react-native';
import {
  ViroConstants,
  ViroImage,
  ViroText,
  ViroNode,
  ViroFlexView,
  ViroAnimations,
  ViroMaterials,
  ViroAmbientLight,
  ViroParticleEmitter,
  ViroSpotLight
} from 'react-viro';
import KeepAwake from 'react-native-keep-awake';
import Bubble from '../../../assets/materials/patricie.png';
import Bubble2 from '../../../assets/materials/baloon.png';
import Leaf from '../../../assets/materials/leaf.png';
import Petal from '../../../assets/materials/petal.png';
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
    duration: 300
  },
  moveLeft:{
    properties:{
      positionX:"-=0.3"
    },
    easing:"EaseInEaseOut",
    duration: 300
  },
  hide: {
    properties:{
      opacity:"=0"
    },
    duration: 2
  },
  wait: {
    properties:{
      opacity:"=0"
    },
    easing:"EaseInEaseOut",
    duration: 3000
  },
  positionText: {
    properties:{
      opacity:"+=1",
      positionY:"-=0.045",
      positionX: "+=0.3",
      positionZ: "+=0.01",
    },
    easing:"EaseInEaseOut",
    duration: 300
  },
  moveForward: {
    properties:{
      opacity:"+=1",
      positionY:"-=0.3",
      positionX: "-=0.3",
      scaleX: "-=0.025",
      scaleY: "-=0.025",
      positionZ: "+=0.5",
    },
    easing:"EaseInEaseOut",
    duration: 300
  },
  movePicture:[
    ["moveRight", "rotate", "moveLeft"]
  ],
  moveBaloon: [["hide","wait","moveForward"]],
  moveText: [["hide","wait", "positionText"]],
});
const Patricie = ({animate, animate2, theme, animate3, finishAll, next, message, textColor, font }) => {
  ViroMaterials.createMaterials({
      frontMaterial: {
        diffuseColor: theme.color1,
      },
      backMaterial: {
        diffuseColor: theme.color2,
      },
      sideMaterial: {
        diffuseColor: theme.color3,
      },
  });
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
    <ViroNode
        position={[0,0,-2]}
        animation={animate}
        visible={finishAll}
        onPress={() => next()}
        onClick={() => next()}
        rotation={[0, 0, 0]} >

        <ViroImage
          width={.4}
          height={.4}
          visible={finishAll}
          resizeMode="ScaleToFit"
          source={Bubble2}
          animation={animate2}
          scale={[1,1,1]}
          onPress={() => next()}
          onClick={() => next()}
          position={[0,0,0]}
        />
        <ViroImage
          width={1}
          height={1}
          visible={finishAll}
          animation={animate}
          resizeMode="ScaleToFit"
          source={Bubble}
          scale={[1,1,1]}
          onPress={() => next()}
          onClick={() => next()}
          position={[0,0,0]}
        />

    </ViroNode >
    <ViroNode
        position={[0,1.2,-1]}
        visible={finishAll}
        onPress={() => next()}
        onClick={() => next()}
        rotation={[0, 0, 0]} >
        <ViroText
          text={message}
          textAlign="center"
          textAlignVertical="bottom"
          textLineBreakMode="Justify"
          textClipMode="ClipToBounds"
          width={.35}
          height={2}
          fontSize={7}
          outerStroke={{type:"DropShadow", width:2, color:'#444444'}}
          shadowCastingBitMask={2}
          style={{
            fontFamily: font,
            fontWeight: '400',
            color: textColor
          }}
          extrusionDepth={3}
          materials={["frontMaterial", "backMaterial", "sideMaterial"]}
          animation={animate3}
          position={[0, 0, -.4]}
          scale={[1,1,1]}
          rotation={[0, 0, 0]}
          visible={finishAll}
          onPress={() => next()}
          onClick={() => next()}
          />
    </ViroNode>
      <ViroParticleEmitter
        position={[0, 4.5, 0]}
        duration={500}
        run={finishAll}
        visible={finishAll}
        delay={3000}
        loop={finishAll}
        fixedToEmitter={true}
        image={{
          source: Petal,
          height:0.05,
          width:0.05,
          bloomThreshold: 1.0
        }}
        spawnBehavior={{
          particleLifetime:[4000,4000],
          emissionRatePerSecond:[50, 80],
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


      </>
    );
}
export { Patricie }
