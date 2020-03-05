import React, {Component} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Platform, ImageBackground, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager } from 'react-native';
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
  return (
    <ScrollView >
      {
        props.stories.map((story, i) => (
          <ImageBackground key={'b'+i} source={{uri: story.theme.banner.filePath}} style={styles.listItemBackground}>
            <ListItem
              containerStyle={{backgroundColor: 'transparent'}}
              style={styles.listItem}
              key={'l'+i}
              title={story.title}
              titleStyle={{ color: 'white', fontFamily: story.theme.font1, fontSize: 24, textAlign: 'center', letterSpacing: 2, paddingTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.85)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 5}}
              subtitle={story.city}
              subtitleStyle={{ color: 'white', fontFamily: story.theme.font2, fontSize: 13, textAlign: 'center', letterSpacing: 1, paddingBottom: 16 }}
              onPress={() => props.navigate('Story', {story: story})}
              bottomDivider
              chevron
            />
      </ImageBackground>
      ))
      }
    </ScrollView>
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

  render() {
    const {stories} = this.state;
    const {navigate} = this.props.navigation;
    if (!stories) {
      return (
          <SafeAreaView style={styles.container}>
            <ActivityIndicator size="large" color="#0000ff" />
          </SafeAreaView>
      );
    }
    return (
      <ThemeProvider>
        <SafeAreaView style={styles.container}>
          <Header
            containerStyle={{ backgroundColor: '#D8D8D8', justifyContent: 'space-around', borderWidth: 0, paddingTop: 25, paddingBottom: 25}}
            centerComponent={<Icon name='bow-logo' style={styles.logo}/>}
            rightComponent={<Icon raised reverse name='reload-circle' color='#f50' onPress={() => this.props.loadStories} style={styles.reload}  />}
            />
          <Card style={styles.card} containerStyle={{padding: 0, margin: 0, borderWidth: 0, backgroundColor: '#8c8c8c'}}>
              <ListStories loadStories={this.loadStories} storeStories={this.storeStories} stories={stories} navigate={navigate} />
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
    backgroundColor: '#D8D8D8',
  },
  scrollView: {
    marginHorizontal: 0,
    backgroundColor: '#D8D8D8',
  },
  listItem: {
    backgroundColor: 'transparent',
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
    fontSize: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  reload: {
    color: '#9E1C00',
    fontSize: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  }
});
