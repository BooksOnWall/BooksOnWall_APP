import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { Icon, registerCustomIconType } from 'react-native-elements';
import I18n from "../../utils/i18n";
import AppIntroSlider from 'react-native-app-intro-slider';
import { Images } from '../../../assets/intro';
import IconSet from '../../utils/Icon';
import Orientation from 'react-native-orientation';

registerCustomIconType('BooksonWall', IconSet);

const slides = [
  {
    key: 'p1',
    title: I18n.t("Welcome","BooksOnWall"),
    text: I18n.t("Invite","Welcome! We invite you to explore a story..."),
    image: Images['image1'],
    backgroundColor: '#D0CBC5',
    icon: 'isologo',
  },
  {
    key: 'p2',
    title:  I18n.t("Each_story","...each story has many walls to discover..."),
    text: I18n.t("discover","Soon in your city"),
    image: Images['image2'],
    backgroundColor: '#D0CBC5',
    icon: 'isologo',
  },
  {
    key: 'p3',
    title: I18n.t("Each_wall","...Each wall has many secrets to reveal..."),
    text: I18n.t("reveal","With art, music, animation..."),
    image: Images['image3'],
    backgroundColor: '#D0CBC5',
    icon: 'isologo',
  },
  {
    key: 'p4',
    title: I18n.t("Enjoy","Enjoy it"),
    text: I18n.t("Press","Choose the story next to you and begin the adventure."),
    image: Images['image4'],
    backgroundColor: '#D0CBC5',
    icon: 'isologo',
  },
  {
    key: 'p5',
    title: I18n.t("Bip","oh! please pay attention to the trafic, beep beep!"),
    text: I18n.t("Better_headphones","Better use a headphone."),
    icon: 'headphones',
    image: Images['image5'],
    backgroundColor: '#D0CBC5',
  }
];
const styles = StyleSheet.create({
  slide: {
    backgroundColor: '#D0CBC5',
    flex: 1,
    display: 'flex',
    position: 'relative',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
    top: 0,
    bottom: '45%',
  },
    text: {
    color: '#fff',
    backgroundColor: 'transparent',
    fontFamily: "RobotoCondensed-Bold",
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.1,
    paddingHorizontal: 70,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: .5, height: .5},
    textShadowRadius: 3,
    },
  title: {
    fontSize: 37,
    color: '#A5392C',
    backgroundColor: 'transparent',
    fontFamily: "TrashHand",
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 30,
    paddingTop: 90,
    paddingBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 1,
  },
  skip: {
    color: '#FFF',
    fontSize: 10,
    fontWeight:'bold',
    fontFamily: "Roboto-Bold",
  },
  iconView: {
    justifyContent: 'flex-end',
    flexGrow: 1,
    textAlign: 'center',
    backgroundColor: 'transparent',
    marginTop: 60,
    marginBottom: 80,
  },
  buttonCircle: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default class Intro extends Component {
  static navigationOptions = {
    headerShown: false,
  };
  componentDidMount = () => Orientation.lockToPortrait()
  renderItem = ({ item }) => {
    return (
      <View style={styles.slide} >
          <ImageBackground source={item.image} style={styles.content} >

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
          {item.icon &&
          <View style={styles.iconView}>
           <Icon
              style={styles.icon}
              name={item.icon}
              type="BooksonWall"
              size={120}
              color="#fff"
              />
            </View>
          }

        </ImageBackground>
      </View>
    );
  }
  renderNextButton= () => {
    return (
      <View style={styles.buttonCircle}>
        <Icon
          name="rightArrow"
          color="rgba(255, 255, 255, .9)"
          type="BooksonWall"
          size={22}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    );
  }
  renderDoneButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Icon
          name="check"
          type="BooksonWall"
          color="rgba(255, 255, 255, .9)"
          size={20}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    );
  }
  renderSkipButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Text style={styles.skip}>{I18n.t("Skip","Skip")}</Text>
      </View>
    );
  }
  onDone = () => this.props.navigation.navigate('Stories',{params: {loadStories: this.props.loadStories, storeStories: this.props.storeStories}});

  render() {

      return (
        <AppIntroSlider
          renderItem={this.renderItem}
          slides={slides}
          renderDoneButton={this.renderDoneButton}
          renderNextButton={this.renderNextButton}
          renderSkipButton={this.renderSkipButton}
          onDone={this.onDone}
          showSkipButton/>
      );
    }

}
