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
import { MAPBOX_KEY  } from 'react-native-dotenv';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import PulseCircleLayer from './stage/mapbox-gl/showDirection/PulseCircleLayer';

import openIcon from '../../../assets/nav/point1.png';
import completeIcon from '../../../assets/nav/point2.png';
import unknownIcon from '../../../assets/nav/point3.png';

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
    circleStrokeWidth: 3,
    circleStrokeColor: '#750000',
    circleRadius: 30,
    circleColor: '#750000',
    circleBlur: .8,
    circleOpacity: .9,
  },
  innerCirclePulse: {
    circleStrokeWidth: 3,
    circleStrokeColor: '#750000',
    circleRadius: 60,
    circleColor: '#750000',
    circleBlur: .8,
    circleOpacity: .9,
  },
  outerCircle: {
    circleRadius: 2,
    circleColor: '#FFF',
    circleBlur: 0,
    circleOpacity: .6,
  }
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
  footer: {
    flex: 0,
    flexDirection:'column',
    alignItems:'stretch',
    minHeight: NAV_BAR_HEIGHT,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: '#750000',
    alignContent: 'stretch',
    justifyContent:'center'
  },
  menu: {
    backgroundColor: "#750000",
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


const layerStyles = {
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


class StoryMap extends Component {
  static navigationOptions = {
    title: 'Story Map',
    headerShown: false
  };


  constructor(props) {
    super(props);
    const location = (this.props.navigation.getParam('story')) ? this.props.navigation.getParam('story').geometry.coordinates: null;
    const stages = this.props.navigation.getParam('story').stages;
    console.log(stages);
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
      distanceTotal:null,
      record: null,
      track: null,
      prevLatLng: null,
      radius: 20,
      selected:1,
      completed: null,
      selectedMenu: null,
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
          textSize: 40,
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
         radius={40}
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
  render() {

    const {index, routes , toPath, toAR, distanceTotal, styleURL, selected, completed, theme, story, mapTheme} = this.state;
    if(!mapTheme) return false;

    const Header = () => (
      <View style={styles.header}>
        <ImageBackground source={{uri: theme.banner.filePath}} style={styles.headerBackground}>
        <Badge size="large" status="success" value={'Completed: ' + completed} containerStyle={{ position: 'absolute', top: 10, right: 10 }}/>
          <Text style={{
            fontSize: 26,
            letterSpacing: 1,
            color: "#FFF",
            textShadowColor: 'rgba(0, 0, 0, 0.85)',
            textShadowOffset: {width: 1, height: 1},
            textShadowRadius: 2,
            fontFamily: theme.font1}} >{story.title}</Text>
          <Text style={styles.location}>{story.city + ' • ' + story.state}</Text>
          <Text style={styles.complete}>Complete: {(this.state.index+1)}/{story.stages.length} next in {distanceTotal}m</Text>
        </ImageBackground>

      </View>
    );

    const storyPrev = () => (selected > 0) ? <Icon size={30} name='left-arrow' type='booksonwall' color='#fff' onPress={() => this.prev()} /> :  null;
    const storyMapLine = () => (toPath) ? <Icon size={30} name='map-line' type='booksonwall' color='#fff' onPress={() => this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: (this.state.selected > 0) ? (this.state.selected - 1): 0})} /> : null;
    const launchAR = () => (toAR) ? <Icon size={30} name='bow-isologo' type='booksonwall' color='#fff' onPress={() => this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: (this.state.selected > 0) ? (this.state.selected - 1): 0})} /> : null;
    const storyNext = () => (selected !== routes.length) ? <Icon size={30} name='right-arrow' type='booksonwall' color='#fff' onPress={() => this.next()} /> : null;
    const MenuButtons = [ { element: storyPrev }, { element: launchAR }, { element: storyMapLine }, { element: storyNext} ];

    const Footer = () => (
      <View style={styles.footer}>
      <ButtonGroup style={styles.menu}
        buttonStyle={{ backgroundColor: 'transparent', borderWidth: 0, borderColor: '#4B4F53', margin: 0, minHeight: 44, maxHeight: 44}}
        onPress={(e) => this.updateMenu}
        selectedIndex={this.state.selectedMenu}
        selectedButtonStyle= {{backgroundColor: '#750000'}}
        buttons={MenuButtons}
        containerStyle= {{flex: 1, borderWidth: 0, borderColor: '#4B4F53', minHeight: 44, maxHeight: 44, backgroundColor: '#750000', borderRadius: 0, margin: 0, padding: 0}}
        innerBorderStyle= {{ color: '#570402' }}
      />
      </View>
    );

    return (
      <Page {...this.props}>
        <Header />
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
        <Footer />
      </Page>
    );
  }
}

export default StoryMap;
