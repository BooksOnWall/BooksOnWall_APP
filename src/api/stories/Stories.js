import React, { PureComponent } from 'react';
import {
  Platform,
  Animated,
  Linking,
  StyleSheet,
  Text,
  View,
  I18nManager,
  ActivityIndicator,
  TouchableOpacity } from 'react-native';
import { FlatList, RectButton } from 'react-native-gesture-handler';
import Swipeable from "react-native-gesture-handler/Swipeable";
import Icon from 'react-native-vector-icons/MaterialIcons';

//import RNFetchBlob from 'react-native-fetch-blob';
// import * as Permissions from 'expo-permissions';
// import * as FileSystem from 'expo-file-system';

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

//  To toggle LTR/RTL uncomment the next line
I18nManager.allowRTL(true);

export default class Stories extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      Platform: Platform,
      stories: [],
      storiesURL: 'https://api.booksonwall.art/stories',
      isLoading: true,
    };
  }
  static navigationOptions = {
    title: 'Stories',
  };
  renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
    return (
      <RectButton style={styles.rightAction} onPress={this.close}>
        <AnimatedIcon
          name="delete-forever"
          size={30}
          color="#fff"
          />
      </RectButton>
    );
  }
  renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({
       inputRange: [0, 80],
       outputRange: [0, 1],
       extrapolate: 'clamp',
     });
    return (
      <RectButton style={styles.leftAction} onPress={this.close}>
        <AnimatedIcon
          name="archive"
          size={30}
          color="#fff"
        />
      </RectButton>
    );
  }
  componentDidMount = async () => {
    try {
      if(Platform === 'web') {
        return this.props.navigation.navigate('Intro');
      }
      this.setState({stories: this.props.screenProps.stories, isLoading: false});
    }catch(e) {
      console.log("Error fetching data-----------", e);
    }
  }
  close() {

  }
  render() {
    if (this.state.isLoading || this.state.Platform === 'web') {
      return (
        <View style={styles.container}>
          <ActivityIndicator />
        </View>
      );
    }
    return (
      <View style={styles.container}>
      <FlatList
        data={this.state.stories}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => (
          <Swipeable
            friction={2}
            leftThreshold={80}
            rightThreshold={40}
            renderLeftActions={this.renderLeftActions}
            renderRightActions={this.renderRightActions}
            >
            <RectButton key={'s'+index} style={styles.rectButton} onPress={() => this.props.navigation.navigate('Story', {'story': item})}>
              <Text style={styles.fromText}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.messageText}>
                {item.aa.name}
              </Text>
              <Text style={styles.dateText}>
                {item.updatedAt} {'❭'}
              </Text>
            </RectButton>
          </Swipeable>
        )}
        keyExtractor={(item, index) => `message ${index}`}
      />
    </View>
    );
  }
}

const styles = StyleSheet.create({
  leftAction: {
    flex: 1,
    backgroundColor: '#388e3c',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse'
  },
  actionIcon: {
    width: 30,
    marginHorizontal: 10
  },
  rightAction: {
    alignItems: 'center',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#dd2c00',
    flex: 1,
    justifyContent: 'flex-end'
  },
  container: {
    flex:1,
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    flexDirection: 'row',
    flexWrap:'wrap',
    justifyContent:'center',
  },
  rectButton: {
    flex: 1,
    height: 80,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  separator: {
    backgroundColor: 'rgb(200, 199, 204)',
    height: StyleSheet.hairlineWidth,
  },
  fromText: {
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },
  messageText: {
    color: '#999',
    backgroundColor: 'transparent',
  },
  dateText: {
    backgroundColor: 'transparent',
    position: 'absolute',
    right: 20,
    top: 10,
    color: '#999',
    fontWeight: 'bold',
  },
});
