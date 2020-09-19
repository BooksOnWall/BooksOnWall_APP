import React, {Component, useState, useCallback} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { RefreshControl, Platform, ImageBackground, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, TouchableOpacity, TouchableNativeFeedback } from 'react-native';
import { Button, Header, Card, ListItem, ThemeProvider } from 'react-native-elements';
import Orientation from 'react-native-orientation';

import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY , DEBUG_MODE } from '@env';
import  distance from '@turf/distance';
import * as RNFS from 'react-native-fs';

import KeepAwake from 'react-native-keep-awake';
import I18n from "../../utils/i18n";
import Icon from "../../utils/Icon";
import Toast from 'react-native-simple-toast';
import { Banner } from '../../../assets/banner';
import NetInfo from "@react-native-community/netinfo";
import RNFetchBlob from 'rn-fetch-blob';

function wait(timeout) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}
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
ListStories = (props) => {
  // if theme or banner are empty and for dev purpose put default banner
  const default_theme = {
    font1: 'TrashHand',
    font2: 'ATypewriterForMe',
    font3: 'Roboto-Regular',
    banner: {
      name: null,
      path: null,
      size: null,
      type: null
    },
    gallery: [],
    color1: '#9E1C00',
    color2: '#4B4F53',
    color3: '#D1D2D3'
  };
 let stories = props.stories.map ((story) => {
     story['theme'] = (story.theme) ? story.theme : default_theme;
     story['banner_default'] = (story.theme && story.theme.banner.filePath) ? {uri: story.theme.banner.filePath} : Banner['banner_default'];
     return story;
 });

  return (

      <View >
      {
        stories.map((story, i) => (
          <TouchableOpacity key={'tb'+i} onPress={() => props.navigate('Story', {story: story, storiesUpdate: props.storiesUpdate})}>
            <ImageBackground key={'b'+i} source={story.banner_default} imageStyle={{opacity: .6}} style={{width: '100%', height: 'auto', backgroundColor: story.theme.color1}}>
              <ListItem
                containerStyle={{backgroundColor: 'transparent', flex: 1, justifyContent: 'center', alignItems: 'center', margin: 0, alignContent: 'flex-start', backgroundColor: 'transparent', }}
                style={styles.listItem}
                key={'l'+i}
                title={story.title}
                titleStyle={{ color: 'white', fontFamily: story.theme.font1, fontSize: 28, textAlign: 'center', letterSpacing: 1, margin: 0, paddingBottom:0, paddingLeft: 35, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2}}
                subtitle={story.city+' • '+story.state}
                subtitleStyle={{ color: 'white', fontFamily: "ATypewriterForMe", fontSize: 12, textAlign: 'center', letterSpacing: 0, margin: 0, paddingLeft:35, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1 }}
                onPress={() => props.navigate('Story', {story: story, storiesUpdate: props.storiesUpdate})}
                bottomDivider
                chevron
              />
              </ImageBackground>
              </TouchableOpacity>
      ))
      }
      </View>

  );
}
export default class Stories extends Component {
  static navigationOptions = {
    title: 'Stories',
    headerShown: false
  };

  constructor(props) {
    super(props);
    let stories = this.props.screenProps.stories;
    this.state = {
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      appDir: this.props.screenProps.AppDir,
      debug_mode: (DEBUG_MODE && DEBUG_MODE === "true") ? true : false,
      stories: stories,
      storiesURL: this.props.screenProps.storiesURL,
      storiesAllURL: this.props.screenProps.storiesAllURL,
      bannerPath: this.props.screenProps.AppDir + '/banner/',
      granted: Platform.OS === 'ios',
      isTablet: this.props.screenProps.isTablet,
      isLandscape: null,
      transportIndex: 0,
      reloadLoading: false,
      dlIndex: null,
      access_token: MAPBOX_KEY,
    };
    this.storiesUpdate = this.storiesUpdate.bind(this);
    this.storiesCheck = this.storiesCheck.bind(this);
  }
  _orientationDidChange = (orientation) => {
    if (orientation === 'LANDSCAPE') {
      this.setState({isLandscape: false});
    } else {
      this.setState({isLandscape: true});
      (this.state.isTablet && this.state.isLandscape) ? this.props.navigation.navigate('TabletLayout') : null;
    }
  }
  componentDidMount = async () => {
    // if tablet and landscape navigate to tabletLayout

    try {

      const initial = await Orientation.getInitialOrientation();
      if (initial === 'PORTRAIT') {
        this.setState({isLandscape: false});
      } else {
        this.setState({isLandscape: true});
      }
      Orientation.unlockAllOrientations();
      Orientation.addOrientationListener(this._orientationDidChange);
      console.log('is tablet',this.props.screenProps.isTablet);
      console.log('is landscape',this.state.isLandscape);

      (this.state.isTablet && this.state.isLandscape) ? this.props.navigation.navigate('TabletLayout') : null;

      await KeepAwake.activate();
      // await this.getCurrentLocation();
      await this.storiesCheck();
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => {
    await KeepAwake.deactivate();
    Orientation.getOrientation((err, orientation) => {
      console.log(`Current Device Orientation: ${orientation}`);
    });
    // Remember to remove listener
   Orientation.removeOrientationListener(this._orientationDidChange);
  }
  storiesCheck = async () => {
    let stories = this.state.stories;
    try {
      let st = [];
      for (let story of stories) {
        story.isInstalled = await this.isInstalled(story.id);
        st.push(story);
      }
      this.setState({stories: st, reloadLoading: false});

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
  networkCheck = () => {
    NetInfo.fetch().then(state => {
      // console.warn("Connection type", state.type);
      // console.warn("Is connected?", state.isConnected);
      !state.isConnected ? Toast.showWithGravity(I18n.t("ERROR_NO_INTERNET","Error: No internet connection!"), Toast.LONG, Toast.TOP) : '';
    });
  }
  loadStories = async () => {
    const {debug_mode,storiesURL, storiesAllURL } = this.state;
    const loadURL = (!debug_mode) ? storiesURL: storiesAllURL;
    console.log('loadURL',loadURL);
    console.log('debug_mode',typeof(debug_mode));
    try {
      await this.networkCheck();
      Toast.showWithGravity(I18n.t("Loading","Loading"), Toast.SHORT, Toast.TOP);
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
            return this.storeStories(data.stories);
          } else {
            Toast.showWithGravity(I18n.t("NO_DATA","No Data received from the server"), Toast.LONG, Toast.TOP);
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
      const bannerPath = this.state.appDir+'/banner';
      let sts = [];
      await RNFetchBlob.fs.exists(bannerPath)
      .then( (exists) => {
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
            // console.log('The file saved to ', res.path())
          });
        }
        sts.push(st);
      });
      // store stories list in Stories.json file
      await RNFS.writeFile(this.state.appDir+'/Stories.json', JSON.stringify(sts), 'utf8')
      .then((success) => {
        Toast.showWithGravity(I18n.t("Update_complete","Update complete"), Toast.SHORT, Toast.TOP);
      })
      .catch((err) => {
        console.log(err.message);
      });
      this.setState({stories: sts, reloadLoading: false});
      return sts;
    } catch(e) {
      console.log(e.message);
    }
  }
  storiesUpdate = async () => {
    try {
      await this.setState({reloadLoading: true});
      await this.loadStories();
      return this.storiesCheck();
    } catch(e) {
      console.log(e.message);
    }
  }

  render() {

    const {stories} = this.state;
    const {navigate} = this.props.navigation;
    if (!stories) {
      return (
          <SafeAreaView style={styles.container}>
            <ActivityIndicator size="large" color="#434343" />
          </SafeAreaView>
      );
    }
    const size = 36;
    return (
      <ThemeProvider>
        <SafeAreaView style={styles.container} forceInset={{ top: 'always', bottom: 'always' }}>
        <ImageBackground  style={{width: 'auto', height: '100%', backgroundColor: '#C8C1B8'}} >
          <Header
            containerStyle={{ backgroundColor: '#C8C1B8', justifyContent: 'space-around', paddingBottom: 23 }}
            centerComponent={<Icon name='bow-logo' size={22} containerStyle={styles.logoContainer} style={styles.logo}/>}
            rightComponent={<TouchableOpacity style={styles.reload}  onPress={() => this.storiesUpdate()}>
            <Button type='clear' underlayColor='#FFFFFF' loading={this.state.loading} onPress={() => this.storiesUpdate()} iconContainerStyle={{ height: 26, width: 26}} icon={{name:'reload', size:24, color:'#887B72', type:'booksonwall'}} ></Button>
            </TouchableOpacity>}
            />

          <Card style={styles.card} containerStyle={{padding: 0, margin: 0, borderWidth: 0, backgroundColor: 'transparent'}}>
          <ScrollView refreshControl={<RefreshControl progressBackgroundColor={'#8C1B8'} progressViewOffset={25} refreshing={this.state.reloadLoading} onRefresh={this.storiesUpdate} /> } style={styles.scrollView} onScrollToTop={() => this.storiesUpdate()}>
            <View style={styles.wrapList} >
              <ListStories storiesUpdate={this.storiesUpdate} loadStories={this.loadStories} storeStories={this.storeStories} stories={stories} navigate={navigate} />
              </View>
          </ScrollView>
          </Card>
          </ImageBackground >
        </SafeAreaView>

      </ThemeProvider>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 0,
    justifyContent: 'flex-start',
    alignItems: "stretch",
    backgroundColor: '#D8D8D8',
  },
  card: {
    margin: 0,
    padding: 0,
  },
  scrollView: {
    marginHorizontal: 0,
    backgroundColor: 'transparent',
  },
  wrapList: {
    paddingBottom: 85
  },
  listItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'flex-start',
    backgroundColor: 'transparent',
    minHeight: 180,
  },
  listItemBackground: {
    width: '100%',
    height: 'auto',
  },
  bold: {
    fontWeight: '900'
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    backgroundColor: "whitesmoke"
  },
  logo: {
    minHeight: 20,
    color: '#91201F',
    fontSize: 23,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  logoContainer:{
    backgroundColor: '#fff'
  },
  reload: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, .12)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0
  }
});
