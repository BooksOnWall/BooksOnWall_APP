import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import I18n from "../../utils/i18n";
import AppIntroSlider from 'react-native-app-intro-slider';
import { Images } from '../../../assets/intro';
import Icon from '../../utils/Icon';

const slides = [
  {
    key: 'p1',
    title: I18n.t("Welcome","BooksOnWall"),
    text: I18n.t("Invite","welcome! we invite you to explore a story..."),
    image: Images['image1'],
    backgroundColor: '#9E1C00',
  },
  {
    key: 'p2',
    title:  I18n.t("Each_story","...each story has many walls to discover..."),
    text: I18n.t("discover","Soon in your city"),
    image: Images['image2'],
    backgroundColor: '#257466',
  },
  {
    key: 'p3',
    title: I18n.t("Each_wall","...Each wall has many secrets to reveal..."),
    text: I18n.t("reveal","whit art, music, animation..."),
    image: Images['image3'],
    backgroundColor: '#CC7116',
  },
  {
    key: 'p4',
    title: I18n.t("Enjoy","Enjoy it"),
    text: I18n.t("Press","Choose the story next to you and begin the adventure"),
    image: Images['image4'],
    backgroundColor: '#593274',
  },
  {
    key: 'p5',
    title: I18n.t("Bip","oh! please pay attention to the trafic, beep beep!"),
    text: I18n.t("Better_headphones","Better whit headphone"),
    icon: 'headphones',
    image: Images['image5'],
    backgroundColor: '#255C97',
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
    color: '#EFEFEF',
    backgroundColor: 'transparent',
    fontFamily: "ATypewriterForMe",
    fontSize: 21,
    letterSpacing: -1,
    textAlign: 'center',
    padding: 40,
    marginBottom: 0,
  },
  title: {
    flex: 2,
    fontSize: 33,
    color: '#EFEFEF',
    backgroundColor: 'transparent',
    fontFamily: "FingerPaint-Regular",
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
    marginTop: 70,
    paddingHorizontal: 20,
  },
  icon: {
    textAlign: 'center',
    backgroundColor: 'transparent',
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
        {item.icon &&
         <Icon
            style={styles.icon}
            name={item.icon}
            size={60}
            color="white"
            />
        }
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
