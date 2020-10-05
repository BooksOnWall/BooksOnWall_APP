import React, {Component} from 'react';
import { Platform , Alert, SafeAreaView, Animated, StyleSheet, View, Text, I18nManager } from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';

export default class Stage extends Component {
  static navigationOptions = {
    title: 'Stage',
    headerShown: false
  };
  componentDidMount = async () => {
    try {
      await request(
        Platform.select({
          android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
          ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
        }),
      );
      await request(
        Platform.select({
          android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        }),
      );
      await navigator.geolocation.getCurrentPosition(
        (position) => {
          this.setState({position});
          console.log(position);
        },
        (error) => alert(JSON.stringify(error)),
        {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 1}
      );

      this.watchID = await navigator.geolocation.watchPosition((lastPosition) => {
        var { distanceTotal, record } = this.state;
        this.setState({lastPosition});
        if(record) {
          var newLatLng = {latitude:lastPosition.coords.latitude, longitude: lastPosition.coords.longitude};
          this.setState({ track: this.state.track.concat([newLatLng]) });
          this.setState({ distanceTotal: (distanceTotal + this.calcDistance(newLatLng)) });
          this.setState({ prevLatLng: newLatLng });
        }
      },
      (error) => alert(JSON.stringify(error)),
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 0, distanceFilter: 1});
    } catch(e) {
      console.log(e);
    }
  }
  constructor(props) {
    super(props);
    this.state = {
      prevLatLng: null,
      track: null,
      distanceTotal:null,
      latitude: null,
      record: null,
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      AppDir: this.props.screenProps.AppDir,
      story: this.props.navigation.getParam('story'),
      order: this.props.navigation.getParam('order'),
      location: null,
    };
  }
  findCoordinates = async () => {
    try {
      await navigator.geolocation.getCurrentPosition(
        position => {
          const location = JSON.stringify(position);
          this.setState({ location });
          console.log(position);
        },
        error => Alert.alert(error.message),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    } catch(e) {
      console.log(e);
    }
  };
  render() {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Stage {this.state.order}</Text>
        <Text>Position: {JSON.stringify(this.state.position)}</Text>
      </SafeAreaView>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
