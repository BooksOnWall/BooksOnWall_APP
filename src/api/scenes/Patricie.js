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
import Bubble2 from '../../../assets/materials/baloonBlanc.png';
import Leaf from '../../../assets/materials/leaf.png';
import I18n from "../../utils/i18n";

ViroMaterials.createMaterials({
    frontMaterial: {
      diffuseColor: '#FFFFFF',
    },
    backMaterial: {
      diffuseColor: '#FF0000',
    },
    sideMaterial: {
      diffuseColor: '#0000FF',
    },
});

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
  wait: {
    properties:{
      opacity:"-=0"
    },
    easing:"EaseInEaseOut",
    duration: 2600
  },
  positionText: {
    properties:{
      positionY:"-=0.8",
      positionZ: "+=0.5",
    },
    easing:"EaseInEaseOut",
    duration: 300
  },
  moveForward: {
    properties:{
      rotateX:"+=180",
      positionZ: "+=0.5",
    },
    easing:"EaseInEaseOut",
    duration: 300
  },
  scale: {
    properties:{
      opacity:"+=1",
    },
    easing:"EaseInEaseOut",
    duration: 300
  },
  movePicture:[
    ["moveRight", "rotate", "moveLeft"]
  ],
  moveBaloon: [["wait","scale", "moveForward"]],
  moveText: [["wait", "positionText"]],
});
const Patricie = ({animate, animate2, animate3, finishAll, next, message, textColor, font }) => {
  // <ViroFlexView
  //   style={{padding: 0, backgroundColor: 'transparent'}}
  //   animation={animate2}
  //   width={.5}
  //   height={.5}
  //   position={[0,.5,-.2]}
  //   visible={finishAll}
  //   opacity={0}
  //   scale={[1,1,1]}
  //   onPress={() => next()}
  //   onClick={() => next()}
  //   rotation={[0, 0, 0]} >
    // <ViroImage
    //   width={.5}
    //   height={.5}
    //   visible={finishAll}
    //   resizeMode="ScaleToFit"
    //   source={Bubble2}
    //   scale={[1,1,1]}
    //   onPress={() => next()}
    //   onClick={() => next()}
    //   position={[0,0,0]}
    // />
    // <ViroText
    //   text={message}
    //   textAlign="center"
    //   textAlignVertical="top"
    //   textLineBreakMode="Justify"
    //   textClipMode="ClipToBounds"
    //   fontSize={12}
    //   style={{
    //     fontFamily: font,
    //     fontWeight: 'bold',
    //     color: textColor
    //   }}
    //   position={[0, 0, 0]}
    //   width={20}
    //   height={5}
    //   scale={[1,1,1]}
    //   visible={finishAll}
    //   onPress={() => next()}
    //   onClick={() => next()}
    //   />
  //     </ViroFlexView >
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
        opacity={1}
        onPress={() => next()}
        onClick={() => next()}
        rotation={[0, 0, 0]} >

        <ViroImage
          width={.3}
          height={.3}
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
        position={[0,0,-1]}
        visible={finishAll}
        opacity={1}
        onPress={() => next()}
        onClick={() => next()}
        rotation={[0, 0, 0]} >
        <ViroText
          text={message}
          textAlign="left"
          textAlignVertical="top"
          textLineBreakMode="justify"
          textClipMode="clipToBounds"
          width={1}
          height={2}
          fontSize={10}
          style={{
            fontFamily: font,
            fontWeight: '400',
            color: textColor
          }}
          extrusionDepth={8}
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
          bloomThreshold: .1
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


      </>
    );
}
export { Patricie }
