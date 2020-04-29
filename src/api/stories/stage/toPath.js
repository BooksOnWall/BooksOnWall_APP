import React, {Component} from 'react';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {Platform, View, StyleSheet} from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Button} from 'react-native-elements';
import {lineString as makeLineString, bbox} from '@turf/turf';
import Toast from 'react-native-simple-toast';
import RouteSimulator from './mapbox-gl/showDirection/RouteSimulator';
import {directionsClient} from './MapboxClient';
import sheet from './mapbox-gl/styles/sheet';
import I18n from "../../../utils/i18n";
import Page from './mapbox-gl/common/Page';
import { MAPBOX_KEY  } from 'react-native-dotenv';
import PulseCircleLayer from './mapbox-gl/showDirection/PulseCircleLayer';
// import PulseCircle from './mapbox-gl/PulseCircleLayer';
// import audio lib
import Sound from 'react-native-sound';

const styles = StyleSheet.create({
  buttonCnt: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  button: {
    borderRadius: 3,
    backgroundColor: 'blue',
  },
});

const layerStyles = {
  origin: {
    circleRadius: 5,
    circleColor: 'white',
  },
  destination: {
    circleRadius: 5,
    circleColor: 'white',
  },
  route: {
    lineColor: 'white',
    lineCap: MapboxGL.LineJoin.Round,
    lineWidth: 3,
    lineOpacity: 0.84,
  },
  progress: {
    lineColor: '#314ccd',
    lineWidth: 3,
  },
};

MapboxGL.setAccessToken(MAPBOX_KEY);

class ToPath extends Component {
  static navigationOptions = {
    title: 'To Stage',
    headerShown: false
  };


  constructor(props) {
    super(props);
    const location = (this.props.navigation.getParam('story')) ? this.props.navigation.getParam('story').geometry.coordinates: null;
    const stages = this.props.navigation.getParam('story').stages;
    const routes = stages.map((stage, i) => {
      return {coordinates: stage.geometry.coordinates};
    });
    const storyPoints = stages.map((stage, i) => {
      return stage.geometry.coordinates;
    });
    var line = makeLineString(storyPoints);
    var mbbox = bbox(line);
    this.state = {
      prevLatLng: null,
      track: null,
      distanceTotal:null,
      latitude: null,
      record: null,
      showUserLocation: true,
      origin: routes[0].coordinates,
      destination: routes[1].coordinates,
      goto: (location) ? location : routes[0].coordinates ,
      zoom: 18,
      followUserLocation: true,
      route: null,
      stages: stages,
      routes: routes,
      mbbox: mbbox,
      offlinePack: null,
      currentPoint: null,
      routeSimulator: null,
      styleURL: MapboxGL.StyleURL.Dark, // todo import story map styles
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      AppDir: this.props.screenProps.AppDir,
      storyDir: this.props.screenProps.AppDir + '/stories/',
      story: this.props.navigation.getParam('story'),
      order: this.props.navigation.getParam('order'),
      index: this.props.navigation.getParam('index'),
      location: [],
      position: {},
    };

    this.onStart = this.onStart.bind(this);
  }

  onStart() {
    const routeSimulator = new RouteSimulator(this.state.route);
    routeSimulator.addListener(currentPoint => this.setState({currentPoint}));
    routeSimulator.start();
    this.setState({routeSimulator});
  }
  componentDidMount = async () => {
    try {
      await this.offlineLoad();
      MapboxGL.setTelemetryEnabled(false);
      const reqOptions = {
        waypoints: this.state.routes,
        profile: 'walking',
        geometries: 'geojson',
      };

      const res = await directionsClient.getDirections(reqOptions).send();
      await this.audioPlay();
      this.setState({
        route: makeLineString(res.body.routes[0].geometry.coordinates),
      });
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
          console.log('position',JSON.stringify(position));
        },
        (error) => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        {enableHighAccuracy: true, timeout: 30000, maximumAge: 1000, distanceFilter: 1}
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
      (error) => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {enableHighAccuracy: true, timeout: 30000, maximumAge: 1, distanceFilter: 1});
    } catch(e) {
      console.log(e);
    }
  }
  componentWillUnmount() {
    if (this.state.routeSimulator) {
      this.state.routeSimulator.stop();
    }
  }

  renderRoute() {
    if (!this.state.route) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource id="routeSource" shape={this.state.route}>
        <MapboxGL.LineLayer
          id="routeFill"
          style={layerStyles.route}
          belowLayerID="originInnerCircle"
          />
      </MapboxGL.ShapeSource>
    );
  }

  renderCurrentPoint() {
    if (!this.state.currentPoint) {
      return;
    }
    return (
      <PulseCircleLayer
        shape={this.state.currentPoint}
        aboveLayerID="destinationInnerCircle"
        />
    );
  }

  renderProgressLine() {
    if (!this.state.currentPoint) {
      return null;
    }

    const {nearestIndex} = this.state.currentPoint.properties;
    const coords = this.state.route.geometry.coordinates.filter(
      (c, i) => i <= nearestIndex,
    );
    coords.push(this.state.currentPoint.geometry.coordinates);

    if (coords.length < 2) {
      return null;
    }

    const lineString = makeLineString(coords);
    return (
      <MapboxGL.Animated.ShapeSource id="progressSource" shape={lineString}>
        <MapboxGL.Animated.LineLayer
          id="progressFill"
          style={layerStyles.progress}
          aboveLayerID="routeFill"
          />
      </MapboxGL.Animated.ShapeSource>
    );
  }

  renderOrigin() {
    let backgroundColor = 'white';

    if (this.state.currentPoint) {
      backgroundColor = '#314ccd';
    }

    const style = [layerStyles.origin, {circleColor: backgroundColor}];

    return (
      <MapboxGL.ShapeSource
        id="origin"
        shape={MapboxGL.geoUtils.makePoint(this.state.origin)}
        >
        <MapboxGL.Animated.CircleLayer id="originInnerCircle" style={style} />
      </MapboxGL.ShapeSource>
    );
  }
  offlineLoad =  async () => {
    const name = 'story'+this.state.story.id;
    const offlinePack = await MapboxGL.offlineManager.getPack(name);
    this.setState({offlinePack: offlinePack});
    return offlinePack;
  }
  offlineSave = async () => {
    try {
      Toast.showWithGravity(I18n.t("Start_download_map","Start map download"), Toast.SHORT, Toast.TOP);
      const progressListener = (offlineRegion, status) => console.log(offlineRegion, status);
      const errorListener = (offlineRegion, err) => console.log(offlineRegion, err);
      const box= this.state.mbbox;
      const name = 'story'+this.state.story.id;
      // check if offline db still exist
      const offlinePack = await MapboxGL.offlineManager.getPack(name);
      if(offlinePack) await MapboxGL.offlineManager.deletePack(name);
      await MapboxGL.offlineManager.createPack({
        name: name,
        styleURL: this.state.styleURL,
        minZoom: 14,
        maxZoom: 20,
        bounds: [[box[0], box[1]], [box[2], box[3]]]
      }, progressListener, errorListener);
      Toast.showWithGravity(I18n.t("End_download_map","End map download"), Toast.SHORT, Toast.TOP);
      return progressListener;
    } catch(e) {
      console.log(e);
    }
  }
  renderActions() {
    if (this.state.routeSimulator) {
      return null;
    }
    return (
      <View style={styles.buttonCnt}>
          <Button
            raised
            title="Locate"
            onPress={() => this.goTo([this.state.position.coords.longitude,this.state.position.coords.latitude], true)}
            style={styles.button}
            disabled={false}
            />
          <Button
            raised
            title="Origin"
            onPress={() => this.goTo(this.state.origin, false)}
            style={styles.button}
            disabled={false}
            />
            <Button
              raised
              title="Dest"
              onPress={() => this.goTo(this.state.destination, false)}
              style={styles.button}
              disabled={false}
              />
              <Button
                raised
                title="Save"
                onPress={() => this.offlineSave()}
                style={styles.button}
                disabled={!this.state.route}
                />
      </View>
    );
  }
  goTo = (coordinates,followUserLocation ) => {
    (!followUserLocation) ? this.setState({ followUserLocation: followUserLocation, goto: coordinates}) : this.setState({ followUserLocation: followUserLocation, goto: coordinates}) ;
  }
  onUserLocationUpdate = (newUserLocation) => {
    this.setState({position: newUserLocation})
  }
  audioPlay = async () => {
    const story = this.state;
    const stage = story.stages[this.state.index];
    const count =  stage.onZoneLeave.length;
    console.log(count);
    if (count > 1) {
      const audio = stage.onZoneLeave[0];
      const audio2 = stage.onZoneLeave[1];
      const loop = audio.loop;
      let path = audio.path;
      let path2 = audio2.path;
      path = this.state.storyDir + path.replace("assets/stories/", "");
      path2 = this.state.storyDir + path2.replace("assets/stories/", "");
      Sound.setCategory('Playback');
      // Load the sound file path from the app story bundle
      // See notes below about preloading sounds within initialization code below.
      var whoosh = new Sound(path, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('failed to load the sound', error);
          return;
        }
        // loaded successfully
        console.log('duration in seconds: ' + whoosh.getDuration() + 'number of channels: ' + whoosh.getNumberOfChannels());
        // Loop indefinitely until stop() is called

        // Play the sound with an onEnd callback
        whoosh.play((success) => {
          if (success) {
            console.log('successfully finished playing');
            var nextaudio = new Sound(path2, Sound.MAIN_BUNDLE, (error) => {
              if (error) {
                console.log('failed to load the sound', error);
                return;
              }
              // loaded successfully
              console.log('duration in seconds: ' + nextaudio.getDuration() + 'number of channels: ' + nextaudio.getNumberOfChannels());

              // Play the sound with an onEnd callback
              nextaudio.play((success) => {
                if (success) {
                  console.log('successfully finished playing');
                  nextaudio.release();
                } else {
                  console.log('playback failed due to audio decoding errors');
                }
              });
            });
          } else {
            console.log('playback failed due to audio decoding errors');
          }
        });
        whoosh.release();
      });
    }
    if (count === 1) {
      const audio = stage.onZoneLeave[0];

      const loop = audio.loop;
      let path = audio.path
      path = this.state.storyDir + path.replace("assets/stories/", "");
      Sound.setCategory('Playback');
      // Load the sound file path from the app story bundle
      // See notes below about preloading sounds within initialization code below.
      var whoosh = new Sound(path, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('failed to load the sound', error);
          return;
        }
        // loaded successfully
        console.log('duration in seconds: ' + whoosh.getDuration() + 'number of channels: ' + whoosh.getNumberOfChannels());

        // Play the sound with an onEnd callback
        whoosh.play((success) => {
          if (success) {
            console.log('successfully finished playing');
          } else {
            console.log('playback failed due to audio decoding errors');
          }
        });
        if(loop) {
          whoosh.setNumberOfLoops(-1);
        }
      });
      whoosh.release();
    }

  }
  render() {
    return (
      <Page {...this.props}>
        <MapboxGL.MapView
          logoEnabled={false}
          compassEnabled={true}
          localizeLabels={true}
          ref={c => (this._map = c)}
          style={sheet.matchParent}
          pitch={60}
          styleURL={this.state.styleURL}
          >

          <MapboxGL.Camera
            zoomLevel={this.state.zoom}
            centerCoordinate={this.state.goto}
            animationMode='flyTo'
            animationDuration={2000}
            followUserLocation={this.state.followUserLocation}
            ref={d => (this.camera = d)}
            followUserMode='compass'
            onUserTrackingModeChange={false}
            />

          {this.renderOrigin()}
          {this.renderRoute()}
          {this.renderCurrentPoint()}
          {this.renderProgressLine()}
          <MapboxGL.UserLocation
            onUpdate={newUserLocation => this.onUserLocationUpdate(newUserLocation)}
            animated={true}
            visible={true} />

          <MapboxGL.ShapeSource
            id="destination"
            shape={MapboxGL.geoUtils.makePoint(this.state.destination)}
            >
            <MapboxGL.CircleLayer
              id="destinationInnerCircle"
              style={layerStyles.destination}
              />
          </MapboxGL.ShapeSource>
        </MapboxGL.MapView>

        {this.renderActions()}
      </Page>
    );
  }
}

export default ToPath;
