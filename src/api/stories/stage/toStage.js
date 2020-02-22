/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
  PermissionsAndroid
} from "react-native";
import NavigationView from "./NavigationView";
import { NativeModules } from "react-native";
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_KEY  } from 'react-native-dotenv';
import { Card, ButtonGroup, Button, ThemeProvider } from 'react-native-elements';
import  distance from '@turf/distance';
import KeepAwake from 'react-native-keep-awake';
import Reactotron from 'reactotron-react-native';
import Toast from 'react-native-simple-toast';
import I18n from "../../../utils/i18n";
type Props = {};

export default class ToStage extends Component<Props,$FlowFixMeState > {
  constructor () {
    super()
    this.state = {
      selectedIndex: 0,
      access_token: MAPBOX_KEY,
      profile: 'mapbox/walking',
      initialPosition: null,
      lastPosition: null,
      granted: Platform.OS === 'ios',
      fromLat: -34.90949779775191,
      fromLong: -56.17891507941232,
      toLat: -34.90949779775191 ,
      toLong: -56.17891507941232,
      distance: null,
    }

    this.updateIndex = this.updateIndex.bind(this)
  }
  componentDidMount = async () => {
    try {
      await KeepAwake.activate();
      if (!this.state.granted) {
        await this.requestFineLocationPermission();
      }
      // Instead of navigator.geolocation, just use Geolocation.
      await Geolocation.getCurrentPosition(
        position => {
          const initialPosition = position;
          this.setState({fromLat: position.coords.latitude, fromLong: position.coords.longitude});
          this.setState({initialPosition});
        },
        error =>  Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        {enableHighAccuracy: true, timeout: 10000, maximumAge: 1000},
      );
      this.watchID = await Geolocation.watchPosition(position => {
        const lastPosition = position;
        this.setState({lastPosition});
        this.setState({fromLat: position.coords.latitude, fromLong: position.coords.longitude});
        let from = {
          "type": "Feature",
          "properties": {},
            "geometry": {
              "type": "Point",
              "coordinates": [this.state.fromLong, this.state.fromLat]
            }
          };
          let to = {
            "type": "Feature",
            "properties": {},
              "geometry": {
                "type": "Point",
                "coordinates": [this.state.toLong, this.state.toLat]
              }
            };
          let units = "kilometers";
          let dis = distance(from, to, units);
          Reactotron.log('distance', dis);
          if (dis) {
            this.setState({distance: dis});
          };
      },
      error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: 5000, maximumAge: 1000, enableHighAccuracy: true, distanceFilter: 1},
      );

    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount = async () => {
    try {
      await this.watchID != null && Geolocation.clearWatch(this.watchID);
      await KeepAwake.deactivate();
    } catch(e) {
      console.log(e);
    }
  }
  updateIndex = (selectedIndex) => {
    this.setState({selectedIndex})
  }
  watchID: ?number = null;
  requestFineLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "ACCESS_FINE_LOCATION",
          message: "Mapbox navigation needs ACCESS_FINE_LOCATION"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        this.setState({ granted: true });
      } else {
        Reactotron.log("ACCESS_FINE_LOCATION permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }

  render() {
    const buttons = ['Auto', 'Pedestrian', 'Bicycle'];
    const { distance, selectedIndex, access_token, profile, granted, fromLat, fromLong, toLat, toLong } = this.state;
    if (!distance || this.state.Platform === 'web') {
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
    return (
      <ThemeProvider>
        <View style={styles.container}>
          <Card style={styles.container}
            title='Story Title'
            >
            <Text>You are at {distance.toFixed(2)} km from the beginning of your story.</Text>
            <Text> Please choose your mode of transportation and press Start Navigation.</Text>
            <ButtonGroup
            onPress={this.updateIndex}
            selectedIndex={selectedIndex}
            buttons={buttons}
            containerStyle={{height: 40}}
            />

              {Platform.OS === 'android' && (
                <Button
                  buttonStyle={{borderRadius: 0, marginLeft: 0, marginRight: 0, marginBottom: 0}}
                  title={"Start Navigation"}
                  onPress={() => {
                    NativeModules.MapboxNavigation.navigate(
                      fromLat,
                      fromLong,
                      toLat,
                      toLong,
                      // profile,
                      // access_token
                    );
                  }}
                />
              )}
          </Card>
        </View>
      </ThemeProvider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "stretch",
    backgroundColor: "whitesmoke"
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    backgroundColor: "whitesmoke"
  },
  subcontainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "whitesmoke"
  },
  welcome: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  },
  navigation: {
    backgroundColor: "gainsboro",
    flex: 1
  }
});
