import React, {Component} from 'react';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {Animated, ImageBackground, Dimensions, Platform, View, StyleSheet, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {ButtonGroup, Button, Icon, Badge} from 'react-native-elements';
import { withNavigationFocus } from 'react-navigation';

import Toast from 'react-native-simple-toast';
import RouteSimulator from './stage/mapbox-gl/showDirection/RouteSimulator';
import {directionsClient} from './stage/MapboxClient';
import sheet from './stage/mapbox-gl/styles/sheet';
import I18n from "../../utils/i18n";
import Page from './stage/mapbox-gl/common/Page';
import { MAPBOX_KEY , DEBUG_MODE } from '@env';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import PulseCircleLayer from './stage/mapbox-gl/showDirection/PulseCircleLayer';


import openIcon from '../../../assets/nav/point1.png';
import completeIcon from '../../../assets/nav/point2.png';
import unknownIcon from '../../../assets/nav/point3.png';
import  distance from '@turf/distance';
import Geolocation from '@react-native-community/geolocation';
import {featureCollection, feature} from '@turf/helpers';
import {lineString as makeLineString, bbox, centroid, polygon} from '@turf/turf';
// import PulseCircle from './stage/mapbox-gl/PulseCircleLayer';
import {getScore} from '../stats/score';


const SCREEN_HEIGHT = Dimensions.get("window").height;
const IS_IPHONE_X = SCREEN_HEIGHT === 812 || SCREEN_HEIGHT === 896;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 44 : 24) : 0;
const HEADER_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 88 : 64) : 64;
const NAV_BAR_HEIGHT = HEADER_HEIGHT - STATUS_BAR_HEIGHT;
const circleStyles = {
  innerCircle: {
    circleStrokeWidth: 1,
    circleStrokeColor: '#FFF',
    circleRadius: 10,
    circleColor: '#000',
    circleBlur: 0,
    circleOpacity: .3,
  },
  innerCirclePulse: {
    circleStrokeWidth: 1,
    circleStrokeColor: '#8F2913',
    circleRadius: 20,
    circleColor: '#fff',
    circleBlur: 0,
    circleOpacity: 0,
  },
  outerCircle: {
    circleStrokeWidth: 1,
    circleStrokeColor: '#8F2913',
    circleRadius: 30,
    circleColor: '#fff',
    circleBlur: 0,
    circleOpacity: 0,
  }
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
    lineColor: 'white',
    lineCap: MapboxGL.LineJoin.Round,
    lineWidth: 3,
    lineOpacity: 0.84,
  },
  progress: {
    lineColor: '#8F2913',
    lineWidth: 3,
  },
};

MapboxGL.setAccessToken(MAPBOX_KEY);

const Header = ({styles, distance, theme, completed, story,  index, showDistance}) => {
  let dis = showDistance();
  return (
    <View style={styles.header}>
      <ImageBackground source={{uri: theme.banner.filePath}} style={styles.headerBackground}>
      <TouchableOpacity style={[styles.iconLeft, {backgroundColor: theme.color2, opacity: .8}]}  onPress={() => this.props.navigation.goBack()}>
        <Button onPress={() => this.props.navigation.goBack()} type='clear' underlayColor={theme.color1} iconContainerStyle={{ marginLeft: 2}} icon={{name:'leftArrow', size:24, color:'#fff', type:'booksonWall'}} />
      </TouchableOpacity>
      <Badge size="large" badgeStyle={styles.badgeStyle} textStyle={styles.badgeTextStyle} status="success" value={'Completed: ' + completed} containerStyle={{ position: 'absolute', top: 20, right: 20 }}/>
        <Text style={{
          fontSize: 26,
          letterSpacing: 1,
          color: '#fff',
          textShadowColor: 'rgba(0, 0, 0, 0.85)',
          textShadowOffset: {width: 1, height: 1},
          textShadowRadius: 2,
          fontFamily: theme.font1}} >{story.title}</Text>
        <Text style={styles.location}>{story.city + ' • ' + story.state}</Text>
        <Text style={styles.complete}>Complete: {(index+1)}/{story.stages.length}</Text>
        <Text style={styles.complete}>{(dis && dis !=='') ? 'Next in '+dis+' km': ' '}</Text>
      </ImageBackground>
    </View>
  );
}


const Footer = ({styles, theme, selectedMenu, updateMenu, MenuButtons}) => (
  <View style={styles.footer}>
  <ButtonGroup style={styles.menu}
    buttonStyle={styles.button}
    onPress={(e) => updateMenu}
    selectedIndex={selectedMenu}
    selectedButtonStyle= {styles.button}
    buttons={MenuButtons}
    containerStyle= {styles.containerMenu}
    innerBorderStyle= {styles.innerLine}
  />
  </View>
);
class StoryMap extends Component {
  static navigationOptions = {
    title: 'Story Map',
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
    const id = this.props.navigation.getParam('story').id;
    this.state = {
      featureCollection: featureCollection([]),
      latitude: null,
      record: null,
      ssid: null,
      showUserLocation: true,
      origin: null,
      destination: null,
      goto: null,
      zoom: 15,
      followUserLocation: false,
      stages: stages,
      routes: routes,
      mbbox: mbbox,
      images: {
        openIcon: openIcon,
        completeIcon: completeIcon,
        unknownIcon: unknownIcon
      },
      toPath: true,
      toAR: true,
      mapTheme: null,
      prevLatLng: null,
      track: null,
      timeout: 0,
      fromLat: null,
      fromLong: null,
      toLong: null,
      toLat: null,
      prevIndex: null,
      position: null,
      debug_mode:  (DEBUG_MODE === "true") ? true: false,
      distance: (this.props.navigation.getParam('distance')) ? this.props.navigation.getParam('distance') : null,
      radius: null,
      selected: null,
      completed: null,
      selectedMenu: 0,
      offlinePack: null,
      routeSimulator: null,
      route: null,
      score: null,
      currentPoint: null,
      styleURL: MapboxGL.StyleURL.Dark, // todo import story map styles
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      AppDir: this.props.screenProps.AppDir,
      storyDir: this.props.screenProps.AppDir + '/stories/',
      story: this.props.navigation.getParam('story'),
      theme: this.props.navigation.getParam('story').theme,
      order: null,
      index: null,
      location: location,
      position: {},
    };
    this.onStart = this.onStart.bind(this);
    this.getNav = this.getNav.bind(this);
  }
  getNav = async () => {
    const {story, AppDir, routes, location} = this.state;
      try {
        console.log('routes',routes);
        const sid = story.id;
        const path = AppDir + '/stories/'+sid+'/';
        let ssid = null;
        let order= 1;
        const score = await getScore({sid, ssid, order, path});
        const index = score.index;
        const toPath = (score.complete === routes.length) ? false : true;
        const prevIndex = (index > 0) ? (index-1) : null;
        const origin = (prevIndex) ? routes[prevIndex].coordinates: location;
        const radius = parseFloat(story.stages[index].radius);
        ssid = story.stages[index].id;
        order = parseInt(story.stages[index].stageOrder);
        const goto = routes[index].coordinates;
        const destination = routes[index].coordinates;
        const fromLat = origin[1];
        const fromLong = origin[0];
        const toLat= routes[index].coordinates[1];
        const toLong= routes[index].coordinates[0];
        const timeout = 3000;
        const selected = score.selected;
        const completed = score.completed;

        this.setState({
          index: index,
          toPath: toPath,
          prevIndex: prevIndex,
          origin: origin,
          radius: radius,
          ssid: ssid,
          goto: goto,
          destination: destination,
          fromLat: fromLat,
          fromLong: fromLong,
          toLat: toLat,
          toLong: toLong,
          order: order,
          score: score,
          timeout: timeout,
          selected: selected,
          completed:completed,
        });
        console.log('state',this.state);
        //this.goTo(routes[index].coordinates, false);

      } catch(e) {
        console.log(e.message);
      }
  }
  showDistance = () => (this.state.distance) ? this.state.distance : ''
  getMapTheme = async () => {
    const {story, AppDir } = this.state;
    try {
      const sid = story.id;
      const mapThemePath =  AppDir + '/stories/'+ sid +'/map.json';
      return await RNFS.exists(mapThemePath)
      .then( (exists) => {
          if (exists) {
              console.log("Map Theme File exist");
              // get id from file
              return RNFetchBlob.fs.readFile(mapThemePath, 'utf8')
              .then((data) => {
                // handle the
                const theme =  JSON.parse(data);
                const style = theme.style;
                return this.setState({ mapTheme: style});
              })
          }
      });
    } catch(e) {
      console.log(e.message);
    }
  }
  onStart() {
    const {route} = this.state;
    const routeSimulator = new RouteSimulator(route);
    routeSimulator.addListener(currentPoint => this.setState({currentPoint}));
    routeSimulator.start();
    this.setState({routeSimulator});
  }
  setItinerary = async () => {
    const {routes, index} = this.state;
    const reqOptions = {
      waypoints: routes,
      profile: 'walking',
      geometries: 'geojson',
    };

    const res = await directionsClient.getDirections(reqOptions).send();
    this.setState({
      route: makeLineString(res.body.routes[0].geometry.coordinates),
    });
    //this.onStart();
  }
  componentDidMount = async () => {
    try {
      await this.getNav();
      await this.getMapTheme();
      await this.offlineLoad();
      MapboxGL.setTelemetryEnabled(false);
      await this.setItinerary();
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
      await this.getCurrentLocation();

    } catch(e) {
      console.log(e);
    }
  }
  cancelTimeout = () => this.setState({timeout: 0})
  componentWillUnmount = async() => {
    const {routeSimulator, story} = this.state;
    try {
      await MapboxGL.offlineManager.unsubscribe('story'+story.id);
      this.cancelTimeout();
      await Geolocation.clearWatch(this.watchID);
      this.watchID = null;
      if (routeSimulator) {
        await routeSimulator.stop();
      }
    } catch(e) {
      console.log(e.message);
    }

  }
  getDistance = async (position, index, story, debug_mode, radius, timeout) => {
    try {
      // console.log('accuracy',position.coords.accuracy);
      // console.log('radius type of', typeof(radius));
      const precision = (radius + 20);
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
        //if (dis && radius > 0 && debug_mode === false && (dis*1000) <= radius && timeout > 0) return this.switchToAR();
    } catch(e) {
      console.log(e);
    }
  }
  getCurrentLocation = async () => {
    const {story, debug_mode, index,  timeout} = this.state;
    const radius = parseFloat(story.radius);
    try {
      // Instead of navigator.geolocation, just use Geolocation.
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
  switchToAR = async () => {
    const {index, story, unset, debug_mode, distance} = this.state;
    try {
      let newIndex = (index <= story.stages.length) ? (parseInt(index)+1) : story.stages.length;
      await MapboxGL.offlineManager.unsubscribe('story'+story.id);
      this.cancelTimeout();
      await Geolocation.clearWatch(this.watchID);
      this.watchID = null;
      console.log(newIndex);
      if (routeSimulator) {
        await routeSimulator.stop();
      }
      await Toast.showWithGravity(I18n.t("Entering_ar","Entering in Augmented Reality ..."), Toast.SHORT, Toast.TOP);
      this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: story, index: newIndex, debug: debug_mode, distance: distance});
    } catch(e) {
      console.log(e.message);
    }

  }
  watchID: ?number = null;
  renderRoute() {
    const {route} = this.state;
    if (!route) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource id="routeSource" shape={route}>
        <MapboxGL.LineLayer
          id="routeFill"
          style={layerStyles.route}
          belowLayerID="pulse"
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
        aboveLayerID="pulse"
        />
    );
  }

  renderProgressLine() {
    const {currentPoint, index, route} = this.state;
    if (!currentPoint || !route) {
      return null;
    }

    let coords = route.geometry.coordinates.filter(
      (c, i) => i <= index,
    );
    coords.push(currentPoint);
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
  goTo = async (coordinates,followUserLocation ) => {
    try {
      (followUserLocation && this.state.followUserLocation  && this.state.followUserLocation !== followUserLocation) ? await this.followUserLocationToggle() : null;
      await this.setState({zoom: 20});
      await this.setState({goto: coordinates});
    } catch(e) {
      console.log(e);
    }

    (!followUserLocation) ? this.setState({ followUserLocation: followUserLocation, goto: coordinates}) : this.setState({ followUserLocation: followUserLocation, goto: coordinates}) ;
  }
  followUserLocationToggle = () => {
    return this.setState({followUserLocation: !this.state.followUserLocation});
  }
  onUserLocationUpdate = (newUserLocation) => {
    this.setState({position: newUserLocation})
  }
  enterStage = async (e) => {
    const {distance} = this.state;
    try {
      const feature = e.nativeEvent.payload;
      const index = feature.properties.index;
      await this.goTo(feature.geometry.coordinates);
      //this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: index, distance: distance});
      Toast.showWithGravity('Enter: '+feature.properties.label, Toast.SHORT, Toast.TOP);
      this.launchMap(index);
    } catch(e) {
      console.log(e.message);
    }
  }
  renderStages = () => {
    const {theme, completed, selected, routes, index, images} = this.state;
    const id = (selected -1);
    let features = {
      type: 'FeatureCollection',
      features: []
    };

    if (routes && routes.length > 1) {
      features.features = routes.map((stage, i) => {
        const completedIndex = (completed === 0) ? 0: (completed-1);
        let icon = (completedIndex > i ) ? 'openIcon' : 'unknownIcon';
        icon = (completedIndex === i) ? 'completeIcon' : icon;

        const feature = {
          type: 'Feature',
          id: 'Stage'+i,
          properties: {
            radius: 40,
            icon: icon,
            index: i,
            label: (i > completedIndex) ? '?' : (i+1),
          },
          geometry: {
            type: 'Point',
            coordinates: stage.coordinates,
          },
        };
        return feature;
      });

      let backgroundColor = 'white';
      const font = theme.font1;
      const iconstyles = {
        icon: {
          iconImage: ['get', 'icon'],
          iconOptional: true,
          textIgnorePlacement: true,
          textField: '{label}',
          textSize: 30,
          textMaxWidth: 50,
          textColor: '#FFF',
          textAnchor: 'center',
          textAllowOverlap: true,
          iconSize: [
            'match',
            ['get', 'icon'],
            'unknownIcon',
            1.4,
            /* default */ 1.2,
          ],
        },
      };
      return (
        <>

       <PulseCircleLayer
         shape={features}
         id="pulse"
         onPress={this.enterStage}
         radius={30}
         pulseRadius={20}
         duration={600}
         innerCircleStyle={circleStyles.innerCircle}
         outerCircleStyle={circleStyles.outerCircle}
         innerCirclePulse={circleStyles.innerCirclePulse}
         />

       <MapboxGL.ShapeSource
         id="StagesShapeSource"
         hitbox={{width: 30, height: 30}}
         onPress={this.enterStage}
         shape={features}
         >
         <MapboxGL.SymbolLayer id="Stage"  uponLayerID="pulse" style={iconstyles.icon} />
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
  }
  updateMenu = (e) => {
    console.log('press', e);

  }
  prev = () => {
    const selected = (this.state.selected > 1) ? (this.state.selected - 1) : 1 ;

    this.setState({selected: selected});
    const id = (selected - 1);
    this.goTo(this.state.routes[id].coordinates, false);
  }
  next = () => {
    let {routes, selected} = this.state;
    const max = routes.length;
    selected = (parseInt(selected) < max) ? (parseInt(selected) + 1) : max;
    this.setState({selected: selected});
    const id = (selected -1);
    const coords = routes[id].coordinates;
    this.goTo(coords, false);
  }
  launchMap = async (newIndex) => {
    const {distance , story, selected,index, completed } = this.state;
    //if(!index) index = this.state.index;
    try {
      await MapboxGL.offlineManager.unsubscribe('story'+story.id);
      this.cancelTimeout();
      console.log('newIndex', newIndex);
      console.log('complete',completed);
      await Geolocation.clearWatch(this.watchID);
      this.watchID = null;
      newIndex = (newIndex && newIndex <= (completed -1)) ? newIndex : index;
      console.log('newIndex', newIndex);
      console.log('index', index);
      this.props.navigation.push('ToPath', {screenProps: this.props.screenProps, story: story, distance: distance, index: newIndex});
    } catch(e) {
      console.log(e.message);
    }
  }
  launchAR = () => {
    const {distance , story, selected, index} = this.state;
    this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: story, distance: distance, index: (selected > 0) ? (selected - 1): 0});
  }
  render() {
    const { navigate } = this.props.navigation;
    const {index, location, routes , goto,  toPath, toAR, distance, debug_mode, styleURL, selected, selectedMenu, completed, theme, story, mapTheme} = this.state;
    if(!mapTheme || !this.props.isFocused ) return <ActivityIndicator style={{flex: 1, backgroundColor: theme.color2, justifyContent: 'center'}} size="large" color={theme.color1} />;
    const storyPrev = () =>  <Icon size={30} name='leftArrow' type='booksonWall' color='#fff' onPress={() => this.prev()} />;
    const storyMapLine = () => <Icon size={30} name='mapLine' type='booksonWall' color='#fff' onPress={() => this.launchMap()} />
    const launchAR = () => <Icon size={30} name='isologo' type='booksonWall' color='#fff' onPress={() => this.launchAR()} />
    const storyNext = () => <Icon size={30} name='rightArrow' type='booksonWall' color='#fff' onPress={() => this.next()} />;
    let MenuButtons = [];
     if (selected > 0) MenuButtons.push({ element: storyPrev });
     if (debug_mode === true && toAR) MenuButtons.push({ element: launchAR });
     if (toPath) MenuButtons.push({ element: storyMapLine });
     if (selected !== (routes.length)) MenuButtons.push({ element: storyNext});
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
         backgroundColor:  theme.color2,
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
         zIndex: 1200,
         elevation: 1,
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
          styles={styles}
          showDistance={this.showDistance}
          index={index}
        />

        <MapboxGL.MapView
          logoEnabled={false}
          compassEnabled={false}
          localizeLabels={true}
          ref={c => (this._map = c)}
          style={sheet.matchParent}
          pitch={60}
          styleURL={styleURL}
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

          {this.renderStages()}
          {this.renderRoute()}
          {/*this.renderProgressLine()*/}
        </MapboxGL.MapView>


        <Footer
          MenuButtons={MenuButtons}
          selectedMenu={selectedMenu}
          styles={styles}
          updateMenu={this.updateMenu}
          />
      </Page>
    );
  }
}

export default withNavigationFocus(StoryMap);
