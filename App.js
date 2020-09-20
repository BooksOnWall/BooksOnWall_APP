import React , { Component } from 'react';
if(__DEV__) {

} else {
  console.log = () => {};
  console.table = () => {};
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeAreaView from 'react-native-safe-area-view';
import { StyleSheet, Text, ActivityIndicator, Platform } from 'react-native';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { fromRight, zoomIn, zoomOut } from 'react-navigation-transitions'
import { isTablet, isLandscape } from 'react-native-device-info';

import * as RNLocalize from "react-native-localize";
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';
import NetInfo from "@react-native-community/netinfo";
import { Overlay } from 'react-native-elements';
import { VIROAPI_KEY, MAPBOX_KEY, SERVER_URL, PROJECT_NAME , DEBUG_MODE } from '@env';
import KeepAwake from 'react-native-keep-awake';
import Toast from 'react-native-simple-toast';
import I18n from "./src/utils/i18n";
import {
  isCameraPresent,
  getCarrier,
  getDevice,
  getDeviceType,
  getSystemVersion,
  getUsedMemory,
  getHardware,
  getApplicationName,
  getFirstInstallTime,
  getUserAgent,
  getUniqueId,
  supportedAbis,
  isLocationEnabled,
  android,
  getAndroidId,
  getManufacturer } from 'react-native-device-info';
// uniqueId: getUniqueId(),
// systemVersion: getSystemVersion(),
// usedMemory: getUsedMemory().then(usedMemory => {
//   return usedMemory;
// }),
// getFirstInstallTime: getFirstInstallTime().then(firstInstallTime => { return firstInstallTime }),
// useragent: getUserAgent().then(userAgent => {return userAgent;}),
// deviceType: getDeviceType(),
// manufacturer: getManufacturer(),.then(manufacturer => { return manufacturer; }),
// supportedProc: supportedAbis().then(abis => {
//     return abis;
// }),
// isLocationEnbled: isLocationEnabled().then(enabled => {
//     return enabled; // true or false
// }),
// android: getAndroidId().then(androidId => {
//   return android;// androidId here
// })
// isCameraPresent: isCameraPresent()
// .then(isCameraPresent => {
//   return isCameraPresent()
// })
import ToAr from './src/api/stories/stage/toAr';
import Intro from './src/api/intro/intro';
import Stories from './src/api/stories/Stories';
import TabletLayout from './src/api/stories/TabletLayout';
import Story from './src/api/stories/Story';
import StoryComplete from './src/api/stories/storyComplete';
import Stages from './src/api/stories/stages/Stages';
import Stage from './src/api/stories/stage/Stage';
import ToPath from './src/api/stories/stage/toPath';
import StoryMap from './src/api/stories/storyMap';
import SplashScreen from 'react-native-splash-screen';


const transition = fromRight() // Or whichever you prefer
const config = {
  animation: 'timing',
  config: transition.transitionSpec
}
const cardStyleInterpolator = ({ current, next, index, closing, layouts }) => {
  const { progress } = closing._value ? next : current
  const { width, height } = layouts.screen
  const containerStyle = transition.screenInterpolator({
    layout: {
      initWidth: width,
      initHeight: height
    },
    position: progress,
    scene: { index: 1 }
  })
  return { containerStyle }
}
const MainNavigator = createStackNavigator({
  Intro: { screen: Intro},
  Stories: { screen: Stories},
  TabletLayout: {screen: TabletLayout},
  Story: { screen: Story},
  StoryComplete: { screen: StoryComplete},
  Stages: { screen: Stages},
  Stage: { screen: Stage},
  ToAr: { screen: ToAr},
  StoryMap: { screen: StoryMap},
  ToPath: { screen: ToPath}
},
{
    defaultNavigationOptions: {
      transitionSpec: {
        open: config,
        close: config
      },
      cardStyleInterpolator
    },
    initialRouteName: 'Intro',
    navigationOptions: {
      headerShown: false,
    }

});
const AppContainer = createAppContainer(MainNavigator);

const coordinates = [
  [-73.98330688476561, 40.76975180901395],
  [-73.96682739257812, 40.761560925502806],
  [-74.00751113891602, 40.746346606483826],
  [-73.95343780517578, 40.7849607714286],
  [-73.99017333984375, 40.71135347314246],
  [-73.98880004882812, 40.758960433915284],
  [-73.96064758300781, 40.718379593199494],
  [-73.95172119140624, 40.82731951134558],
  [-73.9829635620117, 40.769101775774935],
  [-73.9822769165039, 40.76273111352534],
  [-73.98571014404297, 40.748947591479705]
];
export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viroapikey: VIROAPI_KEY,
      mapboxkey: MAPBOX_KEY,
      server: SERVER_URL,
      appName: PROJECT_NAME,
      debug_mode: (DEBUG_MODE === 'true') ? true : false,
      AppDir: '',
      FirstRun: false,
      stories: [],
      coordinates: coordinates,
      isTablet: isTablet(),
      isLandscape: isLandscape(),
      storiesURL: SERVER_URL + '/storiesPublished',
      storiesAllURL: SERVER_URL + '/stories',
      loadStories: this.loadStories,
      storeStories: this.storeStories,
      isLoading: false,
    };
    console.log('debug_mode', this.state.debug_mode);
    console.log('DEBUG_MODE', DEBUG_MODE);
  }
  componentDidMount = async () => {
    try {

      if(Platform.OS !== 'web') {
        await KeepAwake.activate();
        await this.handleLocales();
        await this.checkPermissions();
        await this.checkFileSystem();
        await this.handleFirstRun();
        SplashScreen.hide();
      }
    } catch (e) {
      console.warn(e);
    }
  }
  handleFirstRun = async () => {
    try {
      // check if application is already installed and has it's list of stories offline
      // console.log(this.state.AppDir);

      let StoryFile = this.state.AppDir+'/Stories.json';
      await RNFS.exists(StoryFile)
      .then( (exists) => {
          if (!exists) {
            this.setState({FistRun: true})
            Toast.showWithGravity(I18n.t("WAIT_INSTALL","Please wait while we are installing your application !"), Toast.LONG, Toast.TOP);
            this.statFirstRun();
            return this.loadStories();
          } else {
            // load stories from Stories.json file
            RNFS.readFile(this.state.AppDir+'/Stories.json','utf8')
            .then((stories) => {

                return this.setState({stories: JSON.parse(stories), isLoading: false, FirstRun: false});
            })
            .catch((err) => {
              console.log(err.message);
            });
          }
      });
    } catch(e) {
      console.log(e.message);
    }
  }
  componentWillUnmount = async () => KeepAwake.deactivate();
  requestWritePermission = async () => {
    try {
      await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE)
      .then(result => {
        // todo add Platform, request permission for ios
        switch (result) {
          case RESULTS.UNAVAILABLE:
          console.log(
            'This feature is not available (on this device / in this context)',
          );
          break;
          case RESULTS.DENIED:
          console.log(
            'The permission has not been requested / is denied but requestable',
          );
          request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then(result => {
            console.log('Permission requested', result);
          });
          break;
          case RESULTS.GRANTED:
          console.log('The permission is granted');
          break;
          case RESULTS.BLOCKED:
          console.log('The permission is denied and not requestable anymore');
          break;
        }
      })
      .catch(error => {
        console.log('write permission error:', error);
    });
    } catch (err) {
      console.warn(err);
    }
  }
  networkCheck = () => {
    NetInfo.fetch().then(state => {
      // console.warn("Connection type", state.type);
      // console.warn("Is connected?", state.isConnected);
      !state.isConnected ? Toast.showWithGravity(I18n.t("ERROR_NO_INTERNET","Error: No internet connection!"), Toast.LONG, Toast.TOP) : '';
    });
  }
  checkFileSystem = async () => {
    try {
      // first we need to request write permission
      await this.requestWritePermission();
      // check if Project directory exist
      const dirs = await RNFetchBlob.fs.dirs;
      // check if BooksOnWall directory exist , we are using here the name given to the project
      // ex: ./react-bow init MyProject https://api.myproject.xx  project name is MyProject
      // if not we create the directory in user Documents directory
      //console.log(dirs);
      // we have to choose where to store the story , some pĥone have sdcard some other not
      // we also need th check if we have enough space to store the datas
      let AppDir = '';
      // check free space
      await RNFS.getFSInfo()
      .then ((info) => {
        console.log('info', info);
      });
      //Check if sdcard exist
      await RNFS.exists(dirs.SDCardApplicationDir)
      .then( (exists) => {
          if (exists) {
              console.log("SD Card exist");
               AppDir = dirs.SDCardApplicationDir +'/'+ this.state.appName;
          } else {
              console.log("SD Card is not available we need to install inside memory card");
              AppDir = dirs.DocumentDir +'/'+ this.state.appName;
          }
      });
      if (AppDir === '')  Toast.showWithGravity(I18n.t("ERROR_ACCESS_FILESYSTEM","Error: No access to your filesystem to install the application!"), Toast.LONG, Toast.TOP);

      // check if directory to store .zip exist
      await RNFS.exists(AppDir)
      .then( (exists) => {
          if (exists) {
              console.log("Directory exist");
          } else {
              console.log("Directory need to be created");
              RNFetchBlob.fs.mkdir(AppDir).then((result) => {
                RNFetchBlob.fs.mkdir(AppDir+'/stories').then((result) => {
                }).catch((err) => {
                  console.log('mkdir err', err)
                });
              }).catch((err) => {
                console.log('mkdir err', err)
              });
          }
      });
      this.setState({AppDir: AppDir});
    } catch(e) {
      console.log(e);
    }

  }
  checkPermissions = async () => {
    try {
      await request(
        Platform.select({
          android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
          ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
        }),
      );
      await request(
        Platform.select({
          android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        }),
      );
      await RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({interval: 10000, fastInterval: 500})
        .then(data => {
          // The user has accepted to enable the location services
          // data can be :

          //console.warn(data);
          //  - "already-enabled" if the location services has been already enabled
          //  - "enabled" if user has clicked on OK button in the popup
        }).catch(err => {
          console.warn(err);
          // The user has not accepted to enable the location services or something went wrong during the process
          // "err" : { "code" : "ERR00|ERR01|ERR02", "message" : "message"}
          // codes :
          //  - ERR00 : The user has clicked on Cancel button in the popup
          //  - ERR01 : If the Settings change are unavailable
          //  - ERR02 : If the popup has failed to open
        });
    } catch(e) {
      console.log(e);
    }

  }
  handleLocales = async () => this.locales = RNLocalize.getLocales()
  statFirstRun = async () => {
    const {debug_mode,server, AppDir} = this.state;
    if(!debug_mode) {
      const statURL = server + '/stat';
      console.log("statURL",statURL);
      const stat = {
        name: "new install",
        sid: null,
        ssid: null,
        values: null,
        data : {
          appDir: AppDir,
          uniqueId: getUniqueId(),
          systemVersion: getSystemVersion(),
          usedMemory: getUsedMemory().then(usedMemory => usedMemory),
          getFirstInstallTime: getFirstInstallTime().then(firstInstallTime => firstInstallTime),
          useragent: getUserAgent().then(userAgent => userAgent),
          deviceType: getDeviceType(),
          manufacturer: getManufacturer().then(manufacturer => manufacturer),
          supportedProc: supportedAbis().then(abis => abis),
          isLOcationEnbled: isLocationEnabled().then(enabled => enabled), // true or false
          android: getAndroidId().then(androidId => androidId), // androidId here
          is_camera_prensent: isCameraPresent().then(isCameraPresent => isCameraPresent()).catch(cameraAccessException => {
            // is thrown if a camera device could not be queried or opened by the CameraManager on Android
          }),
          locale: RNLocalize.getLocales()[0],
        },
      };
      console.log(stat);
      try {
        await fetch( statURL , {
          method: 'POST',
          headers: {'Access-Control-Allow-Origin': '*', credentials: 'same-origin', 'Content-Type':'application/json'},
          body: JSON.stringify(stat)
        })
        .then(response => {
          if (response && !response.ok) { throw new Error(response.statusText);}
          return response.json();
        })
        .then(data => {
            if(data) {
              Toast.showWithGravity(I18n.t("Receiving_data", "Receiving data"), Toast.SHORT, Toast.TOP);
            } else {
              Toast.showWithGravity(I18n.t("NO_DATA", "No Data received from the server"), Toast.LONG, Toast.TOP);
            }
        })
        .catch((error) => {
          // Your error is here!
          console.error(error);
        });
      } catch(e) {
        console.log(e.message);
      }
    }
  }
  loadStories = async () => {
    const {debug_mode, storiesURL, storiesAllURL} = this.state;
    const loadURL = (!debug_mode) ? SERVER_URL + '/storiesPublished' : SERVER_URL + '/stories' ;
    console.log('loadURL',loadURL);
    console.log('debug_mode',debug_mode);
    try {
      this.setState({isLoading: true});
      Toast.showWithGravity('Loading', Toast.SHORT, Toast.TOP);
      await this.networkCheck();
      await fetch( loadURL , {
        method: 'get',
        headers: {'Access-Control-Allow-Origin': '*', credentials: 'same-origin', 'Content-Type':'application/json'}
      })
      .then(response => {
        if (response && !response.ok) { throw new Error(response.statusText);}
        return response.json();
      })
      .then(data => {
          if(data) {
            Toast.showWithGravity(I18n.t("Receiving_data", "Receiving data"), Toast.SHORT, Toast.TOP);
            return this.storeStories(data.stories);
          } else {
            Toast.showWithGravity(I18n.t("NO_DATA", "No Data received from the server"), Toast.LONG, Toast.TOP);
          }
      })
      .catch((error) => {
        // Your error is here!
        console.error(error);
      });
    } catch(e) {
      console.warn(e);
    }
  }
  storeStories = async (stories) => {
    try {
      // create banner folder
      const bannerPath = this.state.AppDir+'/banner';
      let sts = [];
      await RNFetchBlob.fs.exists(bannerPath)
      .then( (exists) => {
          console.log('banner exist:', exists);
          if (exists === false) {
              RNFetchBlob.fs.mkdir(bannerPath).then((result) => {
                // banner folder created successfully
                Toast.showWithGravity(I18n.t("Creating_banners","Creating banners ..."), Toast.SHORT, Toast.TOP);
              }).catch((err) => {
                console.log('mkdir err', err)
              });
          }
      });
      // check each story and install story banner
      // downloading banners and added mobile storage path for banner

      stories.map((story, i) => {
        let st = story;
        if (story.design_options) {
          let theme = JSON.parse(story.design_options);
          theme = (typeof(theme) === 'string') ? JSON.parse(theme) : theme;
          st['theme'] = theme;
          const path = theme.banner.path;
          const name = theme.banner.name;
          const url = this.state.server +'/'+ path;
          const filePath = bannerPath + '/'+ name;
          st['theme']['banner']['filePath'] = 'file://' + filePath;
          let dirs = RNFetchBlob.fs.dirs;
          RNFetchBlob.config({
            // response data will be saved to this path if it has access right.
            path : filePath
          })
          .fetch('GET', url, {
            'Access-Control-Allow-Origin': '*',
            credentials: 'same-origin',
            'Content-Type':'application/json'
          })
          .then((res) => {
            // the path should be dirs.DocumentDir + 'path-to-file.anything'
            console.log('The file saved to ', res.path())
          });
        }
        sts.push(st);
      });
      // store stories list in Stories.json file
      await RNFS.writeFile(this.state.AppDir+'/Stories.json', JSON.stringify(sts), 'utf8')
      .then((success) => {
        Toast.showWithGravity(I18n.t("Installation_complete","Installation complete"), Toast.SHORT, Toast.TOP);
      })
      .catch((err) => {
        console.log(err.message);
      });
      this.setState({stories: sts, isLoading: false, FirstRun: false});

      return sts;
    } catch(e) {
      console.log(e.message);
    }
  }
  render() {

    if (this.state.FirstRun) {
      return (

        <SafeAreaProvider>
          <SafeAreaView style={styles.container} forceInset={{ top: 'always', bottom: 'always' }}>
            <Overlay
              isVisible={this.state.FirstRun}
              windowBackgroundColor="rgba(255, 255, 255, .3)"
              overlayBackgroundColor="red"
              width="auto"
              height="auto"
            >
              <Text>{I18n.t("Hello_please_wait", "Hello please wait, we are installing the application")}</Text>

            </Overlay>
            <ActivityIndicator size="large" color="#0000ff" />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
    return ( <SafeAreaProvider><AppContainer screenProps={this.state} setState={this.setState} loadStories={this.loadStories}/></SafeAreaProvider> );
  }
}
const styles = StyleSheet.create({
  container: {
    flex:1,
    alignItems: 'center',
    alignContent:'center',
    flexDirection: 'row',
    flexWrap:'wrap',
    justifyContent:'center',
  }
});
