import React, {Component} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Dimensions, PermissionsAndroid, Alert, Platform, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, ImageBackground, TouchableOpacity } from 'react-native';
import { Header, Card, ListItem, ButtonGroup, Button, ThemeProvider } from 'react-native-elements';
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY  } from 'react-native-dotenv';
import  distance from '@turf/distance';
import HTMLView from 'react-native-htmlview';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import Reactotron from 'reactotron-react-native';
import KeepAwake from 'react-native-keep-awake';
import I18n from "../../utils/i18n";
import Icon from "../../utils/Icon";
import { Banner } from '../../../assets/banner';
import Toast from 'react-native-simple-toast';

import ReactNativeParallaxHeader from 'react-native-parallax-header';
const SCREEN_HEIGHT = Dimensions.get("window").height;
const IS_IPHONE_X = SCREEN_HEIGHT === 812 || SCREEN_HEIGHT === 896;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 44 : 20) : 0;
const HEADER_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 88 : 64) : 64;
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

export default class Story extends Component {
  static navigationOptions = {
    title: 'Story',
    headerShown: false
  };
  constructor(props) {
    super(props);
    this.loadStories = this.props.loadStories;
    this.state = {
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      appDir: this.props.screenProps.AppDir,
      downloadProgress: 0,
      story: this.props.navigation.getParam('story'),
      theme: this.props.navigation.getParam('story').theme,
      granted: Platform.OS === 'ios',
      transportIndex: 0,
      dlIndex: null,
      access_token: MAPBOX_KEY,
      profile: 'mapbox/walking',
      themeSheet: null,
      initialPosition: null,
      lastPosition: null,
      fromLat: null,
      fromLong: null,
      toLat: null ,
      toLong: null,
      distance: null,
    };
    this.updateTransportIndex = this.updateTransportIndex.bind(this);
    this.updateDlIndex = this.updateDlIndex.bind(this);
    this.getCurrentLocation = this.getCurrentLocation.bind(this);
  }
  componentDidMount = async () => {
    if (!this.props.navigation.getParam('story') ) this.props.navigation.navigate('Stories');
    try {
      await KeepAwake.activate();
      if (!this.state.granted) {
        await this.requestFineLocationPermission();
      }
      await this.getCurrentLocation();
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => {
    await KeepAwake.deactivate();
  }
  updateTransportIndex = (transportIndex) => this.setState({transportIndex})
  updateDlIndex = (dlIndex) => this.setState({dlIndex})
  watchID: ?number = null;
  downloadStory = (sid) => {
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
      let path_name = appDir+'/'+'Story_'+ sid + '.zip'

      return this.installStory(sid, path_name);
    });
  }
  installStory = (sid, path) => {
  //   RNFS.readDir(RNFS.MainBundlePath) // On Android, use "RNFS.DocumentDirectoryPath" (MainBundlePath is not defined)
  // .then((result) => {
  //   console.log('GOT RESULT', result);
  //
  //   // stat the first file
  //   return Promise.all([RNFS.stat(result[0].path), result[0].path]);
  // })
  // .then((statResult) => {
  //   if (statResult[0].isFile()) {
  //     // if we have a file, read it
  //     return RNFS.readFile(statResult[1], 'utf8');
  //   }
  //
  //   return 'no file';
  // })
  // .then((contents) => {
  //   // log the file contents
  //   console.log('content:', contents);
  // })
  // .catch((err) => {
  //   console.log(err.message, err.code);
  // });
    return true;
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
              "coordinates": [this.state.fromLat, this.state.fromLong]
            }
          };
          let to = {
            "type": "Feature",
            "properties": {},
              "geometry": {
                "type": "Point",
                "coordinates": [this.state.toLat, this.state.fromLong]
              }
            };
          let units = I18n.t("kilometers","kilometers");
          let dis = distance(from, to, "kilometers");
          console.log('from story distance:', dis);
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
        Reactotron.log("ACCESS_FINE_LOCATION permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }

  launchStory = () => this.props.navigation.navigate('ToStage', {'story': this.state.story, 'position': 1, state: this.state })
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
        Toast.showWithGravity(I18n.t("Story deleted !"), Toast.LONG, Toast.TOP);
        return this.props.navigation.goBack();
      });
    } catch(e) {
      console.log(e.message);
    }

  }
  renderContent = () => {
    const {theme, story, distance, transportIndex, dlIndex,  access_token, profile, granted, fromLat, fromLong, toLat, toLong } = this.state;
    const transportbuttons = [ I18n.t('Auto'),  I18n.t('Pedestrian'),  I18n.t('Bicycle')];
    const storyPlay = () => <Icon size={40} name='geopoint' color='white' onPress={() => this.launchStory()} />;
    const storyDelete = () => <Icon size={40} name='trash' color='white' onPress={() => this.deleteStory(story.id)} />;
    const storyInstall = () => <Icon size={40} name='download' color='white' onPress={() => this.downloadStory(story.id)} />;
    const storyAr = () => <Icon size={40} name='play' color='white' onPress={() => this.launchAR()} />;
    const dlbuttons = (story.isInstalled) ? [ { element: storyDelete }, { element: storyPlay }, { element: storyAr} ]: [ { element: storyInstall }];
    const themeSheet = StyleSheet.create({
      header: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderWidth: 0,
        backgroundColor: '#D8D8D8',
        margin: 0,
        padding: 0,
      },
      card: {
        flex: 3,
        flexDirection: 'column',
        padding: 0,
        margin: 0,
        backgroundColor: 'transparent',
      },
      tile:{
        backgroundColor: story.theme.color1,
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignContent: 'center',
        maxHeight: 100,
      },
      title: {
        fontFamily: story.theme.font1,
        fontSize: 16,
        textAlign: 'center',
        paddingTop: 0,
        paddingBottom: 0,
        letterSpacing: 1,
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2,
      },
      sinopsys: {
        flex: 1,
        backgroundColor: '#C8C1B8',
        fontFamily: story.theme.font2,
        color: '#000',
        paddingTop: 30,
        paddingBottom: 30
      },
      credits: {
        backgroundColor: story.theme.color2,
        fontFamily: story.theme.font3,
        padding: 26,
        color: story.theme.color3,
      },
      subtitle: {
        fontWeight: 'bold',
        padding: 0,
        marginTop: 0,
        marginBottom: 0,
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: story.theme.font3,
        color: story.theme.color3,
      },
      logo: {
        color: '#9E1C00',
        fontSize: 40,
        textShadowColor: 'rgba(0, 0, 0, 0.35)',
        textShadowOffset: {width: 1, height: 1},
        textShadowRadius: 3,
      },
      nav: {
        flex: 1,
        justifyContent: 'center',
        fontSize: 20,
        backgroundColor: story.theme.color1,
        padding: 0,
        margin: 0,
        textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 2,
        maxHeight: 55
      },
      NavButton: {
          backgroundColor: story.theme.color1,
          borderWidth: 0,
          margin: 0,
      },
      NavContainer: {
        flex: 1,
        borderWidth: 0,
        borderRadius: 0,
        margin: 0,
        padding: 0,
        backgroundColor: story.theme.color1,
      },
      menssage: {
        fontSize: 12,
        color: '#000',
        textAlign: 'center',
        paddingTop: 5,
        fontFamily: 'OpenSansCondensed-Light',
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
      }
    });

    const creditsThemeSheet = StyleSheet.create({
      p: {
          fontSize: 14,
          padding: 0,
          lineHeight: 20,
          letterSpacing: 0,
          fontFamily: 'OpenSansCondensed-ligth',
          color: story.theme.color3
        },
        b: {
          fontFamily: 'OpenSansCondensed-Bold'},
          container: {
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#D8D8D8',
          padding: 0,
        },
      });
    const sinopsysThemeSheet = StyleSheet.create({
      p: {
          fontSize: 16,
          paddingTop: 25,
          paddingBottom: 10,
          paddingHorizontal:25,
          lineHeight: 24,
          letterSpacing: 0,
          fontFamily: '',
          color: '#111',
          fontFamily: story.theme.font2,
          textAlign: 'center',
        },
        b: {
          fontFamily: 'OpenSansCondensed-Bold'
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
    return (
      <>
      <View style={styles.card} >

            <View style={themeSheet.sinopsys} >
              <HTMLView value={story.sinopsys} stylesheet={sinopsysThemeSheet}/>
            </View>

            <View style={themeSheet.credits} >
              <Text h2 style={themeSheet.subtitle}>{I18n.t("credits", "Credits")}</Text>
              <HTMLView value={story.credits} stylesheet={creditsThemeSheet} />
            </View>


          {distance && (
            <Text> {I18n.t("distance", "You are at {distance} km from the beginning of your story.")}</Text>
          )}
          <ButtonGroup
            style={styles.menu}
            containerStyle={themeSheet.NavContainer}
            buttons={dlbuttons}
            buttonStyle={themeSheet.NavButton}
            onPress={this.updateDlIndex}
            selectedIndex={dlIndex}
            selectedButtonStyle={{backgroundColor: 'transparent'}}
            innerBorderStyle={{color: 'rgba(0, 0, 0, 0.3)'}}
            Component={TouchableOpacity}
            selectedButtonStyle={{backgroundColor: 'transparent'}}
            />
      </View>
      </>
    )

  }
  renderNavBar = () => (
  <View style={styles.navContainer}>
    <View style={styles.statusBar} />
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.iconLeft} onPress={() => {}}>
        <Icon name="home" size={25} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconRight} onPress={() => {}}>
        <Icon name="home" size={25} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
)
  launchAR = () => this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: 0})
  render() {
      const {theme, themeSheet, story} = this.state;

      const Title = () => (
        <View>
        <Text style={{fontFamily: story.theme.font1}}>{story.title}</Text>
        <Text style={styles.location}>{this.state.story.city + ' • ' + this.state.story.state}</Text>
        </View>
      );
      return (
      <ThemeProvider>
        <SafeAreaView style={styles.container}>
        <ReactNativeParallaxHeader
          headerMinHeight={HEADER_HEIGHT}
          headerMaxHeight={250}
          extraScrollHeight={20}
          navbarColor="#3498db"
          title={<Title/>}
          titleStyle={styles.titleStyle}
          backgroundImage={{uri: theme.banner.filePath}}
          backgroundImageScale={1.2}
          renderNavBar={this.renderNavBar}
          renderContent={this.renderContent}
          containerStyle={styles.container}
          contentContainerStyle={styles.contentContainer}
          innerContainerStyle={styles.container}
          scrollViewProps={{
            onScrollBeginDrag: () => console.log('onScrollBeginDrag'),
            onScrollEndDrag: () => console.log('onScrollEndDrag'),
          }}
      />

        </SafeAreaView>
      </ThemeProvider>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
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
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 0,
    margin: 0,
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 0,
    margin: 0,
    padding: 0,
  },
  card: {
    flex: 3,
    flexDirection: 'column',
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  location: {
    flex: 1,
    fontFamily: 'ATypewriterForMe',
    fontSize: 11,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1
  },
  scrollview: {
    flex: 2,
    backgroundColor: '#D8D8D8',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: 'whitesmoke',
  },
  logo: {
    color: '#9E1C00',
    fontSize: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  menssage: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    paddingTop: 5,
    fontFamily: 'OpenSansCondensed-Light',
  },
  menu: {
    flex: 1,
    minHeight: 40,
    margin: 0,
    padding: 0,
  }
});
