import React, {Component} from 'react';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {TouchableOpacity, NativeModules,Animated, ImageBackground, Dimensions, Platform, View, StyleSheet, Text} from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Button, ButtonGroup, Icon, Badge} from 'react-native-elements';
import { withNavigationFocus } from 'react-navigation';
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

import openIcon from '../../../../assets/nav/p1.png';
import completeIcon from '../../../../assets/nav/p2.png';
import unknownIcon from '../../../../assets/nav/p3.png';

import {getScore, addNewIndex} from '../../stats/score';

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
      .6,
      /* default */ .7,
    ],
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

const Header = ({styles, position, navigate, isFocused, switchToAR, distance, theme, completed, story, index, goToStoryMap}) => (
  <View style={styles.header}>
    <ImageBackground source={{uri: theme.banner.filePath}} style={styles.headerBackground}>
    <TouchableOpacity style={[styles.iconLeft, {backgroundColor: theme.color2, opacity: .8}]}  onPress={() => goToStoryMap()}>
      <Button onPress={() => goToStoryMap()} type='clear' underlayColor={theme.color1} iconContainerStyle={{ marginLeft: 2}} icon={{name:'leftArrow', size:24, color:'#fff', type:'booksonWall'}} />
    </TouchableOpacity>
      <Badge  value={'Completed: ' + completed} badgeStyle={styles.badgeStyle} textStyle={styles.badgeTextStyle} containerStyle={{ position: 'absolute', top: 20, right: 20 }}/>
      <Text style={styles.texto} >{story.title}</Text>
      <Text style={styles.location}>{story.city + ' • ' + story.state}</Text>
      <Text style={styles.complete}>Complete: {completed}/{story.stages.length} {(parseFloat(distance)*1000)}m</Text>
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

    const sid = this.props.navigation.getParam('story').id;
    const path = this.props.screenProps.AppDir + '/stories/'+sid+'/';

    const theme = this.props.navigation.getParam('story').theme;
    const iconstyles = {
      icon: {
        iconImage: ['get', 'icon'],
        iconOptional: true,
        textIgnorePlacement: true,
        textField: '{label}',
        textSize: 23,
        textMaxWidth: 50,
        textColor: '#FFF',
        textAnchor: 'center',
        textAllowOverlap: true,
        iconSize: [
          'match',
          ['get', 'icon'],
          'completeIcon',
          .6,
          /* default */ .5,
        ],
      },
    };
    const circleStyles = {
      innerCircle: {
        circleStrokeWidth: 3,
        circleStrokeColor: theme.color2,
        circleRadius: 5,
        circleColor: theme.color2,
        circleBlur: .5,
        circleOpacity: .9,

      },
      innerCirclePulse: {
        circleStrokeWidth: 3,
        circleStrokeColor: theme.color2,
        circleRadius: 2,
        circleColor: theme.color2,
        circleBlur: .5,
        circleOpacity: .8,
      },
    }

    this.state = {
      prevLatLng: null,
      track: null,
      distanceTotal:null,
      latitude: null,
      record: null,
      showUserLocation: true,
      origin: null,
      destination: null,
      goto: null ,
      zoom: 18,
      unset: (this.props.isFocused) ? false : true,
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
      radius: null, // in meters
      position: null,
      fromLat: null,
      fromLong: null,
      toLong: null,
      toLat: null,
      score: null,
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
      index: null,
      selected: null,
      completed: null,
      audioPaused: false,
      audioButton: false,
      fromLat: null,
      fromLong: null,
      toLat: null,
      toLong: null,
      theme: this.props.navigation.getParam('story').theme,
      location: [],
      position: {},
    };

    this.onStart = this.onStart.bind(this);
  }
  calcNav = (index, selected, completed) => (parseInt(selected) < parseInt(completed)) ? parseInt(selected) : parseInt(index)
  getNav = async () => {
    const {story, AppDir, routes, location} = this.state;
      try {
        const sid = parseInt(story.id);
        const path = AppDir + '/stories/'+sid+'/';
        const score = await getScore({sid, ssid, order, path});
        const newIndex = this.props.navigation.getParam('index');
        const index = this.calcNav(score.index, newIndex, score.completed);
        const prevIndex = (index > 0) ? (index-1) : null;
        const origin = (prevIndex) ? routes[prevIndex].coordinates: location;
        const radius = parseFloat(story.stages[index].radius);
        const ssid = parseInt(story.stages[index].id);
        const order = parseInt(story.stages[index].stageOrder);
        const goto = routes[index].coordinates;
        const destination = routes[index].coordinates;
        const fromLat = origin[1];
        const fromLong = origin[0];
        const toLat= routes[index].coordinates[1];
        const toLong= routes[index].coordinates[0];
        const selected = ((index+1) < score.completed) ? (index+1): score.selected;
        console.log('index', index);
        console.log('selected', selected);

        this.setState({
          prevIndex,
          origin,
          radius,
          ssid,
          goto,
          destination,
          fromLat,
          fromLong,
          timeout: 3000,
          unset: false,
          toLat,
          toLong,
          order,
          score,
          selected,
          completed: score.completed,
          index: index,
        });
        return score;
      } catch(e) {
        console.log(e.message);
      }
  }
  onStart = () => {
    const {route} = this.state;
    const routeSimulator = new RouteSimulator(route);
    routeSimulator.addListener(currentPoint => this.setState({currentPoint}));
    routeSimulator.start();
    this.setState({routeSimulator});
  }
  goToStoryMap = async () => {
    const {index, story, selected, completed} = this.state;
    try {
      // clear everything
      if(this.whoosh) await this.whoosh.release();
      MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
      await this.clearGPS();
      if(this.focusListener) await this.focusListener.remove();
      return this.props.navigation.push('StoryMap', {screenProps: this.props.screenProps, story: story, index: index}) ;
    } catch(e) {
      console.log(e.message);
    }

  }
  load = async () => await this.getNav()
  componentDidMount = async () => {
    try {

      const { navigation } = this.props;
    //Adding an event listner om focus
    //So whenever the screen will have focus it will set the state to zero
      this.props.navigation.addListener('willFocus',this.load);
      await this.getNav();
      await this.offlineLoad();

      MapboxGL.setTelemetryEnabled(false);
      await this.setItinerary();
      await this.audioPlay();

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
  setItinerary = async () => {
    const {routes, index} = this.state;
    let points = routes.slice((index-1), index+1);
    console.log('points',points);
    console.log('index',index);
    console.log('routes',routes);
    if(index > 0) {
      const reqOptions = {
        waypoints: points,
        profile: 'walking',
        geometries: 'geojson',
      };

      const res = await directionsClient.getDirections(reqOptions).send();

      this.setState({
        route: makeLineString(res.body.routes[0].geometry.coordinates),
      });
      //this.onStart();
    }
  }
  getDistance = async (position, index, story, debug_mode, radius, timeout) => {
    const { navigate } = this.props.navigation;
    try {
      // console.log('accuracy',position.coords.accuracy);
      // console.log('radius type of', typeof(radius));
      const precision = (position.coords.accuracy && position.coords.accuracy <= 15) ?  (radius + position.coords.accuracy ) : (radius+10);
      // console.log('precision',precision);
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
        console.log('timeout', timeout);
        console.log('dis', dis);
        if (dis && timeout > 0) {
          this.setState({distance: dis.toFixed(3)});
        };
        if (this.props.isFocused && dis && radius > 0 && (dis*1000) <= precision && timeout > 0) {
          // clear everything
          if(this.whoosh) await this.whoosh.release();
          MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
          await this.clearGPS();

          if(this.focusListener) await this.focusListener.remove();
          return this.switchToAR();
        }
    } catch(e) {
      console.log(e);
    }
  }
  getCurrentLocation = async () => {
    const {story, index, timeout, radius, debug_mode} = this.state;
    console.log('Location index', index);
    try {
      // Instead of navigator.geolocation, just use Geolocation.
      Toast.showWithGravity(I18n.t("Getting_GPS","Please wait , Trying to get your position ..."), Toast.SHORT, Toast.TOP);
      await Geolocation.getCurrentPosition(
        position => {
          this.setState({
            position,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
            this.getDistance(position, index, story, debug_mode, radius, timeout);
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: timeout, maximumAge: 3000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => this.getDistance(position, index, story, debug_mode, radius, timeout),
      error => error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: timeout, maximumAge: 3000, enableHighAccuracy: true, distanceFilter: 1},
      );
    } catch(e) {
      console.log(e);
    }
  }
  watchID: ?number = null;
  cancelTimeout = async () => await this.setState({timeout: 0})
  componentWillUnmount = async () => {
    const {routeSimulator} = this.state;
    try {
      if(this.whoosh) await this.whoosh.release();
      MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
      await this.clearGPS();
      if(routeSimulator) await routeSimulator.stop();
      if(this.focusListener) await this.focusListener.remove();
    } catch(e) {
      console.log(e.message);
    }
  }
  clearGPS = async () => {
    try {
      await this.cancelTimeout();
      await Geolocation.clearWatch(this.watchID);
      return this.watchID = null;
    } catch(e) {
      console.log(e.message);
    }

  }
  renderRoute = (layerStyles) => {
    const {route} = this.state;
    if (!route) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource id="routeSource" shape={route}>
        <MapboxGL.LineLayer
          id="routeFill"
          style={layerStyles.route}
          belowLayerID="destination"
          />
      </MapboxGL.ShapeSource>
    );
  }

  renderCurrentPoint() {
    const {currentPoint} = this.state;
    if (!currentPoint) {
      return;
    }
    return (
      <PulseCircleLayer
        shape={currentPoint}
        aboveLayerID="destination"
        />
    );
  }

  renderProgressLine = (layerStyles) => {
    const {currentPoint, index, route} = this.state;
    if (!currentPoint || !route) {
      return null;
    }
    console.log('route',route);
    let coords = route.geometry.coordinates.filter(
      (c, i) => i <= index,
    );
    coords.push(currentPoint);
    if (coords.length < 2) {
      return null;
    }
    console.log('coords', coords);
    const lineString = makeLineString(coords);
    console.log('linestring',lineString);
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


  renderMarkers = (layerStyles) => {

    const {index, currentPoint, images} = this.state;
    let backgroundColor = '#750000';
    if (currentPoint) {
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
  jumpToNext = async () => {
    const {story, AppDir, index,selected,completed, debug_mode, distance} = this.state;
    try {
      const sid = story.id;
      const ssid = null;
      let order = 1;
      const path = AppDir + '/stories/'+sid+'/';
      // get score and addNewIndex to jump to the next stage without using the AR
      let score = await getScore({sid, ssid, order, path});
      score.completed=(score.completed +1);
      score.selected=(score.selected +1);
      score.index=(score.completed < story.stages.length) ? (score.index +1) : score.index;
      await addNewIndex({sid, ssid, order: score.selected, path, newIndex: score.index, completed: score.completed});
      // clear everything
      if(this.whoosh) await this.whoosh.release();
      MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
      await this.clearGPS();
      if(this.focusListener) await this.focusListener.remove();
      return (score.completed < story.stages.length)
      ?
      await this.props.navigation.push('ToPath', {screenProps: this.props.screenProps, story: story, index: score.index, debug: debug_mode, distance: distance})
      :
      await this.props.navigation.push('StoryComplete', {screenProps: this.props.screenProps, story: story, index: score.index, debug: debug_mode, distance: distance});
    } catch(e) {
      console.log(e.message);
    }

  }
  switchToAR = async () => {
    const {index, timeout, story, unset, debug_mode, selected, completed, distance} = this.state;
    console.log('index', index);
    console.log('timeout', timeout);
    console.log('unset', unset);
    try {
      let newIndex =(index <= story.stages.length) ? (index+1) : story.stages.length;
      newIndex = (index === 0 && selected === 1 && completed === 0) ? 0 : newIndex;
      Toast.showWithGravity(I18n.t("Entering_ar","Entering in Augmented Reality ..."), Toast.SHORT, Toast.TOP);
      // clear everything
      if(this.whoosh) await this.whoosh.release();
      MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
      await this.clearGPS();
      if(this.focusListener) await this.focusListener.remove();
      this.props.navigation.push('ToAr', {screenProps: this.props.screenProps, story: story, index: newIndex, debug: debug_mode, distance: distance});
    } catch(e) {
      console.log(e.message);
    }
  }
  showDistance = () => (this.state.distance) ? (this.state.distance*1000) : ''
  renderActions() {
    const {theme, completed, index, audioButton, audioPaused, unset, debug_mode, distance, radius} = this.state;

    const rstyles = StyleSheet.create({
      footer: {
        flex: 0,
        flexDirection:'column',
        alignItems:'stretch',
        minHeight: NAV_BAR_HEIGHT,
        margin: 0,
        padding: 0,
        borderWidth: 0,
        backgroundColor: theme.color2,
        alignContent: 'stretch',
        justifyContent:'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 9 },
        shadowOpacity: 0.9,
        shadowRadius: 0,
        elevation: 1,
      },
      menu: {
        backgroundColor: theme.color1,
      },
      button: {
        borderRadius: 3,
        backgroundColor: theme.color2,
      },
      buttonCnt: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'transparent',
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
      },
      containerMenu: {
        flex: 1,
        borderWidth: 0,
        backgroundColor:  theme.color2,
      },
      innerLine: {
        width: 3,
        color:theme.color2,
      },
    });
    const storyLocation = () => <Icon size={32} name='location' type='booksonWall' color='#fff' onPress={() => this.goTo([this.state.position.coords.longitude,this.state.position.coords.latitude], true)} />;
    const storyDestination = () => <Icon size={32} name='destiny' type='booksonWall' color='#fff' onPress={() => this.goTo(this.state.destination, false)} />;
    const storyOrigin = () =>  <Icon size={32} name='origin' type='booksonWall' color='#fff' onPress={() => this.goTo(this.state.origin, false)} />;
    const launchAR = () =>  <Icon size={32} name='isologo' type='booksonWall' color='#fff' onPress={() => this.switchToAR()} />;
    const jumpToNext = () =>  <Icon size={32} name='skip-next' type='Feather' color='#fff' onPress={() => this.jumpToNext()} />;
    const launchNavigation = () => <Icon size={32} name='navi' type='booksonWall' color='#fff' onPress={() => this.launchNavigation()} />;
    const sound = () => {
        if(audioButton && audioPaused) {
          return <Icon size={32} name='play' type='booksonWall' color='#fff' onPress={() => this.togglePlaySound()} />;
        } else if (audioButton && !audioPaused) {
          return <Icon size={32} name='pause' type='booksonWall' color='#fff' onPress={() => this.togglePlaySound()} />;
        } else {
          return null;
        }
    };

    const storyMapDl = () => <Icon size={32} name='download' type='booksonWall' color='#fff' onPress={() => this.offlineSave()} />;
    let MenuButtons = [];
    MenuButtons.push({ element: storyLocation});
    if(distance && distance > 1) MenuButtons.push({ element: launchNavigation});
    if (index > 0) MenuButtons.push({ element: storyOrigin});
    MenuButtons.push({ element: storyDestination });
    if (debug_mode === true) MenuButtons.push({ element: launchAR });
    //MenuButtons.push({ element: storyMapDl});
    if(sound !== null) MenuButtons.push({element: sound});
    MenuButtons.push({ element: jumpToNext });

    return (
      <View style={rstyles.footer}>
        <ButtonGroup style={rstyles.menu}
          buttonStyle={rstyles.button}
          onPress={this.updateMenu}
          selectedIndex={this.state.selectedMenu}
          selectedButtonStyle= {rstyles.button}
          buttons={MenuButtons}
          containerStyle= {rstyles.containerMenu}
          innerBorderStyle= {rstyles.innerLine}
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
    let stage = (index === 0) ? null : story.stages[prevIndex];
    stage.onZoneLeave = (typeof(stage.onZoneLeave) === 'string') ? JSON.parse(stage.onZoneLeave): stage.onZoneLeave;
    if (stage) {
      const count =  (stage && stage.onZoneLeave) ? stage.onZoneLeave.length : 0;
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
          //console.log('duration in seconds: ' + this.whoosh.getDuration() + 'number of channels: ' + this.whoosh.getNumberOfChannels());
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
          //console.log('duration in seconds: ' + this.whoosh.getDuration() + 'number of channels: ' + this.whoosh.getNumberOfChannels());

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
    return (!this.state.audioPaused) ? this.whoosh.pause() : this.whoosh.play();
  }
  render() {
    const { navigate } = this.props.navigation;
    const {unset, position, completed, selected, theme, story, index, distance, radius, debug_mode} = this.state;

    if(unset || index === null || !this.props.isFocused ) return null;

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
        lineColor: theme.color1,
        lineCap: MapboxGL.LineJoin.Round,
        lineWidth: 7,
        lineOpacity: 0.84,
      },
      progress: {
        lineColor: '#750000',
        lineWidth: 5,
      },
    };
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
        backgroundColor: theme.color2,
      },
      header: {
        flex: 0,
        flexDirection:'column',
        alignItems:'stretch',
        minHeight: STATUS_BAR_HEIGHT,
        backgroundColor: theme.color1,
        alignContent: 'stretch',
        justifyContent:'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -9 },
        shadowOpacity: 0.9,
        shadowRadius: 0,
        padding: 1,
        paddingHorizontal: 0
      },
      footer: {
        flex: 0,
        flexDirection:'column',
        alignItems:'stretch',
        minHeight: NAV_BAR_HEIGHT,
        margin: 0,
        padding: 0,
        borderWidth: 0,
        backgroundColor: theme.color2,
        alignContent: 'stretch',
        justifyContent:'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 9 },
        shadowOpacity: 0.9,
        shadowRadius: 0,
        elevation: 1,
       },
      texto: {
        fontSize: 26,
        letterSpacing: 1,
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowRadius: 2,
        fontFamily: story.theme.font1
      },
      menu: {
        backgroundColor: theme.color1,
      },
      location: {
        color: "#FFF",
      },
      complete: {
        color: "#FFF",
      },
      headerBackground: {
        flex: 0,
        padding: 40,
      },
      badgeStyle:{
        backgroundColor: theme.color1
      },
      badgeTextStyle: {
        fontSize: 9,
      },
      containerMenu: {
        flex: 1,
        borderWidth: 0,
        backgroundColor:  theme.color2,
      },
      innerLine: {
        width: 3,
        color:theme.color2,
      },
      iconLeft: {
        width: 45,
        height: 45,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
      }
    });
    return (
      <Page {...this.props}>

        <Header
          distance={distance}
          theme={theme}
          completed={completed}
          story={story}
          switchToAR={this.switchToAR}
          isFocused={this.props.isFocused}
          position={position}
          navigate={navigate}
          goToStoryMap={this.goToStoryMap}
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
          {(!unset) ? this.renderMarkers(layerStyles) : null}
          {this.renderRoute(layerStyles)}

          {/*this.renderProgressLine(layerStyles) */}
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

export default withNavigationFocus(ToPath);
