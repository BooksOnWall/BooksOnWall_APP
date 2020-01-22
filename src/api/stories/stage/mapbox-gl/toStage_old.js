import React, {Component} from 'react';
import { ActivityIndicator, Platform , Alert, SafeAreaView, Animated, StyleSheet, View, Text, I18nManager } from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import MapboxGL from '@react-native-mapbox-gl/maps';
import { MapView } from 'react-native-mapbox-direction';
import sheet from './styles/sheet';
import {onSortOptions} from './utils';

import BaseExamplePropTypes from './common/BaseExamplePropTypes';
import TabBarPage from './common/TabBarPage';
import Bubble from './common/Bubble';

MapboxGL.setAccessToken('pk.eyJ1IjoiY3JvbGwiLCJhIjoiY2p4cWVmZDA2MDA0aTNkcnQxdXhldWxwZCJ9.3pr6-2NQQDd59UBRCEeenA');

class ToStage extends Component {
  static navigationOptions = {
    title: 'To Stage'
  };
  static propTypes = {
    ...BaseExamplePropTypes,
  };
  constructor(props) {
    super(props);
    // eslint-disable-next-line fp/no-mutating-methods
    this._trackingOptions = Object.keys(MapboxGL.UserTrackingModes)
      .map(key => {
        return {
          label: key,
          data: MapboxGL.UserTrackingModes[key],
        };
      })
      .concat([
        {
          label: 'None',
          data: 'none',
        },
      ])
      .sort(onSortOptions);
      this.state = {
        prevLatLng: null,
        track: null,
        distanceTotal:null,
        latitude: null,
        record: null,
        showUserLocation: true,
        userSelectedUserTrackingMode: this._trackingOptions[3].data,
        currentTrackingMode: this._trackingOptions[3].data,
        server: this.props.screenProps.server,
        appName: this.props.screenProps.appName,
        AppDir: this.props.screenProps.AppDir,
        story: this.props.navigation.getParam('story'),
        order: this.props.navigation.getParam('order'),
        location: [],
        position: {},
      };
    this.onTrackingChange = this.onTrackingChange.bind(this);
    this.onUserTrackingModeChange = this.onUserTrackingModeChange.bind(this);
    this.onToggleUserLocation = this.onToggleUserLocation.bind(this);
  }

  onTrackingChange(index, userTrackingMode) {
    this.setState({
      userSelectedUserTrackingMode: userTrackingMode,
      currentTrackingMode: userTrackingMode,
    });
  }
  // Zoom out to display starting point and ending point if in Global mode
    // Follow your current location if in Course mode
  moveCamera = () => {
        this.mapRef.moveCamera();
  }
  onUserTrackingModeChange(e) {
    const {followUserMode} = e.nativeEvent.payload;
    this.setState({currentTrackingMode: followUserMode || 'none'});
  }

  onToggleUserLocation() {
    this.setState({showUserLocation: !this.state.showUserLocation});
  }

  get userTrackingModeText() {
    switch (this.state.currentTrackingMode) {
      case MapboxGL.UserTrackingModes.Follow:
        return 'Follow';
      case MapboxGL.UserTrackingModes.FollowWithCourse:
        return 'FollowWithCourse';
      case MapboxGL.UserTrackingModes.FollowWithHeading:
        return 'FollowWithHeading';
      default:
        return 'None';
    }
  }
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
      //await findCoordinates();

      await navigator.geolocation.getCurrentPosition(
        (position) => {
          this.setState({position: position});
          console.log(JSON.stringify(position));
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
  render() {
    return (
      <TabBarPage
        {...this.props}
        scrollable
        initialIndex={3}
        options={this._trackingOptions}
        onOptionPress={this.onTrackingChange}
      >
        <MapboxGL.MapView style={sheet.matchParent}>
          <MapboxGL.UserLocation visible={this.state.showUserLocation} />

          <MapboxGL.Camera
            defaultSettings={{
              centerCoordinate: [-56.1670182, -34.9022229],
              zoomLevel: 16,
            }}
            followUserLocation={
              this.state.userSelectedUserTrackingMode !== 'none'
            }
            followUserMode={
              this.state.userSelectedUserTrackingMode !== 'none'
                ? this.state.userSelectedUserTrackingMode
                : 'normal'
            }
            onUserTrackingModeChange={this.onUserTrackingModeChange}
          />
        </MapboxGL.MapView>

        <Bubble style={{bottom: 100}}>
          <Text>User Tracking Mode: {this.userTrackingModeText}</Text>
        </Bubble>
        <Bubble style={{bottom: 100}}>
          <Text>Position: {JSON.stringify(this.state.position)}</Text>
        </Bubble>
        <Bubble onPress={this.onToggleUserLocation} style={{bottom: 180}}>
          <Text>Toggle User Location</Text>
        </Bubble>
      </TabBarPage>
    );
  }
}

export default ToStage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  }
});
