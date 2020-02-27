import React, {Component} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { PermissionsAndroid, Alert, Platform, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, ImageBackground } from 'react-native';
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
  launchAR = () => this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: 0})
  render() {
    const {theme, story, distance, transportIndex, dlIndex,  access_token, profile, granted, fromLat, fromLong, toLat, toLong } = this.state;
    const transportbuttons = [ I18n.t('Auto'),  I18n.t('Pedestrian'),  I18n.t('Bicycle')];
    const storyPlay = () => <Icon size={40} name='geopoint' color='#4D0101' onPress={() => this.launchStory()} />;
    const storyDelete = () => <Icon size={40} name='trash' color='#4D0101' onPress={() => this.deleteStory(story.id)} />;
    const storyInstall = () => <Icon size={40} name='download' color='#fff' onPress={() => this.downloadStory(story.id)} />;
    const storyAr = () => <Icon size={40} name='play' color='#4D0101' onPress={() => this.launchAR()} />;
    const dlbuttons = (story.isInstalled) ? [ { element: storyDelete }, { element: storyPlay }, { element: storyAr} ]: [ { element: storyInstall }];
    const themeSheet = StyleSheet.create({
      p: {
        fontFamily: theme.font3,
        fontSize: 14,
        marginTop: 1,
        marginBottom: 1,
        padding: 0,
        lineHeight: 20,
        letterSpacing: 0,
        color: theme.color3
      },
      container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#D8D8D8',
        padding: 0,
      },
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
        borderWidth: 0,
        backgroundColor: '#D8D8D8',
        marginBottom: 3,
      },
      tile:{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
        textAlign: 'center',
        backgroundColor: '#D8D8D8',
        maxHeight: 90,
      },
      title: {
        flex: 1,
        paddingTop: 25,
        paddingBottom: 1,
        fontFamily: 'TrashHand',
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 2,
        color: '#fff',
        margin: 0,
        textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 5
      },
      location: {
        flex: 1,
        paddingTop: 0,
        paddingBottom: 3,
        fontFamily: 'ATypewriterForMe',
        fontSize: 13,
        textAlign: 'center',
        letterSpacing: 2,
        margin: 0,
        color: '#fff',
      },
      scrollview: {
        flex: 2,
        backgroundColor: '#D8D8D8',
        marginTop: 3
      },
      sinopsys: {
        flex: 1,
        backgroundColor: '#D8D8D8',
        padding: 20,
        marginTop: 3,
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
        fontSize: 20,
        backgroundColor: '#d1d2d3',
        padding: 0,
        margin: 0,
        justifyContent: 'center',
      },
      menssage: {
        fontSize: 12,
        color: '#000',
        textAlign: 'center',
        paddingTop: 5,
        fontFamily: 'OpenSansCondensed-Light',
      },
      transport: {
        fontSize: 14,
        backgroundColor: '#4B4F53',
        borderWidth: 0,
        borderColor: '#d2d2d2',
        minHeight: 40,
        maxHeight: 40,
        margin: 0,
      },
    });
    return (
      <ThemeProvider>
        <SafeAreaView style={styles.container}>
          <Header
            style={styles.header}
            containerStyle={{ backgroundColor: '#D8D8D8', justifyContent: 'space-around', borderWidth: 0, paddingTop: 25, paddingBottom: 25}}
            leftComponent={{ icon: 'menu', color: '#4B4F53' }}
            centerComponent={<Icon name='bow-logo' style={styles.logo}/>}
          />
          <View style={styles.card} >
              <ImageBackground source={{uri: theme.banner.filePath}} style={styles.tile}>
                <Text style={styles.title}>{story.title}</Text>
                <Text style={styles.location}>{story.city} - {story.country}</Text>
              </ImageBackground>
              <ScrollView style={themeSheet.scrollview}>
                <View style={themeSheet.sinopsys} >
                <HTMLView
                  value={story.sinopsys}
                  stylesheet={styles}
                />
               </View>
                <View style={styles.credits}>
                    <Text h2 style={styles.subtitle}>{I18n.t("credits", "Credits")}</Text>
                    <HTMLView
                    value={story.credits}
                    stylesheet={styles}
                    />
                </View>
              </ScrollView>
              {distance && (
                <Text> {I18n.t("distance", "You are at {distance} km from the beginning of your story.")}</Text>
              )}
            </View>

            <View style={styles.nav} containerStyle= {{margin: 0, padding: 0, flex:1, justifyContent: 'flex-end',}}>
                {story.isInstalled && (
                <>
                <Text style={styles.menssage}>{I18n.t("Transportation","Please choose your mode of transportation and press Start Navigation.")}</Text>
                <ButtonGroup
                  style={styles.transport}
                  onPress={this.updateTransportIndex}
                  selectedIndex={transportIndex}
                  buttons={transportbuttons}
                  buttonStyle={{ borderWidth: 0, borderColor: '#999999', backgroundColor: '#c2c3c4', minHeight: 35, maxHeight: 35, margin: 0}}
                  selectedButtonStyle= {{backgroundColor: '#ccc'}}
                  textStyle= {{ color: '#4B4F53', fontSize: 10 }}
                  selectedTextStyle= {{ color: '#9E1C00' }}
                  innerBorderStyle= {{  color: '#d2d2d2' }}
                  disabled={[1, 2]}
                  containerStyle={{flex: 1, borderWidth: 1, borderColor: '#c2c3c4', backgroundColor: '#c2c3c4', margin: 0, minHeight: 35, maxHeight: 35, borderRadius: 0, margin: 0, padding: 0}}
                  //disabled={true}
                  />
                </>
              )}
              <ButtonGroup style={styles.menu}
                buttonStyle={{ backgroundColor: '#9E1C00', borderWidth: 0, borderColor: '#4B4F53', margin: 0, minHeight: 50, maxHeight: 50}}
                onPress={this.updateDlIndex}
                selectedIndex={dlIndex}
                selectedButtonStyle= {{backgroundColor: '#750000'}}
                buttons={dlbuttons}
                containerStyle= {{flex: 1, borderWidth: 0, borderColor: '#4B4F53', minHeight: 50, maxHeight: 50, backgroundColor: '#9E1C00', borderRadius: 0, margin: 0, padding: 0}}
                innerBorderStyle= {{ color: '#750000' }}
                />
            </View>

        </SafeAreaView>
      </ThemeProvider>
    );
  }
}
const styles = StyleSheet.create({
  p: {
    fontFamily: 'ATypewriterForMe',
    fontSize: 14,
    marginTop: 1,
    marginBottom: 1,
    padding: 0,
    lineHeight: 20,
    letterSpacing: 0,
    color: '#000'
  },
  b: {fontFamily: 'OpenSansCondensed-Bold',
    },
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: '#D8D8D8',
    padding: 0,
  },
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
    borderWidth: 0,
    backgroundColor: '#D8D8D8',
    marginBottom: 3,
  },
  tile:{
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    textAlign: 'center',
    backgroundColor: '#D8D8D8',
    maxHeight: 90,
  },
  title: {
    flex: 1,
    paddingTop: 25,
    paddingBottom: 1,
    fontFamily: 'TrashHand',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 2,
    color: '#fff',
    margin: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 5
  },
  location: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 3,
    fontFamily: 'ATypewriterForMe',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 2,
    margin: 0,
    color: '#fff',
  },
  scrollview: {
    flex: 2,
    backgroundColor: '#D8D8D8',
    marginTop: 3
  },
  sinopsys: {
    flex: 1,
    backgroundColor: '#D8D8D8',
    padding: 20,
    marginTop: 3,
  },
 credits: {
     backgroundColor: '#c2c3c4',
     padding: 20,
  },
  subtitle: {
    fontWeight: 'bold',
    padding: 0,
    marginTop: 15,
    marginBottom: 25,
    fontSize: 16,
    textTransform: 'uppercase'
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
  nav: {
    flex: 1,
    fontSize: 20,
    backgroundColor: '#d1d2d3',
    padding: 0,
    margin: 0,
    justifyContent: 'center',
  },
  menssage: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    paddingTop: 5,
    fontFamily: 'OpenSansCondensed-Light',
  },
  transport: {
    fontSize: 14,
    backgroundColor: '#4B4F53',
    borderWidth: 0,
    borderColor: '#d2d2d2',
    minHeight: 40,
    maxHeight: 40,
    margin: 0,
  },
  menu: {
    flex: 1,
    minHeight: 40,
    maxHeight: 40,
    margin: 0,
  }
});
