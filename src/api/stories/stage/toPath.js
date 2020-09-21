import React, {Component} from 'react';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {NativeModules,Animated, ImageBackground, Dimensions, Platform, View, StyleSheet, Text} from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Button, ButtonGroup, Icon, Badge} from 'react-native-elements';
import {lineString as makeLineString, bbox} from '@turf/turf';
import Toast from 'react-native-simple-toast';
import RouteSimulator from './mapbox-gl/showDirection/RouteSimulator';
import {directionsClient} from './MapboxClient';
import sheet from './mapbox-gl/styles/sheet';
import I18n from "../../../utils/i18n";
import Page from './mapbox-gl/common/Page';
import { MAPBOX_KEY , DEBUG_MODE } from '@env';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import PulseCircleLayer from './mapbox-gl/showDirection/PulseCircleLayer';
import  distance from '@turf/distance';
import Geolocation from '@react-native-community/geolocation';
// import PulseCircle from './mapbox-gl/PulseCircleLayer';
// import audio lib
import Sound from 'react-native-sound';
import openIcon from '../../../../assets/nav/point1.png';
import completeIcon from '../../../../assets/nav/point2.png';
import unknownIcon from '../../../../assets/nav/point3.png';

import {getScore} from '../../stats/score';

const SCREEN_HEIGHT = Dimensions.get("window").height;
const IS_IPHONE_X = SCREEN_HEIGHT === 812 || SCREEN_HEIGHT === 896;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 44 : 24) : 0;
const HEADER_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 88 : 64) : 64;
const NAV_BAR_HEIGHT = HEADER_HEIGHT - STATUS_BAR_HEIGHT;


const iconstyles = {
  icon: {
    iconImage: ['get', 'icon'],
    iconOptional: true,
    textIgnorePlacement: true,
    textField: '{label}',
    textSize: 40,
    textMaxWidth: 50,
    textColor: '#FFF',
    textAnchor: 'center',
    // textTranslate: [22, -22],
    textAllowOverlap: true,
    iconSize: [
      'match',
      ['get', 'icon'],
      'completeIcon',
      1.4,
      /* default */ 1.4,
    ],
  },
};
const layerStyles = {
  origin: {
    circleRadius: 40,
    circleColor: '#750000',
    circleBlur: .8,
    circleOpacity: .9,

  },
  destination: {
    circleRadius: 40,
    circleColor: 'black',
    circleBlur: .8,
    circleOpacity: .9,

  },
  route: {
    lineColor: '#314ccd',
    lineCap: MapboxGL.LineJoin.Round,
    lineWidth: 7,
    lineOpacity: 0.84,
  },
  progress: {
    lineColor: '#750000',
    lineWidth: 5,
  },
};
const circleStyles = {
  innerCircle: {
    circleStrokeWidth: 3,
    circleStrokeColor: '#750000',
    circleRadius: 5,
    circleColor: '#750000',
    circleBlur: .8,
    circleOpacity: .9,

  },
  innerCirclePulse: {
    circleStrokeWidth: 3,
    circleStrokeColor: '#750000',
    circleRadius: 2,
    circleColor: '#750000',
    circleBlur: .8,
    circleOpacity: .9,

  },
  outerCircle: {
    circleRadius: 2,
    circleStrokeWidth: 1,
    circleStrokeColor: '#750000',
    circleColor: '#FFF',
    circleBlur: .8,
    circleOpacity: .9,
  }
};

MapboxGL.setAccessToken(MAPBOX_KEY);

const Header = ({styles, distance, theme, completed, story, index}) => (
  <View style={styles.header}>
    <ImageBackground source={{uri: theme.banner.filePath}} style={styles.headerBackground}>
      <Badge  value={'Completed: ' + completed} containerStyle={{ position: 'absolute', top: 10, right: 10 }}/>
      <Text style={{
        fontSize: 26,
        letterSpacing: 1,
        color: "#fff",
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowOffset: {width: 1, height: 1},
        textShadowRadius: 2,
        fontFamily: story.theme.font1}} >{story.title}</Text>
      <Text style={styles.location}>{story.city + ' • ' + story.state}</Text>
      <Text style={styles.complete}>Complete: {(index+1)}/{story.stages.length} {(parseFloat(distance)*1000)}m</Text>
    </ImageBackground>
  </View>
);

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
    const index = this.props.navigation.getParam('index');
    const sid = this.props.navigation.getParam('story').id;
    const ssid = this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')].id;
    const order = this.props.navigation.getParam('story').stages[this.props.navigation.getParam('index')].stageOrder;
    const path = this.props.screenProps.AppDir + '/stories/'+sid+'/';
    const origin = (index > 0) ? routes[index].coordinates: location;
    const radius = stages[index].radius;
    console.log('radius', radius);
    console.log('index', index);
    this.state = {
      prevLatLng: null,
      track: null,
      distanceTotal:null,
      latitude: null,
      record: null,
      showUserLocation: true,
      origin: origin,
      destination: routes[index].coordinates,
      goto: (location) ? location : routes[index].coordinates ,
      zoom: 18,
      unset: false,
      followUserLocation: true,
      route: null,
      stages: stages,
      debug_mode: (DEBUG_MODE === 'true') ? true : false,
      routes: routes,
      mbbox: mbbox,
      features: {},
      images: {
        openIcon: openIcon,
        completeIcon: completeIcon,
        unknownIcon: unknownIcon
      },
      timeout: 5000,
      distance: this.props.navigation.getParam('distance'), // in kilometers
      radius: radius, // in meters
      position: null,
      fromLat: null,
      fromLong: null,
      toLong: null,
      toLat: null,
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
      index: index,
      selected: null,
      completed: null,
      audioPaused: false,
      audioButton: false,
      fromLat: origin[1],
      fromLong: origin[0],
      toLat: routes[index].coordinates[1],
      toLong: routes[index].coordinates[0],
      theme: this.props.navigation.getParam('story').theme,
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
    const {routes} = this.state;

    try {
      await this.offlineLoad();
      await this.getSelected();
      MapboxGL.setTelemetryEnabled(false);
      const reqOptions = {
        waypoints: this.state.routes,
        profile: 'walking',
        geometries: 'geojson',
      };
      const index = this.props.navigation.getParam('index');
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
      await this.getCurrentLocation();

    } catch(e) {
      console.log(e);
    }
  }
  getCurrentLocation = async () => {
    const {story, index, timeout, radius, debug_mode} = this.state;

    try {
      // Instead of navigator.geolocation, just use Geolocation.
      Toast.showWithGravity(I18n.t("Getting_GPS","Please wait , Trying to get your position ..."), Toast.SHORT, Toast.TOP);
      await Geolocation.getCurrentPosition(
        position => {
          const initialPosition = position;
          this.setState({
            position,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: timeout, maximumAge: 1000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => {
        this.setState({position: position,fromLat: position.coords.latitude, fromLong: position.coords.longitude});
        let from = {
          "type": "Feature",
          "properties": {},
            "geometry": {
              "type": "Point",
              "coordinates": [this.state.fromLong,this.state.fromLat ]
            }
          };
          let to = {
            "type": "Feature",
            "properties": {},
              "geometry": {
                "type": "Point",
                "coordinates": story.stages[index].geometry.coordinates
              }
            };
          let units = I18n.t("kilometers","kilometers");
          let dis = distance(from, to, "kilometers");
          if (dis) {
            this.setState({distance: dis.toFixed(3)});
          };
          if (dis && radius > 0 && debug_mode === false && dis <= radius && timeout > 0) this.switchToAR();
      },
      error => error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: timeout, maximumAge: 1000, enableHighAccuracy: true, distanceFilter: 1},
      );
    } catch(e) {
      console.log(e);
    }
  }
  watchID: ?number = null;
  cancelTimeout = () => this.setState({timeout: 0})
  componentWillUnmount() {
    const {routeSimulator} = this.state;
    this.cancelTimeout();
    (this.whoosh) ? this.whoosh.release() : '';
    MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
    Geolocation.clearWatch(this.watchId);
    this.watchID = null;
    if (routeSimulator) {
      routeSimulator.stop();
    }
    this.setState({unset: true});
  }
  getSelected = async() => {
    try {
      const {AppDir, story} = this.state;
      // get history from file
      try {
        // get history from file
        const index = this.props.navigation.getParam('index');
        console.log('index', index)
        const sid = story.id;
        const ssid = story.stages[index].id;
        const order = story.stages[index].stageOrder;
        const path = AppDir + '/stories/' + story.id + '/';
        let completed = await getScore({sid, ssid, order, path, index});
        completed = parseInt(completed);
        mselected = (completed && completed > 0) ? completed : 1;
        await this.setState({completed: parseInt(completed), selected: parseInt(mselected)});
      } catch (e) {
        console.log(e);
      }
    } catch(e) {
      console.log(e);
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


  renderMarkers() {

    const {index, images} = this.state;
    let backgroundColor = '#750000';
    if (this.state.currentPoint) {
      backgroundColor = '#314ccd';
    }

    const style = [layerStyles.destination, {circleColor: backgroundColor}];
    const label = [index,(index+1)];

    const features = {
      type: 'FeatureCollection',
      features: (index > 0) ? [
        {
          type: 'Feature',
          id: 'Stage'+ label[0],
          properties: {
            radius: 40,
            icon: 'unknownIcon',
            label: label[0],
          },
          geometry: {
            type: 'Point',
            coordinates: this.state.routes[(index-1)].coordinates ,
          },
        },
        {
          type: 'Feature',
          id: 'Stage'+label[1],
          properties: {
            radius: 40,
            icon: 'completeIcon',
            label: label[1],
          },
          geometry: {
            type: 'Point',
            coordinates: this.state.routes[index].coordinates,
          },
        }]
        :
        [{
          type: 'Feature',
          id: 'Stage'+label[1],
          properties: {
            radius: 40,
            icon: 'unknownIcon',
            label: label[1],
          },
          geometry: {
            type: 'Point',
            coordinates: this.state.routes[index].coordinates,
          },
        }]
    };
    return (
      <>
      <PulseCircleLayer
        id="pulse"
        shape={features}
        radius={40}
        pulseRadius={20}
        duration={600}
        innerCircleStyle={circleStyles.innerCircle}
        outerCircleStyle={circleStyles.outerCircle}
        innerCirclePulse={circleStyles.innerCirclePulse}
        />
      <MapboxGL.ShapeSource
        id="destination"
        shape={features}
        >
        <MapboxGL.SymbolLayer uponLayerID="pulse" id="destination"  style={iconstyles.icon} />
      </MapboxGL.ShapeSource>
      <MapboxGL.Images
        nativeAssetImages={['pin']}
        images={images}
        onImageMissing={(imageKey) =>
          this.setState({
            images: {...this.state.images, [imageKey]: openIcon},
          })
        }
      />
      </>
    );
  }
  offlineLoad =  async () => {
    try {
      const name = 'story'+this.state.story.id;
      const offlinePack = await MapboxGL.offlineManager.getPack(name);
      // .region.styleURL
      this.setState({offlinePack: offlinePack});
      return offlinePack;
    } catch(e) {
      console.log(e);
    }
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
        minZoom: 16,
        maxZoom: 20,
        bounds: [[box[0], box[1]], [box[2], box[3]]]
      }, progressListener, errorListener);
      Toast.showWithGravity(I18n.t("End_download_map","End map download"), Toast.SHORT, Toast.TOP);
      return progressListener;
    } catch(e) {
      console.log(e);
    }
  }
  switchToAR = () => {
    const {index, story, unset, debug_mode, distance} = this.state;
    console.log('switch2ar', index);
    let newIndex =(parseInt(index) <= story.stages.length) ? (parseInt(index)+1) : story.stages.length;
    console.log('newIndex', newIndex);
    Toast.showWithGravity(I18n.t("Entering_ar","Entering in Augmented Reality ..."), Toast.SHORT, Toast.TOP);
    if(this.whoosh) this.whoosh.release();
    this.setState({unset: true, timeout: 0, index: (index+1)});
    this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: story, index: newIndex, debug: debug_mode, distance: distance});
  }
  showDistance = () => (this.state.distance) ? (this.state.distance*1000) : ''
  renderActions() {
    const {routeSimulator, theme, completed, index, audioButton, audioPaused, unset, debug_mode, distance, radius} = this.state;
    if (this.state.routeSimulator) {
      return null;
    }
    const rstyles = StyleSheet.create({
      footer: {
        flex: 0,
        flexDirection:'column',
        alignItems:'stretch',
        minHeight: NAV_BAR_HEIGHT,
        margin: 0,
        padding: 0,
        borderWidth: 0,
        backgroundColor: theme.color1,
        alignContent: 'stretch',
        justifyContent:'center'
      },
      menu: {
        backgroundColor: theme.color1,
      }
    });
    const storyLocation = () => <Icon size={30} name='location' type='booksonwall' color='#fff' onPress={() => this.goTo([this.state.position.coords.longitude,this.state.position.coords.latitude], true)} />;
    const storyDestination = () => <Icon size={30} name='destiny' type='booksonwall' color='#fff' onPress={() => this.goTo(this.state.destination, false)} />;
    const storyOrigin = () =>  <Icon size={30} name='origin' type='booksonwall' color='#fff' onPress={() => this.goTo(this.state.origin, false)} />;
    const launchAR = () =>  <Icon size={30} name='bow-isologo' type='booksonwall' color='#fff' onPress={() => this.switchToAR()} />;
    const launchNavigation = () => <Icon size={30} name='route' type='booksonwall' color='#fff' onPress={() => this.launchNavigation()} />;
    const sound = () => {
        if(audioButton && audioPaused) {
          return <Icon size={30} name='play' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
        } else if (audioButton && !audioPaused) {
          return <Icon size={30} name='pause' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
        } else {
          return null;
        }
    };

    const storyMapDl = () => <Icon size={30} name='download' type='booksonwall' color='#fff' onPress={() => this.offlineSave()} />;
    let MenuButtons = [];
    MenuButtons.push({ element: storyLocation});
    MenuButtons.push({ element: launchNavigation});
    if (completed > 0) MenuButtons.push({ element: storyOrigin});
    MenuButtons.push({ element: storyDestination });
    if((!debug_mode && ((distance*1000) <= radius)) || debug_mode) MenuButtons.push({ element: launchAR });
    MenuButtons.push({ element: storyMapDl});
    if(sound !== null) MenuButtons.push({element: sound});


    return (
      <View style={rstyles.footer}>
        <ButtonGroup style={rstyles.menu}
          buttonStyle={{ backgroundColor: 'transparent', borderWidth: 0, borderColor: '#4B4F53', margin: 0, minHeight: 44, maxHeight: 44}}
          onPress={this.updateMenu}
          selectedIndex={this.state.selectedMenu}
          selectedButtonStyle= {{backgroundColor: '#750000'}}
          buttons={MenuButtons}
          containerStyle= {{flex: 1, borderWidth: 0, borderColor: '#4B4F53', minHeight: 44, maxHeight: 44, backgroundColor: '#750000', borderRadius: 0, margin: 0, padding: 0}}
          innerBorderStyle= {{ color: '#570402' }}
        />
      </View>
    );
  }
  goTo = async (coordinates,followUserLocation ) => {
    try {
      (this.state.followUserLocation !== followUserLocation) ? await this.followUserLocationToggle() : null;
      await this.setState({goto: coordinates});
    } catch(e) {
      console.log(e);
    }

  }
  followUserLocationToggle = () => {
    return this.setState({followUserLocation: !this.state.followUserLocation});
  }
  onUserLocationUpdate = (newUserLocation) => {
    this.setState({position: newUserLocation})
  }
  whoosh = null
  audioPlay = async () => {
    const {story, index, storyDir} = this.state;
    // if we arrive in first stage , no audio can be played as there is no previous onZoneLeave
    const prevIndex = index -1;
    const stage = (index === 0) ? null : story.stages[prevIndex];
    if (stage) {
      const count =  stage.onZoneLeave.length;
      this.setState({audioButton: true});
      if (count > 1) {
        const audio = stage.onZoneLeave[0];
        const audio2 = stage.onZoneLeave[1];
        const loop = audio.loop;
        let path = audio.path;
        let path2 = audio2.path;
        path = storyDir + path.replace("assets/stories/", "");
        path2 = storyDir + path2.replace("assets/stories/", "");
        Sound.setCategory('Playback');

        // Load the sound file path from the app story bundle
        // See notes below about preloading sounds within initialization code below.
        this.whoosh = new Sound(path, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.log('failed to load the sound', error);
            return;
          }
          // loaded successfully
          console.log('duration in seconds: ' + this.whoosh.getDuration() + 'number of channels: ' + this.whoosh.getNumberOfChannels());
          // Loop indefinitely until stop() is called

          // Play the sound with an onEnd callback
          this.whoosh.play((success) => {
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
                    this.setState({audioButton: false});
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
          this.whoosh.release();
        });
      }
      if (count === 1) {
        const audio = stage.onZoneLeave[0];

        const loop = audio.loop;
        let path = audio.path
        path = storyDir + path.replace("assets/stories/", "");
        Sound.setCategory('Playback');
        // Load the sound file path from the app story bundle
        // See notes below about preloading sounds within initialization code below.
        this.whoosh = new Sound(path, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.log('failed to load the sound', error);
            return;
          }
          // loaded successfully
          console.log('duration in seconds: ' + this.whoosh.getDuration() + 'number of channels: ' + this.whoosh.getNumberOfChannels());

          // Play the sound with an onEnd callback
          this.whoosh.play((success) => {
            if (success) {
              this.setState({audioButton: false});
              console.log('successfully finished playing');
            } else {
              console.log('playback failed due to audio decoding errors');
            }
          });
          if(loop) {
            this.whoosh.setNumberOfLoops(-1);
          }
        });
        this.whoosh.release();
      }
    }
  }
  launchNavigation = () => {
    const {story,fromLat, fromLong, toLat, toLong} = this.state;
    this.whoosh.release();
    this.setState({unset: true, timeout: 0});
    NativeModules.MapboxNavigation.navigate(
      fromLat,
      fromLong,
      toLat,
      toLong,
      // profile,
      // access_token
    );
  }
  toggleAudioButton = () => {
    this.setState({audioButton: !this.state.audioButton});
  }
  togglePlaySound = () => {
    this.setState({audioPaused: !this.state.audioPaused});
    console.log(this.state.audioPaused);
    return (!this.state.audioPaused) ? this.whoosh.pause() : this.whoosh.play();
  }
  render() {
    const {unset, completed, selected, theme, story, index, distance, radius, debug_mode} = this.state;
    if(unset) return null;
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
      header: {
        flex: 0,
        flexDirection:'column',
        alignItems:'stretch',
        minHeight: STATUS_BAR_HEIGHT,
        backgroundColor: '#750000',
        alignContent: 'stretch',
        justifyContent:'center'
      },

      location: {
        color: "#FFF",
      },
      complete: {
        color: "#FFF",
      },
      headerBackground: {
        flex: 0,
      },
    });
    return (
      <Page {...this.props}>
        <Header
          distance={distance}
          theme={theme}
          completed={completed}
          story={story}
          styles={styles}
          index={index}
          />
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
          {(!unset) ? this.renderMarkers() : null}
          {this.renderRoute()}
          {this.renderCurrentPoint()}
          {this.renderProgressLine()}
          <MapboxGL.UserLocation
            onUpdate={newUserLocation => this.onUserLocationUpdate(newUserLocation)}
            animated={true}
            visible={true} />

        </MapboxGL.MapView>
        {(!unset) ? this.renderActions() : null}
      </Page>
    );
  }
}

export default ToPath;
