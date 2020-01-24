import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import I18n from "../../utils/i18n";
import AppIntroSlider from 'react-native-app-intro-slider';
const slides = [
  {
    key: 'p1',
    title: I18n.t("Welcome","Welcome"),
    text: I18n.t("Invite","We invite you to explore a story."),
    image: require('./img/bow-slider-bg_c01.jpg'),
    backgroundColor: '#59b2ab',
  },
  {
    key: 'p2',
    title:  I18n.t("Each_story","Each story"),
    text: I18n.t("discover","has many walls to discover"),
    image: require('./img/bow-slider-bg_c02.jpg'),
    backgroundColor: '#febe29',
  },
  {
    key: 'p3',
    title: I18n.t("Each_wall","Each wall"),
    text: I18n.t("reveal","has many secrets to reveal"),
    image: require('./img/bow-slider-bg_c03.jpg'),
    backgroundColor: '#22bcb5',
  },
  {
    key: 'p4',
    title: I18n.t("Enjoy","Enjoy it"),
    text: I18n.t("Press","Press done to start"),
    image: require('./img/bow-slider-bg_c04.jpg'),
    backgroundColor: '#22bcb5',
  }
];
const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  image: {
    width: 320,
    height: 320,
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
        <Text style={styles.title}>{item.title}</Text>
        <Image source={item.image} />
        <Text style={styles.text}>{item.text}</Text>
      </View>
    );
  }
  onDone = () => {
    this.props.navigation.navigate('Stories');
  }
  render() {

      return (
        <AppIntroSlider renderItem={this.renderItem} slides={slides} onDone={this.onDone}/>
      );
    }

}
