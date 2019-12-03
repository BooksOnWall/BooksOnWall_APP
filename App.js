import React , { Component } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { fromRight } from 'react-navigation-transitions';
import AR from './src/Ar';
import Intro from './src/api/intro/intro';
import Stories from './src/api/stories/Stories';
import Story from './src/api/stories/Story';
import Stages from './src/api/stories/stages/Stages';
import Stage from './src/api/stories/stage/Stage';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import SplashScreen from 'react-native-splash-screen';
import FirstRun from './src/api/firstRun/FirstRun';
import Icon from 'react-native-vector-icons/Ionicons';
import * as RNLocalize from "react-native-localize";


const AppNavigator = createStackNavigator({
    Intro: { screen: Intro},
    AR: { screen: AR},
    Stories: { screen: Stories},
    Stages: { screen: Stages},
  },
  {
    initialRouteName: 'Intro',
    transitionConfig: () => fromRight(),
    swipeEnabled: true,
    animationEnabled: true,
    headerMode: 'none',
    lazy: true,
    navigationOptions: {
      header: null,
    },
  });

const AppContainer = createAppContainer(AppNavigator);

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stories: [],
      storiesURL: 'https://api.booksonwall.art/stories',
      isLoading: false,
    };
  }
  componentDidMount = async () => {
    try {
      if(Platform.OS !== 'web') {
        await this.loadStories();
        SplashScreen.hide();
      }
    } catch (e) {
      console.warn(e);
    }
  }
  async handleLocales() {
    this.locales = RNLocalize.getLocales();
  }

  getLocale() {
    if (this.locales) {
      if (Array.isArray(this.locales)) {
        return this.locales[0];
      }
    }
    return null;
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
        <View style={styles.container}>
          <ActivityIndicator />
        </View>
      );
    }
    return (
        <AppContainer screenProps={this.state} setState={this.setState} />
    );
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
  },
});
