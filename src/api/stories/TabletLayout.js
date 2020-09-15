import React, {Component, useState, useEffect, useCallback} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { RefreshControl, Platform, ImageBackground, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, TouchableOpacity, TouchableNativeFeedback } from 'react-native';
import { Button, Header, Card, ListItem, ThemeProvider } from 'react-native-elements';
import Drawer from 'react-native-drawer'
import { Banner } from '../../../assets/banner';
import Story from './Story';
import TabletDefault from './TabletDefault';


export default class TabletLayout extends Component {
  static navigationOptions = {
    title: 'Stories landscape',
    headerShown: false
  };
  closeControlPanel = () => {
    this._drawer.close();
  };
  openControlPanel = () => {
    this._drawer.open();
  };
  constructor(props) {
    super(props);
    let stories = this.props.screenProps.stories;
    this.state = {
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      appDir: this.props.screenProps.AppDir,
      stories: stories,
      story: null,
      granted: Platform.OS === 'ios',
      storyId: null,
      refreshing: false,
      isTablet: this.props.screenProps.isTablet,
      transportIndex: 0,
      reloadLoading: false,
      dlIndex: null,
    };
  }
  componentDidUpdate(prevProps, prevState) {
    if (prevState.story !== this.state.story) {
      this.setState({refreshing: true});
    }
  }
  stopRefresh = () => this.setState({refreshing: false})
  renderStory = (story) => {
    this.setState({story: story});
  }
  renderStories = () => {
    let {stories} = this.state;
    const default_theme = {
      font1: 'TrashHand',
      font2: 'ATypewriterForMe',
      font3: 'OpenSansCondensed-ligth',
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
   stories = stories.map ((story) => {
       story['theme'] = (story.theme) ? story.theme : default_theme;
       story['banner_default'] = (story.theme && story.theme.banner.filePath) ? {uri: story.theme.banner.filePath} : Banner['banner_default'];
       return story;
   });
    return (
      <ScrollView style={styles.scrollView}>
      {
        stories.map((story, i) => (
          <TouchableOpacity key={'tb'+i} onPress={() => this.renderStory(story)}>
            <ImageBackground key={'b'+i} source={story.banner_default} imageStyle={{opacity: .6}} style={{width: '100%', height: 'auto', backgroundColor: story.theme.color1}}>
              <ListItem
                containerStyle={{backgroundColor: 'transparent', flex: 1, justifyContent: 'center', alignItems: 'center', alignContent: 'flex-start', backgroundColor: 'transparent', }}
                style={styles.listItem}
                key={'l'+i}
                title={story.title}
                titleStyle={{ color: 'white', fontFamily: story.theme.font1, fontSize: 26, textAlign: 'center', letterSpacing: 1, margin: 0, paddingBottom:0, paddingLeft: 35, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2}}
                subtitle={story.city+' • '+story.state}
                subtitleStyle={{ color: 'white', fontFamily: "ATypewriterForMe", fontSize: 14, textAlign: 'center', letterSpacing: 0, margin: 0, paddingLeft:35, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1 }}
                onPress={() => this.renderStory(story)}
                bottomDivider
                chevron
              />
            </ImageBackground>
          </TouchableOpacity>
      ))
      }
      </ScrollView>
    );
  }
  render() {
    return (
      <Drawer
        type="static"
        ref={(ref) => this._drawer = ref}
        content={this.state.story ? <Story story={this.state.story} state={this.state} navigation={this.props.navigation} /> : <TabletDefault style={styles.story}/>}
        open={true}
        openDrawerOffset={100}
        styles={drawerStyles}
        tweenHandler={Drawer.tweenPresets.parallax}
        >
        {this.renderStories()}
      </Drawer>
    );
  }
}
const drawerStyles = {
  drawer: { shadowColor: '#000000', shadowOpacity: 0.8, shadowRadius: 3},
  main: {paddingLeft: 3},
};
const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: 'transparent',
  },
  story: {
    flex: 1,
    backgroundColor: '#000',
    color: '#FFF',
  },
  wrapList: {
    paddingBottom: 85
  },
  listItem: {
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
  reload: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, .12)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0
  }
});
