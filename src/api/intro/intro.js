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
    text: I18n.t("Invite","welcome! we invite you to explore a story..."),
    image: Images['image1'],
    backgroundColor: '#A19887',
  },
  {
    key: 'p2',
    title:  I18n.t("Each_story","...each story has many walls to discover..."),
    text: I18n.t("discover","Soon in your city"),
    image: Images['image2'],
    backgroundColor: '#A19887',
  },
  {
    key: 'p3',
    title: I18n.t("Each_wall","...Each wall has many secrets to reveal..."),
    text: I18n.t("reveal","whit art, music, animation..."),
    image: Images['image3'],
    backgroundColor: '#A19887',
  },
  {
    key: 'p4',
    title: I18n.t("Enjoy","Enjoy it"),
    text: I18n.t("Press","Choose the story next to you and begin the adventure"),
    image: Images['image4'],
    backgroundColor: '#A19887',
  },
  {
    key: 'p5',
    title: I18n.t("Bip","oh! please pay attention to the trafic, beep beep!"),
    text: I18n.t("Better_headphones","Better whit headphone"),
    icon: 'headphones',
    image: Images['image5'],
    backgroundColor: '#A19887',
  }
];
const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    alignItems: 'flex-end',
    flexDirection: 'column-reverse',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  text: {
    flex: 1,
    color: '#EFF0ED',
    backgroundColor: 'transparent',
    fontFamily: "RobotoCondensed-Regular",
    fontSize: 17,
    textAlign: 'center',
    paddingTop: 10,
    paddingLeft: 60,
    paddingRight: 60,
    marginBottom: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    },
  title: {
    flex: 2,
    fontSize: 30,
    color: '#A5392C',
    backgroundColor: 'transparent',
    fontFamily: "TrashHand",
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
    marginTop: 0,
    paddingHorizontal: 40,
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
  icon: {
    textAlign: 'center',
    backgroundColor: 'transparent',
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
        <ImageBackground source={item.image} style={{width: '100%', height: '100%', backgroundColor: item.backgroundColor, }}>
          <Text style={styles.title}>{item.title}</Text>
        {item.icon &&
         <Icon
            style={styles.icon}
            name={item.icon}
            type="booksonwall"
            size={35}
            color="#756F63"
            />
        }
          <Text style={styles.text}>{item.text}</Text>
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
