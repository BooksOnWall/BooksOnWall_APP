import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { Icon, registerCustomIconType } from 'react-native-elements';
import I18n from "../../utils/i18n";
import AppIntroSlider from 'react-native-app-intro-slider';
import { Images } from '../../../assets/intro';
import IconSet from '../../utils/Icon';
registerCustomIconType('booksonwall', IconSet);

const slides = [
  {
    key: 'p1',
    title: I18n.t("Welcome","BooksOnWall"),
    text: I18n.t("Invite","Welcome! We invite you to explore a story..."),
    image: Images['image1'],
    backgroundColor: '#A19887',
    icon: 'bow-isologo',
  },
  {
    key: 'p2',
    title:  I18n.t("Each_story","...each story has many walls to discover..."),
    text: I18n.t("discover","Soon in your city"),
    image: Images['image2'],
    backgroundColor: '#A19887',
    icon: 'bow-isologo',
  },
  {
    key: 'p3',
    title: I18n.t("Each_wall","...Each wall has many secrets to reveal..."),
    text: I18n.t("reveal","With art, music, animation..."),
    image: Images['image3'],
    backgroundColor: '#A19887',
    icon: 'bow-isologo',
  },
  {
    key: 'p4',
    title: I18n.t("Enjoy","Enjoy it"),
    text: I18n.t("Press","Choose the story next to you and begin the adventure."),
    image: Images['image4'],
    backgroundColor: '#A19887',
    icon: 'bow-isologo',
  },
  {
    key: 'p5',
    title: I18n.t("Bip","oh! please pay attention to the trafic, beep beep!"),
    text: I18n.t("Better_headphones","Better use a headphone."),
    icon: 'headphones',
    image: Images['image5'],
    backgroundColor: '#A19887',
  }
];
const styles = StyleSheet.create({
  slide: {
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
    text: {
    color: '#EFF0ED',
    backgroundColor: 'transparent',
    fontFamily: "RobotoCondensed-Regular",
    fontSize: 17,
    textAlign: 'center',
    paddingTop: 5,
    paddingLeft: 60,
    paddingRight: 60,
    marginBottom: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    },
  title: {
    flexGrow: 1,
    fontSize: 30,
    color: '#A5392C',
    backgroundColor: 'transparent',
    fontFamily: "TrashHand",
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 5,
    marginTop: 40,
    paddingHorizontal: 30,
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
    flexGrow: 2,
    textAlign: 'center',
    backgroundColor: 'transparent',
    marginTop: 60,
    marginBottom: 80,
  },
  buttonCircle: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, .2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default class Intro extends Component {
  static navigationOptions = {
    headerShown: false,
  };

  renderItem = ({ item }) => {
    return (
      <View style={styles.slide}  >
        <ImageBackground source={item.image} style={styles.content} style={{justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: item.backgroundColor, }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
          {item.icon &&
          <View style={styles.iconView}>
           <Icon
              style={styles.icon}
              name={item.icon}
              type="booksonwall"
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
          name="right-arrow"
          color="rgba(255, 255, 255, .9)"
          type="booksonwall"
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
          name="md-checkmark"
          type="ionicon"
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
