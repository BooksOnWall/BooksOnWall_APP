import React, {Component} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Dimensions, PermissionsAndroid, Alert, Platform, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, ImageBackground, TouchableOpacity } from 'react-native';
import { Header, Card, ListItem, Button, ThemeProvider, Icon, registerCustomIconType } from 'react-native-elements';
import NavigationView from "./stage/NavigationView";
import { NativeModules } from "react-native";
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY  } from 'react-native-dotenv';
import  distance from '@turf/distance';
import HTMLView from 'react-native-htmlview';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import Reactotron from 'reactotron-react-native';
import KeepAwake from 'react-native-keep-awake';
import I18n from "../../utils/i18n";
import IconSet from "../../utils/Icon";
import { Banner } from '../../../assets/banner';
import Toast from 'react-native-simple-toast';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {lineString as makeLineString, bbox} from '@turf/turf';
import ReactNativeParallaxHeader from 'react-native-parallax-header';
import {unzip} from 'react-native-zip-archive';

const SCREEN_HEIGHT = Dimensions.get("window").height;
const IS_IPHONE_X = SCREEN_HEIGHT === 812 || SCREEN_HEIGHT === 896;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 44 : 24) : 0;
const HEADER_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 88 : 64) : 64;
const NAV_BAR_HEIGHT = HEADER_HEIGHT - STATUS_BAR_HEIGHT;
registerCustomIconType('booksonwall', IconSet);

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
export default class Story extends Component {
  static navigationOptions = {
    title: 'Story',
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
    this.state = {
      server: (this.props.state) ? this.props.state.server : this.props.screenProps.server,
      appName: (this.props.state) ? this.props.state.appName : this.props.screenProps.appName,
      appDir: (this.props.state) ? this.props.state.appDir : this.props.screenProps.AppDir,
      downloadProgress: 0,
      story: (this.props.story) ? this.props.story : this.props.navigation.getParam('story'),
      theme: (this.props.story && this.props.story.theme) ? this.props.story.theme: this.props.navigation.getParam('story').theme,
      granted: Platform.OS === 'ios',
      transportIndex: 0,
      selected: 0,
      completed: 0,
      dlIndex: null,
      dlLoading: false,
      profile: 'mapbox/walking',
      themeSheet: null,
      initialPosition: null,
      mbbox: mbbox,
      lastPosition: null,
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
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
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
  componentWillUnmount = async () => {
    await KeepAwake.deactivate();
  }
  getSelected = async() => {
    const {appDir, selected, index} = this.state;
    let { story } = this.state;
    if(this.isInstalled(story.id)) {
      try {
        // get history from file
        const storyHF = appDir + '/stories/' + story.id + '/complete.txt';
        // // check if file exist
        await RNFS.exists(storyHF)
        .then( (exists) => {
            if (exists) {
                // get id from file
                RNFetchBlob.fs.readFile(storyHF, 'utf8')
                .then((data) => {
                  // handle the data ..
                  this.setState({completed: parseInt(data), selected: parseInt(data)});
                  if (parseInt(data) === story.stages.length) {
                    story.isComplete = true;
                    this.setState({story: story});
                  }
                  return data;
                })
            } else {
                RNFetchBlob.fs.createFile(storyHF, '0', 'utf8').then(()=>{
                  this.setState({completed: 0, selected: 1});
                });
            }
        });
        return true;
      } catch(e) {
        console.log(e);
      }
    }
  }
  updateTransportIndex = (transportIndex) => this.setState({transportIndex})
  updateDlIndex = (dlIndex) => this.setState({dlIndex})
  watchID: ?number = null;
  downloadStory = (sid) => {
    // add loading in download story button
    this.setState({dlLoading: true});
    // Toast message starting download
    Toast.showWithGravity(I18n.t("Start_downloading","Start Downloading."), Toast.SHORT, Toast.TOP);
    const appDir = this.state.appDir;
    RNFetchBlob
    .config({
        addAndroidDownloads : {
            title : 'Story_'+ sid + '.zip',
            useDownloadManager : true, // <-- this is the only thing required
            // Optional, override notification setting (default to true)
            notification : true,
            // Optional, but recommended since android DownloadManager will fail when
            // the url does not contains a file extension, by default the mime type will be text/plain
            mime : 'application/zip',
            description : I18n.t("Story_downloaded","Story downloaded by BooksOnWall."),
            mediaScannable: true,
            path : appDir + '/stories/Story_'+ sid + '.zip'
        }
    })
    .fetch('POST', this.state.server + '/zip/' + sid)
    // .progress({ interval: 250 },(received,total)=>{
    //   console.log('progress:',received/total);
    //   this.setState({downloadProgress:(received/total)*100});
    // })
    .then((resp) => {
      // the path of downloaded file
      //const p = resp.path(); android manager can't get the downloaded path
      this.setState({downloadProgress:0});
      let path_name = appDir+'/'+'stories/Story_'+ sid + '.zip'
      console.log(path_name);
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
      //remove zip file
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
    let story = this.state.story;
    try {
        story.isInstalled = await this.isInstalled(story.id);
        this.setState({story: story});
        (story.isInstalled) ? await this.getSelected() : '';
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
  getCurrentLocation = async () => {
    try {
      // Instead of navigator.geolocation, just use Geolocation.
      await Geolocation.getCurrentPosition(
        position => {
          const initialPosition = position;
          this.setState({
            initialPosition: initialPosition,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: 10000, maximumAge: 1000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => {

        this.setState({LastPosition: position,fromLat: position.coords.latitude, fromLong: position.coords.longitude});
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
  renderContent = () => {
    const {theme, story, distance, transportIndex, dlIndex,  access_token, profile, granted, fromLat, fromLong, toLat, toLong } = this.state;
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
        paddingTop: 60,
        paddingBottom: 60,
        paddingHorizontal: 26,
        color: story.theme.color3,
      },
      sinopsys: {
        paddingTop: 40,
        paddingBottom: 50,
        paddingHorizontal: 32,
        backgroundColor: '#D8D8D8',
      },
      subtitle: {
        fontWeight: 'bold',
        padding: 0,
        marginTop: 0,
        marginBottom: 30,
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: 'Roboto-bold',
        color: story.theme.color3,
      },
      NavButton: {
        backgroundColor: story.theme.color1,
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
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
        paddingTop: 5,
        fontFamily: 'Roboto-Regular'
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
      menu: {
        flex: 1,
        margin: 0,
        padding: 0,
        backgroundColor: story.theme.color1,
      },
      nav: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap-reverse', flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6 },
      button: { marginHorizontal: 1, backgroundColor: 'rgba(0, 0, 0, 0.10)'}
      });
    const creditsThemeSheet = StyleSheet.create({
      p: {
          fontSize: 16,
          lineHeight: 20,
          letterSpacing: 0,
          fontFamily: 'Roboto-Regular',
          color: story.theme.color3,
        },
        b: {
          fontFamily: 'Roboto-bold'},
          container: {
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#D8D8D8',
          padding: 0,
        },
        strong: {
          fontFamily: 'Roboto-bold',
        }
      });
    const sinopsysThemeSheet = StyleSheet.create({
      p: {
          fontSize: 18,
          lineHeight: 26,
          letterSpacing: 0,
          fontFamily: '',
          color: '#111',
          fontFamily: 'RobotoCondensed-Light',
        },
        b: {
          fontFamily: 'Roboto-bold'
        },
        container: {
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#D8D8D8',
          padding: 0,
        },
        i:{
          fontSize: 24,
          fontFamily: story.theme.font2
        }
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

            {distance && (
              <Text style={themeSheet.distance}> {I18n.t("Distance_to_beginning", "Distance to the beginning of the story ")}: {distance} {I18n.t("Kilometers","kilometers")}</Text>
            )}
            {(story.isInstalled) ? <ButtonGroup /> : <TouchableOpacity style={{flex:1, flexGrow: 1, padding: 6}} onPress={() => this.downloadStory(story.id)}><Button buttonStyle={themeSheet.button}  loading={this.state.dlLoading}  rounded={true} type='clear' onPress={() => this.downloadStory(story.id)}  icon={{ name: 'download', type: 'booksonwall', size: 20, color: 'white'}} title='Download' titleStyle={{color: 'white'}}/></TouchableOpacity> }

              <View style={themeSheet.sinopsys} >
                <HTMLView value={story.sinopsys} stylesheet={sinopsysThemeSheet}/>
              </View>

              <View style={themeSheet.credits} >
              <Text h2 style={themeSheet.subtitle}>{I18n.t("credits", "Credits")}</Text>
              <HTMLView value={story.credits} stylesheet={creditsThemeSheet} />
            </View>
      </View>
      </>
    )
  }
  renderNavBar = () => (
    <View style={styles.navContainer}>
      <View style={styles.statusBar} />
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconLeft} onPress={() => this.props.navigation.goBack()}>
          <Button onPress={() => this.props.navigation.goBack()} type='clear' underlayColor='#FFFFFF' iconContainerStyle={{ marginLeft: 2}} icon={{name:'left-arrow', size:24, color:'#fff', type:'booksonwall'}} />
        </TouchableOpacity>
      </View>
    </View>
  )
  storyMap = () => {
    const {index, story, completed} = this.state;
    (story.isComplete)
    ? this.props.navigation.navigate('StoryComplete', {screenProps: this.props.screenProps, story: story, index: 0})
    : this.props.navigation.navigate('StoryMap', {screenProps: this.props.screenProps, story: story, index: 0}) ;
  }
  launchAR = () => {
    const {index, story, completed} = this.state;
    (story.stages.length === completed) ? this.props.navigation.navigate('StoryComplete', {screenProps: this.props.screenProps, story: story, index: 0}) : this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: story, index: 0}) ;
  }
  render() {
      const {theme, themeSheet, story} = this.state;

      const Title = () => (
        <View style={styles.titleStyle}>
          <Text style={{
            fontSize: 26,
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
    marginHorizontal: 10,
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
    justifyContent:'center'
  },
  card: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  location: {
    fontFamily: 'ATypewriterForMe',
    fontSize: 11,
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
