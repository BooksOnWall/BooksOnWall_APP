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
//import NavigationView from './src/api/stories/stage/NavigationView';
import ToStage from './src/api/stories/stage/toStage';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import SplashScreen from 'react-native-splash-screen';
import FirstRun from './src/api/firstRun/FirstRun';
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
        //await this.networkCheck();
        await this.checkPermissions();
        await this.checkFileSystem();
        await this.loadStories();
        SplashScreen.hide();
      }
    } catch (e) {
      console.warn(e);
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
      !state.isConnected ? console.error('No internet connection') : '';
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
        console.log("Free Space is" + info.freeSpace / 1024 + "KB")
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
      console.log(AppDir);
      if (AppDir === '') console.log('error AppDir is not defined');

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
      console.log('AppDir',AppDir);
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
            console.table(data.stories);
            return this.setState({stories: data.stories, isLoading: false});
          } else {
            console.log('No Data received from the server');
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
  render() {
    if (this.state.isLoading) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
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
