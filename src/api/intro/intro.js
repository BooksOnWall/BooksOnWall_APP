import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import I18n from "../../utils/i18n";
import AppIntroSlider from 'react-native-app-intro-slider';
import { Images } from '../../../assets/intro';

const slides = [
  {
    key: 'p1',
    title: I18n.t("Welcome","Welcome"),
    text: I18n.t("Invite","We invite you to explore a story."),
    image: Images['image1'],
    backgroundColor: '#59b2ab',
  },
  {
    key: 'p2',
    title:  I18n.t("Each_story","Each story"),
    text: I18n.t("discover","has many walls to discover"),
    image: Images['image2'],
    backgroundColor: '#febe29',
  },
  {
    key: 'p3',
    title: I18n.t("Each_wall","Each wall"),
    text: I18n.t("reveal","has many secrets to reveal"),
    image: Images['image3'],
    backgroundColor: '#22bcb5',
  },
  {
    key: 'p4',
    title: I18n.t("Enjoy","Enjoy it"),
    text: I18n.t("Press","Press done to start"),
    image: Images['image4'],
    backgroundColor: '#22bcb5',
  }
];
const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
  },
  text: {
    color: 'black',
    backgroundColor: 'transparent',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    color: 'black',
    backgroundColor: 'transparent',
    textAlign: 'center',
    marginBottom: 16,
  }
});

export default class Intro extends Component {
  static navigationOptions = {
    headerShown: false,
  };

  renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <ImageBackground source={item.image} style={{width: '100%', height: '100%'}}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
        </ImageBackground>
      </View>
    );
  }
  onDone = () => this.props.navigation.navigate('Stories');
  render() {

      return (
        <AppIntroSlider renderItem={this.renderItem} slides={slides} onDone={this.onDone}/>
      );
    }

}
