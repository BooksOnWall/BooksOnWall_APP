import React, {Component, useState, useCallback, useRef, useEffect } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Linking, Dimensions, PermissionsAndroid, Alert, Platform, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, ImageBackground, TouchableOpacity } from 'react-native';
import { SocialIcon, Rating, Header, Card, ListItem, Button, ThemeProvider, Icon, registerCustomIconType } from 'react-native-elements';
import NavigationView from "./stage/NavigationView";
import { NativeModules, TextInput } from "react-native";
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY, DEBUG_MODE  } from '@env';
import  distance from '@turf/distance';
import HTMLView from 'react-native-htmlview';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import KeepAwake from 'react-native-keep-awake';
import I18n from "../../utils/i18n";
import IconSet from "../../utils/Icon";
import { Banner } from '../../../assets/banner';
import Toast from 'react-native-simple-toast';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {lineString as makeLineString, bbox} from '@turf/turf';
import ReactNativeParallaxHeader from 'react-native-parallax-header';

import {unzip} from 'react-native-zip-archive';
const fs = RNFetchBlob.fs;
const Blob = RNFetchBlob.polyfill.Blob;
// import audio lib
import Sound from 'react-native-sound';
import {setStat} from "../stats/stats";
import {getScores} from '../stats/score';
import Leaf from '../../../assets/materials/leaf.png';

registerCustomIconType('booksonWall', IconSet);

const SCREEN_HEIGHT = Dimensions.get("window").height;
const IS_IPHONE_X = SCREEN_HEIGHT === 812 || SCREEN_HEIGHT === 896;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 44 : 24) : 0;
const HEADER_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 88 : 64) : 124;
const NAV_BAR_HEIGHT = HEADER_HEIGHT - STATUS_BAR_HEIGHT;

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}
const galleryPath = (storyDir, path) => {
  return 'file://' + storyDir + path.replace("assets/stories/", "");
}
//const Bubbles = ({theme, themeSheet, comment}) => return (comment);
const Reset = ({resetStory, theme, themeSheet}) => (
  <TouchableOpacity style={{flex:1, flexGrow: 1,}} onPress={() => resetStory()}>
    <Button buttonStyle={themeSheet.button} onPress={() => resetStory()} underlayColor='#FFFFFF' icon={{name:'reload', size:24, color:'#fff', type:'booksonWall'}} title={I18n.t("Start_again", "Start Again")}/>
  </TouchableOpacity>
);
const Sponsors = ({gallery, storyDir}) => {
  const image1 = (gallery[0]) ? galleryPath(storyDir,gallery[0].path) : null;
  const image2 = (gallery[1]) ? galleryPath(storyDir,gallery[1].path) : null;
  return (
    <View style={{backgroundColor: "#000"}}>
        {gallery[0] && <Image style={{width: '100%', height: 150}} source={{uri: image1}} />}
        {gallery[1] && <Image style={{width: '100%', height: 150}}  source={{uri: image2}} />}
    </View>
  );
};
const Social = ({ resetStory, theme, themeSheet }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current  // Initial
  const slideIn = useRef(new Animated.Value(0)).current  // Initial
  useEffect(() => {
    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 1000,
      }
    ).start();
    Animated.timing(
      slideIn,
      {
        toValue: 56,
        duration: 1000,
      }
    ).start();
  }, [fadeAnim, slideIn]);

  return (
    <Animated.View                 // Special animatable View
      style={[{
        opacity: fadeAnim,         // Bind opacity to animated value
        height: slideIn,
      }, styles.social , {backgroundColor: theme.color1, flex:1, flexGrow: 1, padding: 20} ]}
    >


      <SocialIcon
        onPress={() => { Linking.openURL('https://twitter.com/booksonwall') }}
        type='twitter'
        style={{flex:1, padding: 10}}
      />
      <SocialIcon
        onPress={() => { Linking.openURL('https://www.facebook.com/booksonwall/') }}
        type='facebook'
        style={{flex:1, padding: 10}}
      />
      <SocialIcon
        onPress={() => { Linking.openURL('https://www.instagram.com/booksonwall/') }}
        type='instagram'
        style={{flex:1, padding: 10}}
      />
      <SocialIcon
        onPress={() => { Linking.openURL('https://www.youtube.com/channel/UCNWiz7RDGgoM3HHgoYPAS3w/') }}
        type='youtube'
        style={{flex:1, padding: 10}}
      />
      <SocialIcon
        onPress={() => { Linking.openURL('https://t.me/booksonwall') }}
        type='telegram'
        style={{flex:1, padding: 10}}
      />
    </Animated.View>
  );
}
const blobImage = async (uri) => {
  try {
    const max = uri.split('/').length;
    const ext = uri.split('/')[max-1].split('.')[1];
    return await RNFetchBlob.fs.readFile(uri, 'base64')
    .then((data) => {
      //console.log(data);
      return `data:image/${ext};base64,${data}`;
    });
    } catch(e) {
      console.log(e.message);
    }
  }


const Bubbles = ({comment, theme, themeSheet}) => {
  return comment.map((line,i) => {
    return (line.type === 'image') ? <Image style={[styles.bubble,styles.image]} key={line.key} source={{uri: line.content }} /> : <Text style={{color: theme.color3}} key={line.key}>{line.content}</Text>
  });
}
const Comments = ({theme, themeSheet, commentLoading, handleCommentLine, addToComment, saveComment, saveLine, comment, commentLine }) => {
  const [selectedMediaUri, setSelectedMediaUri] = useState(null);
  const [openComment, setOpenComment] = useState(false);
  const toggleComment = () => {
    (!openComment) ? slideIn() : slideOut();
    (!openComment) ? fadeIn() : fadeOut();
    setOpenComment(!openComment);
  };
  const _onImageChange = useCallback(async ({nativeEvent}) => {
    try  {
      const {uri, linkUri, mime, data} = nativeEvent;
      const base64 = await blobImage(uri);
      await addToComment(base64, 'image');
      await setSelectedMediaUri(uri);
      if(base64) {
        await setSelectedMediaUri(null);
      }
    } catch(e) {
      console.log(e);
    }
  }, []);

  const _save = async () => {
    await saveComment();
    await setOpenComment(false);
    await slideOut();
  };
  // fadeAnim will be used as the value for opacity. Initial Value: 0
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    // Will change fadeAnim value to 1 in 5 seconds
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
    }).start();
  };

  const fadeOut = () => {
    // Will change fadeAnim value to 0 in 5 seconds
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1000,
    }).start();
  };
  const slideIn = () => {
    // Will change fadeAnim value to 1 in 5 seconds
    Animated.timing(slideAnim, {
      toValue: 250,
      duration: 1000,
    }).start();
  };

  const slideOut = () => {
    // Will change fadeAnim value to 0 in 5 seconds
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 1000,
    }).start();
  };

  return (
    <>
    <View style={styles.feed , {backgroundColor: theme.color3, flex:1, flexGrow: 1, padding: 40}} >
      <TouchableOpacity  onPress={()=> toggleComment()}>
        <Button buttonStyle={themeSheet.button} onPress={()=> toggleComment()} title={I18n.t("Leave_a_message", "Leave a message")} />
      </TouchableOpacity>
      {openComment && openComment === true ?
        (<TouchableOpacity  onPress={()=>  _save()}>
          <Button
            onPress={() => _save() }
            buttonStyle={themeSheet.button}
            title="Send"
            loading={commentLoading}
            color={theme.color3}
            accessibilityLabel="Send"
            />
        </TouchableOpacity>)
      : null}

    </View>

    {commentLoading ?  <View ><ActivityIndicator size="large" color="#" animating={true}/></View> : null }
    <Animated.View   // Special animatable View
      style={[{
        opacity: fadeAnim, // Bind opacity to animated value
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [150, 0]  // 0 : 150, 0.5 : 75, 1 : 0
          }),
        }],
        height: slideAnim,
      }, styles.feed , {backgroundColor: theme.color2, flex:1, flexGrow: 0, paddingHorizontal: 40, borderRadius: 8} ]}
      >
      <View style={styles.commentContainer}>
        {selectedMediaUri && (
          <Image source={{uri: selectedMediaUri}} style={styles.image} />
        )}
        <View style={styles.bubbles}>
          <Bubbles
            theme={theme}
            themeSheet={themeSheet}
            comment={comment}
            />
        </View>
        <TextInput
          multiline = {false}
          numberOfLines = {1}
          forceStrutHeight={true}
          onImageChange={_onImageChange}
          placeholder="Enter Your Comment"
          underlineColorAndroid='transparent'
          style={[styles.textInput, { color: theme.color3, backgroundColor: theme.color2, margin: 10}]}
          editable={true}
          onPress={() => {}}
          keyboardAppearance={"dark"}
          selectTextOnFocus={true}
          onImageInput={(image) => {console.log('image', image)}}
          onEndEditing={text => addToComment(commentLine, 'text')}
          onChangeText={(text) => handleCommentLine(text)}
          defaultValue={commentLine}
          />
      </View>
    </Animated.View>
    </>
  );

};

export default class StoryComplete extends Component {
  static navigationOptions = {
    title: 'Story Complete',
    headerShown: false
  };
  constructor(props) {
    super(props);

    this.loadStories = this.props.loadStories;
    let coordinates = (this.props.story) ? this.props.story.stages[0].geometry.coordinates :this.props.navigation.getParam('story').stages[0].geometry.coordinates;
    const stages = (this.props.story) ? this.props.story.stages : this.props.navigation.getParam('story').stages;
    const storyPoints = stages.map((stage, i) => {
      return stage.geometry.coordinates;
    });

    var line = makeLineString(storyPoints);
    var mbbox = bbox(line);
    console.log(this.props.screenProps.AppDir);
    const storyDir = (this.props.state) ? this.props.state.appDir+'/stories/' : this.props.screenProps.AppDir +'/stories/';
    const path = storyDir + '/stories/' + this.props.navigation.getParam('story').id + '/';
    this.state = {
      server: (this.props.state) ? this.props.state.server : this.props.screenProps.server,
      appName: (this.props.state) ? this.props.state.appName : this.props.screenProps.appName,
      appDir: (this.props.state) ? this.props.state.appDir : this.props.screenProps.AppDir,
      storyDir: storyDir,
      downloadProgress: 0,
      story: (this.props.story) ? this.props.story : this.props.navigation.getParam('story'),
      theme: (this.props.story && this.props.story.theme) ? this.props.story.theme: this.props.navigation.getParam('story').theme,
      granted: Platform.OS === 'ios',
      transportIndex: 0,
      dlIndex: null,
      dlLoading: false,
      path: path,
      audioButton: false,
      profile: 'mapbox/walking',
      themeSheet: null,
      position: null,
      debug_mode: (DEBUG_MODE && DEBUG_MODE === "true") ? true: false,
      mbbox: mbbox,
      styleURL: MapboxGL.StyleURL.Dark,
      fromLat: null,
      fromLong: null,
      vote: 5,
      openComment: false,
      comment: [],
      commentLine: "",
      commentLoading: false,
      toLat: coordinates[1],
      toLong: coordinates[0],
      distance: null,
    };
    this.updateTransportIndex = this.updateTransportIndex.bind(this);
    this.updateDlIndex = this.updateDlIndex.bind(this);
    this.getCurrentLocation = this.getCurrentLocation.bind(this);
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      await this.audioPlay();

      if (!this.state.granted) {
        await this.requestFineLocationPermission();
      }
      await this.getCurrentLocation();
      (this.props.stopRefresh) ? this.props.stopRefresh(): null ;
    } catch(e) {
      console.log(e);
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.props.story && prevProps.story !== this.state.story) {
      this.setState({story: this.props.story});
    }
  }
  componentWillUnmount = async () => {
    await KeepAwake.deactivate();
    await this.whoosh.release();
  }
  ratingCompleted = async (rating) => {
    await this.setState({vote: rating});
    await this.saveComment();
  }
  updateTransportIndex = (transportIndex) => this.setState({transportIndex})
  updateDlIndex = (dlIndex) => this.setState({dlIndex})
  watchID: ?number = null;
  storyCheck = async () => {
    let story = this.state.story;
    try {
        story.isInstalled = await this.isInstalled(story.id);
        this.setState({story: story});
    } catch(e) {
      console.log(e);
    }
  }
  isInstalled = async (sid) => {
    try {
      return await RNFS.exists(this.state.appDir + '/stories/' + sid)
        .then( (exists) => {
            return exists;
        });
    } catch(e) {
      console.log(e);
    }
  }
  handleCommentLine = (text) => {
    this.setState({commentLine: text});
  }
  addToComment = (content, type) => {
    const { comment } = this.state;
    const line = {
      type: type,
      content: content,
      key: (comment && comment.length > 0) ? comment.length : 0,
    };
    comment.push(line);
    this.setState({comment, commentLine: ''});
  }
  toggleComment = () => this.setState({openComment: !this.state.openComment})
  saveComment = async () => {
    const {story, appDir, debug_mode, server, position, comment, vote} = this.state;
    this.setState({commentLoading: true});
    try {
      const name = "New Comment";
      const sid = story.id;
      const path = appDir + '/stories/' + sid +'/';
      const ssid = null;
      const order = null;
      let extra = await getScores(path);
      extra.comment = comment;
      extra.vote = vote;
      await setStat(name, sid, ssid , debug_mode, server, appDir, position, extra);
      await this.setState({comment: [], commentLine: '', commentLoading: false});
    } catch(e) {
      console.log(e);
    }

  }
  getCurrentLocation = async () => {
    const {story, debug_mode, server, appDir, position} = this.state;
    const sid = story.id;
    try {
      // Instead of navigator.geolocation, just use Geolocation.
      await Geolocation.getCurrentPosition(
        position => {
          if(!debug_mode) ("Story complete", sid, null, debug_mode, server, appDir, position);
          this.setState({
            position: position,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: 10000, maximumAge: 1000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => {

        this.setState({position: position,fromLat: position.coords.latitude, fromLong: position.coords.longitude});
        let from = {
          "type": "Feature",
          "properties": {},
            "geometry": {
              "type": "Point",
              "coordinates": [this.state.fromLong,this.state.fromLat ]
            }
          };
          let to = {
            "type": "Feature",
            "properties": {},
              "geometry": {
                "type": "Point",
                "coordinates": [this.state.toLong,this.state.toLat ]
              }
            };
          let units = I18n.t("kilometers","kilometers");
          let dis = distance(from, to, "kilometers");
          if (dis) {
            this.setState({distance: dis.toFixed(3)});
          };
      },
      error => error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: 5000, maximumAge: 1000, enableHighAccuracy: true, distanceFilter: 1},
      );
    } catch(e) {
      console.log(e);
    }
  }
  requestFineLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "ACCESS_FINE_LOCATION",
          message: I18n.t("ACCESS_FINE_LOCATION","Mapbox navigation needs ACCESS_FINE_LOCATION")
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        this.setState({ granted: true });
      } else {
        console.log("ACCESS_FINE_LOCATION permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }

  launchNavigation = () => {
    const {story,fromLat, fromLong, toLat, toLong} = this.state;
    NativeModules.MapboxNavigation.navigate(
      fromLat,
      fromLong,
      toLat,
      toLong,
      // profile,
      // access_token
    );
  }

  whoosh = null
  audioPlay = async () => {
    try {
      const {story, index, storyDir} = this.state;
      // if we arrive in first stage , no audio can be played as there is no previous onZoneLeave
      const maxIndex = (story.stages.length - 1);
      const stage = story.stages[maxIndex];
      if (stage) {
        const audios = (stage.onZoneLeave && stage.onZoneLeave.length > 0) ? stage.onZoneLeave.filter(item => (item.type === 'audio')) : [];
        const count =  audios.length;
        this.setState({audioButton: true});
        console.log(count);
        console.log(audios);
        if (count > 1) {
          const audio = audios[0];
          const audio2 = audios[1];
          const loop = audio.loop;
          let path = audio.path.replace(" ", "\ ");
          let path2 = audio2.path.replace(" ", "\ ");
          path = storyDir + path.replace("assets/stories/", "");
          path2 = storyDir + path2.replace("assets/stories/", "");
          Sound.setCategory('Playback');
          console.log(path);
          // Load the sound file path from the app story bundle
          // See notes below about preloading sounds within initialization code below.
          this.whoosh = new Sound(path, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
              console.log('failed to load the sound', error);
              return;
            }
            // loaded successfully
            console.log('duration in seconds: ' + this.whoosh.getDuration() + 'number of channels: ' + this.whoosh.getNumberOfChannels());
            // Loop indefinitely until stop() is called

            // Play the sound with an onEnd callback
            this.whoosh.play((success) => {
              if (success) {
                console.log('successfully finished playing');
                var nextaudio = new Sound(path2, Sound.MAIN_BUNDLE, (error) => {
                  if (error) {
                    console.log('failed to load the sound', error);
                    return;
                  }
                  // loaded successfully
                  console.log('duration in seconds: ' + nextaudio.getDuration() + 'number of channels: ' + nextaudio.getNumberOfChannels());

                  // Play the sound with an onEnd callback
                  nextaudio.play((success) => {
                    if (success) {
                      console.log('successfully finished playing');
                      this.setState({audioButton: false});
                      nextaudio.release();
                    } else {
                      console.log('playback failed due to audio decoding errors');
                    }
                  });
                });
              } else {
                console.log('playback failed due to audio decoding errors');
              }
            });
            this.whoosh.release();
          });
        }
        if (count === 1) {
          const audio = audios[0];
          const loop = audio.loop;
          let path = audio.path.replace(" ", "\ ");
          path = storyDir + path.replace("assets/stories/", "");
          Sound.setCategory('Playback');
          // Load the sound file path from the app story bundle
          // See notes below about preloading sounds within initialization code below.
          this.whoosh = new Sound(path, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
              console.log('failed to load the sound', error);
              return;
            }
            // loaded successfully
            console.log('duration in seconds: ' + this.whoosh.getDuration() + 'number of channels: ' + this.whoosh.getNumberOfChannels());

            // Play the sound with an onEnd callback
            this.whoosh.play((success) => {
              if (success) {
                this.setState({audioButton: false});
                console.log('successfully finished playing');
              } else {
                console.log('playback failed due to audio decoding errors');
              }
            });
            if(loop) {
              this.whoosh.setNumberOfLoops(-1);
            }
          });
          this.whoosh.release();
        }
      }
    } catch(e) {
      console.log(e);
    }

  }
  renderContent = () => {
    const {theme, story, distance, storyDir, vote, comment, openComment, commentLine, commentLoading, transportIndex, dlIndex,  access_token, profile, granted, fromLat, fromLong, toLat, toLong } = this.state;
    const transportbuttons = [ I18n.t('Auto'),  I18n.t('Pedestrian'),  I18n.t('Bicycle')];
    const gallery = theme.gallery;
    const themeSheet = StyleSheet.create({
      title: {
        fontFamily: story.theme.font1,
        color: '#fff',
        fontSize: 20,
        paddingTop: 40,
        paddingHorizontal: 40,
      },
      card:{
        backgroundColor: story.theme.color3,
      },
      credits: {
        backgroundColor: story.theme.color2,
        fontFamily: 'Roboto-Regular',
        color: story.theme.color3,
        padding: 45,
      },
      sinopsys: {
        backgroundColor: '#D8D8D8',
        padding: 40,
        paddingTop: 60,
        paddingLeft: 45,
        paddingBottom: 55,
      },
      subtitle: {
        fontWeight: 'bold',
        padding: 0,
        marginTop: 0,
        marginBottom: 50,
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: 'Roboto-bold',
        color: story.theme.color3,
      },
      NavButton: {
        backgroundColor: story.theme.color2,
        borderWidth: 0,
        margin: 0,
      },
      BtnNavContainer: {
        flex: 1,
        borderWidth: 0,
        borderRadius: 0,
        marginTop: 0,
        padding: 20,
        backgroundColor: story.theme.color1,
        height: 50
      },
      distance: {
        color: story.theme.color2,
        fontSize: 14,
        textAlign: 'center',
        paddingTop: 8,
        fontFamily: 'RobotoCondensed-Regular'
      },
      message: {
        fontSize: 12,
        color: '#000',
        textAlign: 'center',
        paddingTop: 5,
        fontFamily: 'Roboto-Regular'
      },
      transport: {
        flex: 1,
        fontSize: 14,
        backgroundColor: '#4B4F53',
        borderWidth: 0,
        borderColor: '#d2d2d2',
        minHeight: 40,
        maxHeight: 40,
        margin: 0,
        padding: 0
      },
      p: { fontFamily: 'Roboto-Light',
      },
      b: { fontFamily: 'Roboto-bold'
      },
      nav: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap-reverse', flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6 },
      button: { marginHorizontal: 3, backgroundColor: story.theme.color2}
      });
    const creditsThemeSheet = StyleSheet.create({
      p: {
          fontSize: 16,
          lineHeight: 19,
          letterSpacing: 0,
          fontFamily: 'Roboto-Regular',
          color: story.theme.color3,
          marginTop: 0,
          marginBottom: 0,
          marginHorizontal: 0,
        },
        br: {
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          lineHeight: 0,
        },
        b: {
          fontFamily: 'Roboto-bold',
        },
        container: {
          marginTop: 5,
          marginBottom: 5,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
        },
        span: {
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
        },
        strong: {
          fontFamily: 'Roboto-bold',
        },
        h1: {
          fontFamily: 'Roboto-Light',
          fontSize: 23,
          fontWeight: '200',
          color: story.theme.color1,
          marginTop: 30,
          marginBottom: 1,
          lineHeight: 25,
        },
        h2: {
          fontSize: 17,
          lineHeight: 22,
          color: story.theme.color3,
          marginTop: 10,
          marginBottom: 50,
        },
        h3: {
          fontSize: 13,
          marginTop: 20,
          marginBottom: 1 ,
          fontFamily: 'RobotoCondensed-Bold',
          textTransform: 'uppercase',
          fontWeight: 'bold',
          color: story.theme.color1,
        },
        h4: {
          fontSize: 13,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          color: story.theme.color1,
          marginTop: 5,
          marginBottom: 1,
        },
      });
      const ButtonGroup = () => {
        return (
          <View style={themeSheet.nav}>
          <TouchableOpacity style={{flex:1, flexGrow: 1,}} onPress={() => this.deleteStory(story.id)} >
            <Button buttonStyle={themeSheet.button} onPress={() => this.deleteStory(story.id)} icon={{name: 'trash', type:'booksonWall', size: 24, color: 'white'}}/>
          </TouchableOpacity>
          {distance && (
          <TouchableOpacity style={{flex:1, flexGrow: 1,}} onPress={() => this.launchNavigation()}>
            <Button buttonStyle={themeSheet.button} icon={{name: 'navi',  type:'booksonWall', size: 24, color: 'white'}} onPress={() => this.launchNavigation()} />
          </TouchableOpacity>
          )}
          <TouchableOpacity style={{flex:1, flexGrow: 1,}} onPress={() => this.storyMap()} >
            <Button buttonStyle={themeSheet.button}  icon={{name: 'play', type:'booksonWall', size: 24, color: 'white'}} onPress={() => this.storyMap()}  />
          </TouchableOpacity>
          </View>
        );
      };
    return (
      <>
      <Reset resetStory={this.resetStory} theme={theme} themeSheet={themeSheet} />

      <View style={themeSheet.card } >
        {commentLoading ?  <View ><ActivityIndicator size="large" color={theme.color2} animating={true}/></View> : null }
              <View className={themeSheet.rate} style={ commentLoading ? {position: 'absolute', top: -200} : {}} >
                <Text h1 style={themeSheet.title}>{I18n.t("Rate_this", "Rate this Experience")}</Text>
                <Rating
                  showRating
                  fractions={1}
                  startingValue={vote}
                  type='custom'
                  ratingColor={theme.color2}
                  ratingTextColor={theme.color1}
                  reviews={["Terrible", "Bad", "Meh", "OK", "Good", "Hmm...", "Very Good", "Wow", "Amazing", "Unbelievable", "Jesus"]}
                  ratingImage={Leaf}
                  ratingBackgroundColor='transparent'
                  ratingCount={7}
                  imageSize={45}
                  onFinishRating={this.ratingCompleted}
                  style={{ backgroundColor: 'transparent', paddingVertical: 30 }}
                />

              </View>
              <Comments addToComment={this.addToComment} commentLoading={commentLoading} saveLine={this.saveLine} theme={theme} themeSheet={themeSheet} saveComment={this.saveComment} handleCommentLine={this.handleCommentLine} comment={comment} commentLine={commentLine} />
              <Social theme={theme} themeSheet={themeSheet} resetStory={this.resetStory}/>
              <View style={themeSheet.credits} >

              <Text h2 style={themeSheet.subtitle}>{I18n.t("Credits", "Credits")}</Text>
              <HTMLView  value={"<span>"+ story.credits +"</span>"} stylesheet={creditsThemeSheet} />

            </View>
            <Sponsors gallery={gallery} storyDir={storyDir}/>
      </View>
      </>
    )
  }
  renderNavBar = () => (
  <View style={styles.navContainer}>
    <View style={styles.statusBar} />
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.iconLeft} onPress={() => this.props.navigation.navigate('Story', {screenProps: this.props.screenProps, story: this.state.story, index: 0})}>
        <Button onPress={() => this.props.navigation.navigate('Story', {screenProps: this.props.screenProps, story: this.state.story, index: 0})} type='clear' underlayColor='#FFFFFF' iconContainerStyle={{ marginLeft: 2}} icon={{name:'leftArrow', size:24, color:'#fff', type:'booksonWall'}} />
      </TouchableOpacity>
    </View>
  </View>
  )
  storyMap = () => this.props.navigation.navigate('StoryMap', {screenProps: this.props.screenProps, story: this.state.story, index: 0})
  launchAR = () => this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: 0})
  resetStory = () => {
    return true;
  }
  resetStory = async () => {
    let { story, appDir } = this.state;
    try {
      let sid = story.id;
      story.isComplete = false;
      let complete = appDir + '/stories/' + sid + '/nav.json';
      await RNFetchBlob.fs.unlink(complete).then(success => {
        Toast.showWithGravity(I18n.t("Story_reset_complete","Story reseted !"), Toast.short, Toast.TOP);
        return this.props.navigation.navigate('Story', {screenProps: this.props.screenProps, story: story, index: 0});
      });
    } catch(e) {
      console.log(e.message);
    }
  }
  render() {
      const {theme, themeSheet, story, comment} = this.state;

      const Title = ({story}) => (
        <View style={styles.titleStyle}>
          <Text h1 style={{fontSize: 45, color: "#fff", textShadowRadius: 2 , textShadowOffset: {width: 1, height: 1}, textShadowColor: 'rgba(0, 0, 0, 0.85)', letterSpacing: 1, fontFamily: story.theme.font1}}>{I18n.t("The_end", "The End")}</Text>
          <Text style={{
            fontSize: 20,
            letterSpacing: 1,
            color: "#fff",
            textShadowColor: 'rgba(0, 0, 0, 0.85)',
            textShadowOffset: {width: 1, height: 1},
            textShadowRadius: 2,
            fontFamily: story.theme.font1}} >{story.title}</Text>
          <Text style={styles.location}>{this.state.story.city + ' • ' + this.state.story.state}</Text>
        </View>
      );

      return (
      <ThemeProvider>
        <SafeAreaView style={styles.container} forceInset={{ top: 'always', bottom: 'always' }}>
        <ReactNativeParallaxHeader
          headerMinHeight={HEADER_HEIGHT}
          headerMaxHeight={250}
          extraScrollHeight={20}
          navbarColor={story.theme.color1}
          title={<Title story={story}/>}
          titleStyle={styles.titleStyle}
          backgroundImage={{uri: theme.banner.filePath}}
          backgroundImageScale={1.2}
          renderNavBar={this.renderNavBar}
          renderContent={this.renderContent}
          containerStyle={styles.container}
          contentContainerStyle={styles.contentContainer}
          innerContainerStyle={styles.container}
      />
        </SafeAreaView>
      </ThemeProvider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D8D8D8',
    padding: 0,
    margin: 0,
  },
  scriptBox: {
    //willChange: 'width, height, left, top',
    position: 'relative',
  },
  mediaContainer: {
    flex: 1,
  },
  image: {
    width: '50%',
    aspectRatio: 1,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  contentContainer: {
    flexGrow: 1,
  },
  navContainer: {
    height: HEADER_HEIGHT,
    marginHorizontal: 20,
  },
  statusBar: {
    height: STATUS_BAR_HEIGHT,
    backgroundColor: 'transparent',
  },
  navBar: {
    height: NAV_BAR_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  commentContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  textInput: {
    padding: 25,
  },
  social: {
    flex: 1,
    flexDirection:'row',
    alignItems:'center',
    alignContent: 'center',
    justifyContent:'center',
    padding: 24,
    paddingHorizontal: 20,
  },
  feed:{
    backgroundColor: '#C8C1B8',
    padding: 40,
  },
  containerStyle: {
    backgroundColor: '#C8C1B8',
    justifyContent: 'space-around',
    borderWidth: 0,
    paddingTop: 25,
    paddingBottom: 25,
    borderWidth: 0
  },
  titleStyle: {
    flex: 1,
    flexDirection:'column',
    alignItems:'center',
    alignContent: 'center',
    justifyContent:'center'
  },
  bubble: {
    backgroundColor: '#000',
    padding: 10,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: 30,
  },
  bubbles :{
    flex: 1,
    margin: 10,
    flexDirection:'column',
    alignItems:'center',
    alignContent: 'center',
    justifyContent:'center',
    padding: 10,
  },
  rate : {
    flex: 1,
    flexDirection:'column',
    alignItems:'center',
    alignContent: 'center',
    justifyContent:'center',
    padding: 10,
  },
  card: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  activityContainer: {
    color: '#FFF'
  },
  location: {
    fontFamily: 'ATypewriterForMe',
    fontSize: 9,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1,
  },
  reset: {
    flex: 1,
    width: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  iconLeft: {
    width: 45,
    height: 45,
    backgroundColor: 'rgba(0, 0, 0, .12)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0
  }
});
