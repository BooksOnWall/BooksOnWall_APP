import React, {Component} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Platform, ImageBackground, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, TouchableOpacity, TouchableNativeFeedback } from 'react-native';
import { Button, Header, Card, ListItem, ThemeProvider } from 'react-native-elements';
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY  } from 'react-native-dotenv';
import  distance from '@turf/distance';
import * as RNFS from 'react-native-fs';
import Reactotron from 'reactotron-react-native';
import KeepAwake from 'react-native-keep-awake';
import I18n from "../../utils/i18n";
import Icon from "../../utils/Icon";
import Toast from 'react-native-simple-toast';
import { Banner } from '../../../assets/banner';

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
    font2: 'BadScript-Regular',
    font3: 'ATypewriterForMe',
    banner: {
      name: null,
      path: null,
      size: null,
      type: null
    },
    gallery: [],
    color1: '#9E1C00',
    color2: '#D1D2D3',
    color3: '#4B4F53'
  };
 let stories = props.stories.map ((story) => {
     story['theme'] = (story.theme) ? story.theme : default_theme;
     story['banner_default'] = (story.theme && story.theme.banner.filePath) ? {uri: story.theme.banner.filePath} : Banner['banner_default'];
     return story;
 });


  return (
    <TouchableOpacity onPress={() => props.navigate('Story', {story: story})}>
      <View >
      {
        stories.map((story, i) => (

            <ImageBackground key={'b'+i} source={story.banner_default} imageStyle={{opacity: .6}} style={{width: '100%', height: 'auto', backgroundColor: story.theme.color1}}>
              <ListItem
                containerStyle={{backgroundColor: 'transparent', flex: 1, justifyContent: 'center', alignItems: 'center', alignContent: 'flex-start', backgroundColor: 'transparent', }}
                style={styles.listItem}
                key={'l'+i}
                title={story.title}
                titleStyle={{ color: 'white', fontFamily: story.theme.font1, fontSize: 26, textAlign: 'center', letterSpacing: 1, margin: 0, paddingBottom:0, paddingLeft: 35, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2}}
                subtitle={story.city+' • '+story.state}
                subtitleStyle={{ color: 'white', fontFamily: "ATypewriterForMe", fontSize: 14, textAlign: 'center', letterSpacing: 0, margin: 0, paddingLeft:35, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1 }}
                onPress={() => props.navigate('Story', {story: story})}
                bottomDivider
                chevron
              />
              </ImageBackground>
      ))
      }
      </View>
      </TouchableOpacity>
  );
}
export default class Stories extends Component {
  static navigationOptions = {
    title: 'Story',
    headerShown: false
  };
  constructor(props) {
    super(props);
    let stories = this.props.screenProps.stories;
    this.state = {
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      appDir: this.props.screenProps.AppDir,
      stories: stories,
      bannerPath: this.props.screenProps.AppDir + '/banner/',
      granted: Platform.OS === 'ios',
      transportIndex: 0,
      dlIndex: null,
      access_token: MAPBOX_KEY,
    };
    this.storiesUpdate = this.storiesUpdate.bind(this);
    this.storiesCheck = this.storiesCheck.bind(this);
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      // await this.getCurrentLocation();
      await this.storiesCheck();
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => KeepAwake.deactivate();
  storiesCheck = async () => {
    let stories = this.state.stories;
    try {
      let st = [];
      for (let story of stories) {
        story.isInstalled = await this.isInstalled(story.id);
        st.push(story);
      }
      this.setState({stories: st});
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
  storiesUpdate = async () => {
    try {
      Toast.showWithGravity('Stories update ...', Toast.SHORT, Toast.TOP);
      const stories = await this.props.loadStories();
      this.setState({stories: stories});
      Toast.showWithGravity('Updating stories ...', Toast.SHORT, Toast.TOP);
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
    return (
      <ThemeProvider>
        <SafeAreaView style={styles.container}>
          <Header
            containerStyle={{ backgroundColor: '#C8C1B8', justifyContent: 'space-around', borderWidth: 0, paddingTop: 25, paddingBottom: 25}}
            centerComponent={<Icon name='bow-logo' style={styles.logo}/>}
            rightComponent={<TouchableOpacity onPress={() => this.storiesUpdate()}><Button type="clear" onPress={() => this.storiesUpdate()} icon={
              <Icon
                name="reload-circle"
                size={46}
                color="white"
              />
            }></Button></TouchableOpacity>}
            />
          <Card style={styles.card} containerStyle={{padding: 0, margin: 0, borderWidth: 0, backgroundColor: 'transparent'}}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.wrapList} >
              <ListStories loadStories={this.loadStories} storeStories={this.storeStories} stories={stories} navigate={navigate} />
              </View>
          </ScrollView>
          </Card>

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
    minHeight: 136,
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
    color: '#9E1C00',
    fontSize: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  reload: {
    color: '#9b948e',
    fontSize: 35,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 7
  }
});
