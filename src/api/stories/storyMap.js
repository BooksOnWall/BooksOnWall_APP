import React, {Component} from 'react';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {Animated, ImageBackground, Dimensions, Platform, View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {request, check, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {ButtonGroup, Button, Icon, Badge} from 'react-native-elements';

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
// import PulseCircle from './mapbox-gl/PulseCircleLayer';


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
  console.log(dis);
  return (
    <View style={styles.header}>
      <ImageBackground source={{uri: theme.banner.filePath}} style={styles.headerBackground}>
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
        <Text style={styles.complete}>Next in {dis} km </Text>
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
    const index = this.props.navigation.getParam('index');
    const id = this.props.navigation.getParam('story').id;

    this.state = {
      featureCollection: featureCollection([]),
      latitude: null,
      record: null,
      showUserLocation: true,
      origin: routes[index].coordinates,
      destination: routes[(index+1)].coordinates,
      goto: routes[index].coordinates ,
      zoom: 15,
      followUserLocation: false,
      route: null,
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
      timeout: 5000,
      initialPosition: null,
      fromLat: null,
      fromLong: null,
      toLong: null,
      toLat: null,
      lastPosition: null,
      debug_mode:  (DEBUG_MODE === "true") ? true: false,
      distance: (this.props.navigation.getParam('distance')) ? this.props.navigation.getParam('distance') : null,
      radius: 20,
      selected:1,
      completed: null,
      selectedMenu: 0,
      offlinePack: null,
      currentPoint: null,
      routeSimulator: null,
      styleURL: MapboxGL.StyleURL.Dark, // todo import story map styles
      server: this.props.screenProps.server,
      appName: this.props.screenProps.appName,
      AppDir: this.props.screenProps.AppDir,
      storyDir: this.props.screenProps.AppDir + '/stories/',
      story: this.props.navigation.getParam('story'),
      theme: this.props.navigation.getParam('story').theme,
      order: this.props.navigation.getParam('order'),
      index: index,
      location: [],
      position: {},
    };
    console.log('styleURL', this.state.styleURL);
    this.onStart = this.onStart.bind(this);
  }
  showDistance = () => (this.state.distance) ? this.state.distance : ''
  getMapTheme = async () => {
    const id = this.state.story.id;
    const mapThemePath =  this.props.screenProps.AppDir+ '/stories/'+ id +'/map.json';
    await RNFS.exists(mapThemePath)
    .then( (exists) => {
        if (exists) {
            console.log("Map Theme File exist");
            // get id from file
            RNFetchBlob.fs.readFile(mapThemePath, 'utf8')
            .then((data) => {
              // handle the
              const theme =  JSON.parse(data);
              const style = theme.style;
              this.setState({ mapTheme: style});
              return style;
            })
        }
    });
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
      await this.history();
      await this.getMapTheme();
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
  cancelTimeout = () => this.setState({timeout: 0})
  componentWillUnmount() {
    MapboxGL.offlineManager.unsubscribe('story'+this.state.story.id);
    this.cancelTimeout();
    Geolocation.clearWatch(this.watchId);
    this.watchID = null;
    if (this.state.routeSimulator) {
      this.state.routeSimulator.stop();

    }
  }
  getCurrentLocation = async () => {
    const {story, index, timeout} = this.state;
    try {
      // Instead of navigator.geolocation, just use Geolocation.
      await Geolocation.getCurrentPosition(
        position => {
          const initialPosition = position;
          this.setState({
            initialPosition,
            fromLat: position.coords.latitude,
            fromLong: position.coords.longitude});
        },
        error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
        { timeout: timeout, maximumAge: 1000, enableHighAccuracy: true},
      );
      this.watchID = await Geolocation.watchPosition(position => {
        this.setState({lastPosition: position,fromLat: position.coords.latitude, fromLong: position.coords.longitude});
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
            this.setState({distance: dis.toFixed(2)});
          };
      },
      error => error => Toast.showWithGravity(I18n.t("POSITION_UNKNOWN","GPS position unknown, Are you inside a building ? Please go outside."), Toast.LONG, Toast.TOP),
      {timeout: timeout, maximumAge: 1000, enableHighAccuracy: true, distanceFilter: 1},
      );
    } catch(e) {
      console.log(e);
    }
  }
  watchID: ?number = null;
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
      (this.state.followUserLocation !== followUserLocation) ? await this.followUserLocationToggle() : null;
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
  history= async () =>  {
    const {AppDir, routes, index, selected} = this.state;
    // get history from file
    const storyHF = AppDir + '/stories/' + this.state.story.id + '/complete.txt';
    console.log(storyHF);
    // // check if file exist
    await RNFS.exists(storyHF)
    .then( (exists) => {
        if (exists) {
            console.log("History File exist");
            // get id from file
            RNFetchBlob.fs.readFile(storyHF, 'utf8')
            .then((data) => {
              // handle the data ..
              const toPath = (parseInt(data) === routes.length) ? false : true;
              this.setState({toPath: toPath, completed: parseInt(data), selected: (parseInt(data))});
              if (data > 0)   this.goTo(routes[(parseInt(data)-1)].coordinates, false);
              return data;
            })
        } else {
            console.log("File need to be created with index 1");
            RNFetchBlob.fs.createFile(storyHF, '0', 'utf8').then(()=>{
              this.setState({completed: 0});
              console.log('file created');
             });
        }
    });
  }
  enterStage = (e) => {
    const feature = e.nativeEvent.payload;
    const index = feature.properties.index;
    this.goTo(feature.geometry.coordinates);
    this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: index});
    Toast.showWithGravity('Enter: '+feature.properties.label, Toast.SHORT, Toast.TOP);
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
         hitbox={{width: 20, height: 20}}
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
    const max = this.state.routes.length;
    const selected = (parseInt(this.state.selected) < max) ? (parseInt(this.state.selected) + 1) : max;
    this.setState({selected: selected});
    const id = (selected -1);
    const coords = this.state.routes[id].coordinates;
    this.goTo(coords, false);
  }
  launchMap = () => this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: this.state.story, distance: distance, index: (this.state.selected > 0) ? (this.state.selected - 1): 0})
  launchAR = () => this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, distance: distance, index: (this.state.selected > 0) ? (this.state.selected - 1): 0})
  render() {

    const {index, routes , toPath, toAR, distance, debug_mode, styleURL, selected, selectedMenu, completed, theme, story, mapTheme} = this.state;
    if(!mapTheme) return false;
    if(distance && distance !== null && (distance*1000 <= story.stages[index].radius)) this.launchAR();
    const storyPrev = () =>  <Icon size={30} name='left-arrow' type='booksonwall' color='#fff' onPress={() => this.prev()} />;
    const storyMapLine = () => <Icon size={30} name='map-line' type='booksonwall' color='#fff' onPress={() => this.launchMap()} />
    const launchAR = () => <Icon size={30} name='bow-isologo' type='booksonwall' color='#fff' onPress={() => this.launchAR()} />
    const storyNext = () => <Icon size={30} name='right-arrow' type='booksonwall' color='#fff' onPress={() => this.next()} />;
    let MenuButtons = [];
     if (selected > 0) MenuButtons.push({ element: storyPrev });
     if (debug_mode === true && toAR) MenuButtons.push({ element: launchAR });
     if (toPath) MenuButtons.push({ element: storyMapLine });
     if (selected !== routes.length) MenuButtons.push({ element: storyNext});
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

export default StoryMap;
