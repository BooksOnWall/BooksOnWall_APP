import React, {Component} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Dimensions, PermissionsAndroid, Alert, Platform, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, ImageBackground, TouchableOpacity } from 'react-native';
import { Header, Card, ListItem, Button, ThemeProvider, Icon, registerCustomIconType } from 'react-native-elements';
import NavigationView from "./stage/NavigationView";
import { NativeModules } from "react-native";
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY , DEBUG_MODE } from '@env';
import { withNavigationFocus } from 'react-navigation';
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
import NetInfo from "@react-native-community/netinfo";
import {getStat, setStat} from "../stats/stats";
import {getScore} from '../stats/score';

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
class Story extends Component {
  static navigationOptions = {
    title: 'Story',
    headerShown: false
  };
  constructor(props) {
    super(props);
    this.loadStories = this.props.loadStories;
    let coordinates = (this.props.story) ? this.props.story.stages[0].geometry.coordinates : this.props.navigation.getParam('story').stages[0].geometry.coordinates;
    const stages = (this.props.story) ? this.props.story.stages : this.props.navigation.getParam('story').stages;
    const storyPoints = stages.map((stage, i) => {
      return stage.geometry.coordinates;
    });
    var line = makeLineString(storyPoints);
    var mbbox = bbox(line);
    this.state = {
      server: (this.props.state) ? this.props.state.server : this.props.screenProps.server,
      appName: (this.props.state) ? this.props.state.appName : this.props.screenProps.appName,
      appDir: (this.props.state) ? this.props.state.appDir : this.props.screenProps.AppDir,
      debug_mode: (DEBUG_MODE === 'true') ? true : false,
      downloadProgress: 0,
      story: (this.props.story) ? this.props.story : this.props.navigation.getParam('story'),
      theme: (this.props.story && this.props.story.theme) ? this.props.story.theme: this.props.navigation.getParam('story').theme,
      granted: Platform.OS === 'ios',
      transportIndex: 0,
      selected: 0,
      completed: 0,
      dlIndex: null,
      timeout: 10000,
      dlLoading: false,
      profile: 'mapbox/walking',
      themeSheet: null,
      position: null,
      mbbox: mbbox,
      score: null,
      styleURL: MapboxGL.StyleURL.Dark,
      fromLat: null,
      fromLong: null,
      toLat: coordinates[1],
      toLong: coordinates[0],
      distance: null,
    };
    this.updateTransportIndex = this.updateTransportIndex.bind(this);
    this.updateDlIndex = this.updateDlIndex.bind(this);
    this.getCurrentLocation = this.getCurrentLocation.bind(this);
  }
  getNav = async () => {
    const {story, appDir} = this.state;

      try {
        const sid = story.id;
        const ssid = 0;
        const order =1;
        const path = appDir + '/stories/'+sid+'/';
        const score = await getScore({sid, ssid, order, path});

        story.isComplete = (score.completed === story.stages.length) ? true : false;

        this.setState({
          story,
          score,
          timeout: 5000,
          selected: score.selected,
          completed: score.completed,
          index: score.index
        });
        return score;
      } catch(e) {
        console.log(e.message);
      }
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      await this.networkCheck();
      await this.storyCheck();

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

  cancelTimeout = () => this.setState({timeout: 0})
  componentWillUnmount = async () => {
    await KeepAwake.deactivate();
    await this.cancelTimeout();
    await Geolocation.clearWatch(this.watchID);
    this.watchID = null;
  }
  networkCheck = () => {
    NetInfo.fetch().then(state => {
      // console.warn("Connection type", state.type);
      // console.warn("Is connected?", state.isConnected);
      !state.isConnected ? Toast.showWithGravity(I18n.t("ERROR_NO_INTERNET","Error: No internet connection!"), Toast.LONG, Toast.TOP) : '';
    });
  }
  updateTransportIndex = (transportIndex) => this.setState({transportIndex})
  updateDlIndex = (dlIndex) => this.setState({dlIndex})
  watchID: ?number = null
  downloadStory = (sid) => {
    const {debug_mode, server, appDir, position} = this.state;
    // add loading in download story button
    this.setState({dlLoading: true});
    // Toast message starting download
    Toast.showWithGravity(I18n.t("Start_downloading","Start Downloading."), Toast.SHORT, Toast.TOP);
    const data = getStat("Install story", sid, null, debug_mode, server, appDir, position);
    const body = JSON.stringify({sid: sid, name: 'Download story', ssid: null, values: null, data: data });
    // check first that there is no old zip in download directory
    const DownloadDir = RNFetchBlob.fs.dirs.DownloadDir;
    const FileName =  'Story_'+ sid + '.zip';
    const archive = DownloadDir+'/'+FileName;
    RNFetchBlob.fs.exists(archive)
    .then((exist) => {
      if (exist) {
        RNFetchBlob.fs.unlink(archive)
        .then(() => {
            console.log(archive+' deleted !');
          })
          .catch((err) => { console.log(err); })
      }
    });
    const downloadUrl = (debug_mode && debug_mode === false) ? server + '/zip/' + sid : server + '/download/'+sid;
    RNFetchBlob
    .config({
        addAndroidDownloads : {
            title : FileName,
            useDownloadManager : true, // <-- this is the only thing required
            // Optional, override notification setting (default to true)
            notification : true,
            // Optional, but recommended since android DownloadManager will fail when
            // the url does not contains a file extension, by default the mime type will be text/plain
            mime : 'application/zip',
            description : I18n.t("Story_downloaded","Story downloaded by BooksOnWall."),
            mediaScannable: true,
            path : appDir + '/stories/'+FileName
        }
    })
    .fetch('POST', downloadUrl)
    // .progress({ interval: 250 },(received,total)=>{
    //   console.log('progress:',received/total);
    //   this.setState({downloadProgress:(received/total)*100});
    // })
    .then((resp) => {
      // the path of downloaded file
      //const p = resp.path(); android manager can't get the downloaded path
      if(!debug_mode) setStat("Install story", sid, null, debug_mode, server, appDir, position);
      this.setState({downloadProgress:0});
      let path_name = appDir+'/'+'stories/Story_'+ sid + '.zip'
      //TOAST message download complete
      Toast.showWithGravity(I18n.t("Download_complete","Download complete."), Toast.SHORT, Toast.TOP);
      this.setState({dlLoading: false});
      return this.installStory(sid, path_name);
    });
  }
  installStory = (sid, path) => {
    // Toast message installing story
    Toast.showWithGravity(I18n.t("Installing_story","Installing story."), Toast.SHORT, Toast.TOP);
    // get downloaded path (in download directory) and target path (in appDir/stories)
    const targetPath = this.state.appDir+'/stories/';
    const sourcePath = path;
    const charset = 'UTF-8';
    const storyExists = targetPath+sid;

    // if story exist and that we are in update mode
    // Delete story first
    RNFetchBlob.fs.exists(storyExists)
    .then((exist) => {
        console.log(`file ${exist ? '' : 'not'} exists`);
        if (exist) {
          RNFetchBlob.fs.unlink(storyExists)
          .then(() => {
              console.log(storyExists+' deleted !');
            })
            .catch((err) => { console.log(err); })
        }
    })
    .catch((err) => { console.log(err); });
    //unzip story
    unzip(sourcePath, targetPath, charset)
    .then((path) => {
      console.log(`unzip completed at ${path}`);
      // remove zip file in download folder
      const DownloadDir = RNFetchBlob.fs.dirs.DownloadDir;
      console.log(RNFetchBlob.fs.dirs);
      const FileName =  'Story_'+ sid + '.zip';
      const archive = DownloadDir+'/'+FileName;
      RNFetchBlob.fs.exists(archive)
      .then((exist) => {
        if (exist) {
          RNFetchBlob.fs.unlink(archive)
          .then(() => {
              console.log(archive+' deleted !');
            })
            .catch((err) => { console.log(err); })
        }
      });
      //remove zip file in BooksOnWall
      RNFetchBlob.fs.unlink(sourcePath)
      .then(() => {
          // TOAST message installation complete :
          Toast.showWithGravity(I18n.t("Installation_complete","Installation complete."), Toast.SHORT, Toast.TOP);
          // recheck if story is well installed and display buttons
          this.offlineSave();
          return this.storyCheck();
        })
        .catch((err) => { console.log(err); })
    })
    .catch((error) => {
      console.log(error)
    });
  }
  offlineSave = async () => {
    try {
      Toast.showWithGravity(I18n.t("Start_download_map","Start map download"), Toast.SHORT, Toast.TOP);

      const progressListener = (offlineRegion, status) => console.log(offlineRegion, status);
      const errorListener = (offlineRegion, err) => console.log(offlineRegion, err);
      const box= this.state.mbbox;
      const name = 'story'+this.state.story.id;
      // check if offline db still exist
      const offlinePack = await MapboxGL.offlineManager.getPack(name);
      if(offlinePack) await MapboxGL.offlineManager.deletePack(name);
      await MapboxGL.offlineManager.createPack({
        name: name,
        styleURL: this.state.styleURL,
        minZoom: 14,
        maxZoom: 20,
        bounds: [[box[0], box[1]], [box[2], box[3]]]
      }, progressListener, errorListener);
      Toast.showWithGravity(I18n.t("End_download_map","End map download"), Toast.SHORT, Toast.TOP);
      return progressListener;
    } catch(e) {
      console.log(e);
    }
  }
  isComplete = (id) => {

  }
  storyCheck = async () => {
    let { story } = this.state;
    const sid = story.id;
    try {
        story.isInstalled = await this.isInstalled(sid);
        this.setState({story: story});
        if(story.isInstalled) await this.getNav();
        //if(story.isInstalled) await this.getSelected();
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
  getDistance = async (position, index, story, debug_mode, radius, timeout) => {
    let toPath = Array.from(story.stages[index].geometry.coordinates);
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
            "coordinates": toPath
          }
        };
      console.log('position from', from);
      let units = I18n.t("kilometers","kilometers");
      let dis = distance(from, to, "kilometers");
      if (dis) {
        this.setState({distance: dis.toFixed(3)});
      };
  }
  getCurrentLocation = async () => {
    let {timeout, selected, debug_mode, radius, completed , story, index} = this.state;
    try {
      // Instead of navigator.geolocation, just use Geolocation.
      await Geolocation.getCurrentPosition(
        position => {
          this.setState({
            position: position,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
            this.getDistance(position, index, story, debug_mode, radius, timeout);
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: timeout, maximumAge: 1000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => {
        if (index && index !== story.stages.length ) {
            this.getDistance(position, index, story, debug_mode, radius, timeout);
        }
      },
      error => error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: timeout, maximumAge: 3000, enableHighAccuracy: true, distanceFilter: 1},
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
    const {story,fromLat, fromLong, toLat, toLong, debug_mode} = this.state;
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
    const {debug_mode, story, server, appDir, position} = this.state;
    try {
      let sid = story.id;
      let storyPath = appDir+'/stories/'+sid;
      await RNFetchBlob.fs.unlink(storyPath).then(success => {
        Toast.showWithGravity(I18n.t("Story_deleted","Story deleted !"), Toast.LONG, Toast.TOP);
        if(!debug_mode) setStat("Trash story", sid, null , debug_mode, server, appDir, position);
        return this.storyCheck();
      });
    } catch(e) {
      console.log(e.message);
    }

  }
  renderContent = () => {
    const {theme, story, distance, transportIndex, dlIndex,  access_token, profile, granted, fromLat, fromLong, toLat, toLong , debug_mode} = this.state;
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
        alignItems: 'center',
        flex: 1,
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
      p: {
        fontFamily: 'Roboto-Light',
      },
      b: { fontFamily: 'Roboto-bold'
      },
      li: {
        fontFamily: 'Roboto-Light',
        fontSize: 9,
        textTransform: 'uppercase',
        color: story.theme.color3,
      },
      nav: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap-reverse', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12 },
      button: { backgroundColor: story.theme.color2},
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
          textAlign: 'center'
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
    const sinopsysThemeSheet = StyleSheet.create({
      p: {
          fontSize: 17,
          lineHeight: 26,
          letterSpacing: 0,
          fontFamily: '',
          color: '#1B1A1B',
          fontFamily: 'Roboto-Regular',
        },
        b: {
          fontFamily: 'Roboto-bold'
        },
        container: {
          flex: 1,
          alignItems: 'center',
          backgroundColor: '#D8D8D8',
          padding: 20,
        },
        i:{
          fontSize: 32,
          fontFamily: story.theme.font2
        }
      });
      const ButtonGroup = () => {
        return (
          <View style={themeSheet.nav}>
          <TouchableOpacity style={{flex:1, flexGrow: 1, paddingHorizontal: 10}}  onPress={() => this.deleteStory(story.id)} >
            <Button buttonStyle={themeSheet.button} onPress={() => this.deleteStory(story.id)} icon={{name: 'trash', type:'BooksonWall', size: 24, color: 'white', paddingVertical: 6}}/>
          </TouchableOpacity>
          {distance && (
          <TouchableOpacity style={{flex:2, flexGrow: 2,  paddingHorizontal: 3}} onPress={() => this.launchNavigation()}>
            <Button buttonStyle={themeSheet.button} icon={{name: 'navi',  type:'BooksonWall', size: 32, color: 'white', paddingVertical: 2}} onPress={() => this.launchNavigation()} />
          </TouchableOpacity>
          )}
          <TouchableOpacity style={{flex:2, flexGrow: 2,  paddingHorizontal: 3}} onPress={() => this.storyMap()} >
            <Button buttonStyle={themeSheet.button} icon={{name: 'play', type:'BooksonWall', size: 32, color: 'white', paddingVertical: 2}} onPress={() => this.storyMap()}  />
          </TouchableOpacity>
          </View>
        );
      };
    return (
      <>
      <View style={themeSheet.card} >
            {distance && (
              <Text style={themeSheet.distance}> {I18n.t("Distance_to_beginning", "Distance to the beginning of the story ")}: {distance} {I18n.t("Kilometers","kilometers")}</Text>
            )}
            {(story.isInstalled) ? <ButtonGroup /> : <View style={themeSheet.nav}><TouchableOpacity style={{flex:1, flexGrow: 1}} onPress={() => this.downloadStory(story.id)}><Button buttonStyle={themeSheet.button} loading={this.state.dlLoading} loadingProps={{ color: theme.color3 }} loadingStyle={{padding: 10}} rounded={true} type='clear' onPress={() => this.downloadStory(story.id)}  icon={{ name: 'download', type: 'booksonWall', size: 32, color: theme.color3, padding: 5}} title='Descargar esta historia' titleStyle={{color: theme.color1, fontSize: 12, textTransform: 'uppercase'}}/></TouchableOpacity></View> }

              <View style={themeSheet.sinopsys} >
                <HTMLView paragraphBreak={"br"} lineBreak={"br"} addLineBreaks={false} value={story.sinopsys} stylesheet={sinopsysThemeSheet}/>
              </View>

              <View style={themeSheet.credits}>
                <Text h2 style={themeSheet.subtitle}>{I18n.t("Credits", "Credits")}</Text>
                <HTMLView  value={"<span>"+ story.credits +"</span>"} stylesheet={creditsThemeSheet} />
              </View>

      </View>
      </>
    )
  }
  renderNavBar = () => {
      const {theme} = this.state;
      return (
        <View style={styles.navContainer}>
          <View style={styles.statusBar} />
          <View style={styles.navBar}>
            <TouchableOpacity style={[styles.iconLeft, {backgroundColor: theme.color2, opacity: .8}]}  onPress={() => this.props.navigation.push('Stories', {screenProps: this.props.screenProps})}>
              <Button onPress={() => this.props.navigation.push('Stories', {screenProps: this.props.screenProps})} type='clear' underlayColor={theme.color1} iconContainerStyle={{ marginLeft: 2}} icon={{name:'leftArrow', size:24, color:'#fff', type:'booksonWall'}} />
            </TouchableOpacity>
          </View>
        </View>
        //
      )
    }
  storyMap = () => {
    const {index, story, completed, debug_mode, distance} = this.state;
    this.setState({timeout: 0});
    let newIndex = (completed && completed > 0 ) ? (completed+1) : 0;
    console.log('story is complete', story.isComplete);
    (story.isComplete)
    ? this.props.navigation.push('StoryComplete', {screenProps: this.props.screenProps, story: story})
    : (completed > 0 && debug_mode === false)
    ? this.props.navigation.push('ToPath', {screenProps: this.props.screenProps, story: story, index: newIndex, distance: distance})
    : this.props.navigation.push('StoryMap', {screenProps: this.props.screenProps, story: story, index: newIndex, distance: distance}) ;
  }
  toPath = () => {
    const {index, story, completed, selected, debug_mode, distance} = this.state;
      //this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: (this.state.selected > 0) ? (this.state.selected - 1): 0})
      (story.stages.length === completed) ? this.props.navigation.navigate('StoryComplete', {screenProps: this.props.screenProps, story: story, index: 0}) : this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: story, distance: distance, index:  (selected > 0) ? (selected - 1): 0}) ;
  }
  launchAR = () => {
    const {index, story, completed} = this.state;
    (story.stages.length === completed) ? this.props.navigation.navigate('StoryComplete', {screenProps: this.props.screenProps, story: story, index: 0}) : this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: story, index: 0}) ;
  }
  render() {
      const { navigate } = this.props.navigation;
      const {theme, themeSheet, story} = this.state;
      if(!this.props.isFocused) return null;
      const size = (story.zipsize) ? ' • ' + story.zipsize : '';
      const Title = () => (
        <View style={styles.titleStyle}>
          <Text style={{
            fontSize: 30,
            letterSpacing: 1.1,
            color: "#fff",
            textShadowColor: 'rgba(0, 0, 0, 0.85)',
            textShadowOffset: {width: 1, height: 1},
            textShadowRadius: 2,
            fontFamily: story.theme.font1}} >{story.title}</Text>
          <Text style={styles.location}>{story.city + ' • ' + story.state +  size  }</Text>
        </View>
      );
      return (
      <ThemeProvider>
        <SafeAreaView style={styles.container} forceInset={{ top: 'always', bottom: 'always' }}>
        <ReactNativeParallaxHeader
          headerMinHeight={HEADER_HEIGHT}
          headerMaxHeight={250}
          extraScrollHeight={50}
          navbarColor={story.theme.color1}
          title={<Title/>}
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
  contentContainer: {
    flexGrow: 1,
  },
  navContainer: {
    height: HEADER_HEIGHT,
    marginHorizontal: 13,
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
    alignItems:'stretch',
    alignContent: 'stretch',
    justifyContent:'center',
    fontSize: 30,
  },
  card: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  location: {
    fontFamily: 'ATypewriterForMe',
    fontSize: 12,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1,
  },
  iconLeft: {
    width: 45,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  }
});
export default withNavigationFocus(Story);
