import React , { Component } from 'react';
if(__DEV__) {
  import('./src/utils/ReactotronConfig').then(() => console.log('Reactotron Configured'));
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeAreaView from 'react-native-safe-area-view';
import { TouchableOpacity, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { fromRight } from 'react-navigation-transitions';
import ToAr from './src/api/stories/stage/toAr';
import Intro from './src/api/intro/intro';
import Stories from './src/api/stories/Stories';
import Story from './src/api/stories/Story';
import Stages from './src/api/stories/stages/Stages';
import Stage from './src/api/stories/stage/Stage';
import ToStage from './src/api/stories/stage/toStage';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import SplashScreen from 'react-native-splash-screen';
import Icon from 'react-native-vector-icons/Ionicons';
import * as RNLocalize from "react-native-localize";
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';
import NetInfo from "@react-native-community/netinfo";
import { Overlay } from 'react-native-elements';
import { VIROAPI_KEY, MAPBOX_KEY, SERVER_URL, PROJECT_NAME  } from 'react-native-dotenv';
import KeepAwake from 'react-native-keep-awake';
import Toast from 'react-native-simple-toast';

const MainNavigator = createStackNavigator({
  Intro: { screen: Intro},
  Stories: { screen: Stories},
  Story: { screen: Story},
  Stages: { screen: Stages},
  Stage: { screen: Stage},
  ToStage: {screen: ToStage},
  ToAr: {screen: ToAr}
},
{
    initialRouteName: 'Intro',
    navigationOptions: {
      headerShown: false
    }

});
const AppContainer = createAppContainer(MainNavigator);


export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viroapikey: VIROAPI_KEY,
      mapboxkey: MAPBOX_KEY,
      server: SERVER_URL,
      appName: PROJECT_NAME,
      AppDir: '',
      FirstRun: false,
      stories: [],
      storiesURL: SERVER_URL + '/stories',
      isLoading: false,
    };
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
      let StoryFile = this.state.AppDir+'/Stories.json';
      await RNFS.exists(StoryFile)
      .then( (exists) => {
          if (!exists) {
            this.setState({FistRun: true})
            Toast.showWithGravity('Please wait while we are installing your application !', Toast.LONG, Toast.TOP);
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
      !state.isConnected ? Toast.showWithGravity('Error: No internet connection!', Toast.LONG, Toast.TOP) : '';
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
      console.log('dirs', dirs);
      // we have to choose where to store the story , some pĥone have sdcard some other not
      // we also need th check if we have enough space to store the datas
      let AppDir = '';
      // check free space
      await RNFS.getFSInfo()
      .then ((info) => {
        console.log('info', info);
      });
      //Check if sdcard exist
      await RNFS.exists(dirs.SDCardDir)
      .then( (exists) => {
          if (exists) {
              console.log("SD Card exist");
               AppDir = dirs.SDCardApplicationDir +'/'+ this.state.appName;
          } else {
              console.log("SD Card is not available we need to install inside memory card");
              AppDir = dirs.MainBundleDir +'/'+ this.state.appName;
          }
      });
      if (AppDir === '')  Toast.showWithGravity('Error: No access to your filesystem to install the application!', Toast.LONG, Toast.TOP);

      // check if directory to store .zip exist
      await RNFS.exists(AppDir)
      .then( (exists) => {
          if (exists) {
              console.log("Directory exist");
          } else {
              console.log("Directory need to be created");
              RNFS.mkdir(AppDir).then((result) => {
                console.log('mkdir result', result)
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
      await RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({interval: 10000, fastInterval: 5000})
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
  handleLocales = async () => {
    this.locales = RNLocalize.getLocales();
  }
  loadStories = async () => {
    try {
      this.setState({isLoading: true});
      await this.networkCheck();
      await fetch(this.state.storiesURL, {
        method: 'get',
        headers: {'Access-Control-Allow-Origin': '*', credentials: 'same-origin', 'Content-Type':'application/json'}
      })
      .then(response => {
        if (response && !response.ok) { throw new Error(response.statusText);}
        return response.json();
      })
      .then(data => {
          if(data) {
            return this.storeStories(data.stories);
          } else {
            Toast.showWithGravity('No Data received from the server', Toast.LONG, Toast.TOP);
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
      await RNFS.exists(bannerPath)
      .then( (exists) => {
          if (!exists) {
              RNFS.mkdir(bannerPath).then((result) => {
                // banner folder created successfully
              }).catch((err) => {
                console.log('mkdir err', err)
              });
          }
      });
      // check each story and install story banner
      // downloading banners and added mobile storage path for banner
      let sts = [];
      stories.map((story, i) => {
        let st = story;
        let theme = JSON.parse(story.design_options);
        theme = (typeof(theme) === 'string') ? JSON.parse(theme) : theme;
        st['theme'] = theme;
        const path = theme.banner.path;
        const name = theme.banner.name;
        const url = this.state.server +'/'+ path;
        const filePath = bannerPath + '/'+ name;
        st['theme']['banner']['filePath'] = 'file://' + filePath;
        const {id, promise} = RNFS.downloadFile({
          fromUrl: url,
          toFile: filePath,
          background: false,
          cacheable: false,
          connectionTimeout: 60 * 1000,
          readTimeout: 120 * 1000
        });
        sts.push(st);
      });
      // store stories list in Stories.json file
      await RNFS.writeFile(this.state.AppDir+'/Stories.json', JSON.stringify(sts), 'utf8')
      .then((success) => {
        Toast.showWithGravity('Storing stories ...', Toast.SHORT, Toast.TOP);
      })
      .catch((err) => {
        console.log(err.message);
      });
      this.setState({stories: sts, isLoading: false, FirstRun: false});
    } catch(e) {
      console.log(e.message);
    }
  }
  render() {

    if (this.state.FirstRun) {
      return (

        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <Overlay
              isVisible={this.state.FirstRun}
              windowBackgroundColor="rgba(255, 255, 255, .5)"
              overlayBackgroundColor="red"
              width="auto"
              height="auto"
            >
              <Text>Hello please wait, we are installing the application</Text>

            </Overlay>
            <ActivityIndicator size="large" color="#0000ff" />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
    return ( <SafeAreaProvider><AppContainer screenProps={this.state} setState={this.setState} /></SafeAreaProvider> );
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
