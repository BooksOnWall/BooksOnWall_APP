import React, {Component, useState, useCallback} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Dimensions, PermissionsAndroid, Alert, Platform, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, ImageBackground, TouchableOpacity } from 'react-native';
import { Header, Card, ListItem, Button, ThemeProvider, Icon, registerCustomIconType } from 'react-native-elements';
import NavigationView from "./stage/NavigationView";
import { NativeModules, TextInput } from "react-native";
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY  } from '@env';
import  distance from '@turf/distance';
import HTMLView from 'react-native-htmlview';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import { Rating, AirbnbRating } from 'react-native-ratings';
import KeepAwake from 'react-native-keep-awake';
import I18n from "../../utils/i18n";
import IconSet from "../../utils/Icon";
import { Banner } from '../../../assets/banner';
import Toast from 'react-native-simple-toast';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {lineString as makeLineString, bbox} from '@turf/turf';
import ReactNativeParallaxHeader from 'react-native-parallax-header';
import {unzip} from 'react-native-zip-archive';
// import audio lib
import Sound from 'react-native-sound';
import {setStat} from "../stats/stats";
import {getScores} from '../stats/score';

registerCustomIconType('booksonwall', IconSet);

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
const galleryPath = (storyDir, pathName) => {
  return 'file://' + storyDir + path.replace("assets/stories", "");
}
const ratingCompleted = (rating) => {
  console.log("Rating is: " + rating)
}
const Comments = ({theme, themeSheet,saveComment, comment }) => {
  // const [selectedMediaUri, setSelectedMediaUri] = useState(null);
  // const _onImageChange = useCallback(({nativeEvent}) => {
  //   const {uri} = nativeEvent;
  //   setSelectedMediaUri(uri);
  // }, []);
  return (
    <>
      <Text h2 style={themeSheet.title}>{I18n.t("Comment", "Comment")}</Text>
      <TouchableOpacity style={{flex:1, flexGrow: 1,}} >
        <Button onPress={() => {}} buttonStyle={themeSheet.button} title={I18n.t("Comment", "Leave a message")} />
      </TouchableOpacity>
      <TextInput
        multiline = {true}
        numberOfLines = {5}
        forceStrutHeight={true}
        onImageChange={_onImageChange}
        placeholder="Enter Your Comment"
        underlineColorAndroid='transparent'
        style={{ backgroundColor: '#C0C0C0'}}
        editable={true}
        onPress={() => {}}
        onChangeText={(text) => saveComment({text})}
        value={comment}
        />
      <Button
        onPress={() => {}}
        title="Send"
        color="#841584"
        accessibilityLabel="Send"
        />

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
      mbbox: mbbox,
      styleURL: MapboxGL.StyleURL.Dark,
      fromLat: null,
      fromLong: null,
      vote: null,
      comment: null,
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
  saveComment = ({text}) => this.setState({comment: text})
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
            this.setState({distance: dis.toFixed(2)});
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
  deleteStory = async (sid) => {
    try {
      await Alert.alert(
        I18n.t("Delete_story","Delete Story"),
        I18n.t("Are_u_Sure","Are you sure you want to do this ?"),
        [
          {text: I18n.t("Later","Ask me later"), onPress: () => console.log('Ask me later pressed')},
          {
            text: I18n.t("Cancel", "Cancel"),
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          {text: I18n.t("Yes_destroy","Yes destroy it!"), onPress: () => this.destroyStory()},
        ],
        {cancelable: true},
      );
    } catch(e) {
      console.log(e);
    }
  }
  destroyStory = async () => {
    try {
      let sid = this.state.story.id;
      let storyPath = this.state.appDir+'/stories/'+sid;
      await RNFetchBlob.fs.unlink(storyPath).then(success => {
        Toast.showWithGravity(I18n.t("Story_deleted","Story deleted !"), Toast.LONG, Toast.TOP);
        return this.storyCheck();
      });
    } catch(e) {
      console.log(e.message);
    }

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
    const {theme, story, distance, vote, comment, transportIndex, dlIndex,  access_token, profile, granted, fromLat, fromLong, toLat, toLong } = this.state;
    const transportbuttons = [ I18n.t('Auto'),  I18n.t('Pedestrian'),  I18n.t('Bicycle')];
    const themeSheet = StyleSheet.create({
      title: {
        fontFamily: story.theme.font1,
        color: '#fff',
      },
      card:{
        backgroundColor: story.theme.color1,
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
            <Button buttonStyle={themeSheet.button} onPress={() => this.deleteStory(story.id)} icon={{name: 'trash', type:'booksonwall', size: 24, color: 'white'}}/>
          </TouchableOpacity>
          {distance && (
          <TouchableOpacity style={{flex:1, flexGrow: 1,}} onPress={() => this.launchNavigation()}>
            <Button buttonStyle={themeSheet.button} icon={{name: 'route',  type:'booksonwall', size: 24, color: 'white'}} onPress={() => this.launchNavigation()} />
          </TouchableOpacity>
          )}
          <TouchableOpacity style={{flex:1, flexGrow: 1,}} onPress={() => this.storyMap()} >
            <Button buttonStyle={themeSheet.button}  icon={{name: 'play', type:'booksonwall', size: 24, color: 'white'}} onPress={() => this.storyMap()}  />
          </TouchableOpacity>
          </View>
        );
      };
    return (
      <>
      <View style={themeSheet.card} >
              <View style={themeSheet.rate} >
              <Text h2 style={themeSheet.title}>{I18n.t("Rate_this", "Rate this Experience")}</Text>
              <Rating
                type='heart'
                ratingColor='#3498db'
                ratingBackgroundColor='transparent'
                ratingCount={10}
                imageSize={40}
                onFinishRating={this.ratingCompleted}
                style={{ paddingVertical: 30 }}
              />
            <Comments theme={theme} themeSheet={themeSheet} saveComment={this.saveComment} comment={comment}/>

              </View>
              <View style={themeSheet.credits} >
              <Text h2 style={themeSheet.subtitle}>{I18n.t("Credits", "Credits")}</Text>
              <HTMLView  value={"<span>"+ story.credits +"</span>"} stylesheet={creditsThemeSheet} />
            </View>
      </View>
      </>
    )
  }
  renderNavBar = () => (
  <View style={styles.navContainer}>
    <View style={styles.statusBar} />
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.iconLeft} onPress={() => this.props.navigation.navigate('Story', {screenProps: this.props.screenProps, story: this.state.story, index: 0})}>
        <Button onPress={() => this.props.navigation.navigate('Story', {screenProps: this.props.screenProps, story: this.state.story, index: 0})} type='clear' underlayColor='#FFFFFF' iconContainerStyle={{ marginLeft: 2}} icon={{name:'left-arrow', size:24, color:'#fff', type:'booksonwall'}} />
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
      let complete = appDir + '/stories/' + sid + '/complete.txt';
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
      const Reset = () => (
        <TouchableOpacity style={styles.iconLeft} onPress={() => this.resetStory()}>
          <Button onPress={() => this.resetStory()} type='solid' underlayColor='#FFFFFF' iconContainerStyle={{ marginLeft: 2}} icon={{name:'reload', size:24, color:'#fff', type:'booksonwall'}} title={I18n.t("Start_again", "Start Again")} />
        </TouchableOpacity>
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

        <Reset  />
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
  mediaContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
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
  card: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  location: {
    fontFamily: 'ATypewriterForMe',
    fontSize: 9,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1,
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
