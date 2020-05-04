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
import PulseCircleLayer from './stage/mapbox-gl/showDirection/PulseCircleLayer';
import mapIcon from '../../../assets/nav/btn_map_point.png';
import openIcon from '../../../assets/nav/btn_map_point.png';
import completeIcon from '../../../assets/nav/btn_map_point.png';
import unknownIcon from '../../../assets/nav/btn_map_point.png';

import {featureCollection, feature} from '@turf/helpers';
import {lineString as makeLineString, bbox, centroid, polygon} from '@turf/turf';
// import PulseCircle from './mapbox-gl/PulseCircleLayer';
// import audio lib
import Sound from 'react-native-sound';

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
  origin: {
    circleRadius: 15,
    circleColor: 'white',
  },
  destination: {
    circleRadius: 30,
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
    this.state = {
      featureCollection: featureCollection([]),
      latitude: null,
      record: null,
      showUserLocation: true,
      origin: routes[0].coordinates,
      destination: routes[1].coordinates,
      goto: routes[0].coordinates ,
      zoom: 15,
      followUserLocation: false,
      route: null,
      stages: stages,
      routes: routes,
      mbbox: mbbox,
      images: {
        example: mapIcon,
        openIcon: openIcon,
        completeIcon: completeIcon,
        unknownIcon: unknownIcon,
        mapIcon: mapIcon,
      },
      prevLatLng: null,
      track: null,
      distanceTotal:null,
      record: null,
      track: null,
      prevLatLng: null,
      radius: 20,
      selected:1,
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
  enterStage = (e) => {
    const feature = e.nativeEvent.payload;
    console.log('You pressed a layer here is your feature', feature);
    const index = feature.properties.index;
    this.goTo(feature.geometry.coordinates);
    this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: index});
    Toast.showWithGravity('iEnter: '+feature.properties.text, Toast.SHORT, Toast.TOP);

  }
  renderStages = () => {
    const {theme, selected, routes, index, images} = this.state;
    const id = (selected -1);
    let features = {
      type: 'FeatureCollection',
      features: []
    };

    if (routes && routes.length > 1) {
      features.features = routes.map((stage, i) => {
        let icon = (index > i ) ? 'openIcon' : 'unknownIcon';
        icon = (index === i) ? 'completeIcon' : icon;
        const feature = {
          type: 'Feature',
          id: 'Stage'+i,
          properties: {
            radius: 40,
            icon: icon,
            index: i,
            label: (index > i) ? '?' : (i+1),
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
          // textFont: font,
          textAnchor: 'center',
          textAllowOverlap: true,
          iconSize: [
            'match',
            ['get', 'icon'],
            'mapIcon',
            .8,
            /* default */ 1,
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
             images: {...this.state.images, [imageKey]: mapIcon},
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
    const selected = (this.state.selected < max) ? (this.state.selected + 1) : max;
    this.setState({selected: selected});
    const id = (selected -1);
    const coords = this.state.routes[id].coordinates;
    this.goTo(coords, false);
  }
  render() {
    const {distanceTotal, selected, theme, story} = this.state;
    const Header = () => (
      <View style={styles.header}>
        <ImageBackground source={{uri: theme.banner.filePath}} style={styles.headerBackground}>
        <Badge size="large" status="success" value={selected} containerStyle={{ position: 'absolute', top: 10, right: 10 }}/>
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
    const storyPrev = () => <Icon size={30} name='left-arrow' type='booksonwall' color='#fff' onPress={() => this.prev()} />;
    const storyMapLine = () => <Icon size={30} name='map-line' type='booksonwall' color='#fff' onPress={() => this.props.navigation.navigate('ToPath', {screenProps: this.props.screenProps, story: this.state.story, index: (this.state.selected - 1)})} />;
    const launchAR = () => <Icon size={30} name='bow-isologo' type='booksonwall' color='#fff' onPress={() => this.props.navigation.navigate('ToAr', {screenProps: this.props.screenProps, story: this.state.story, index: (this.state.selected - 1)})} />;
    const storyNext = () => <Icon size={30} name='right-arrow' type='booksonwall' color='#fff' onPress={() => this.next()} />;
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
            {this.renderStages()}
        </MapboxGL.MapView>
        <Footer />
      </Page>
    );
  }
}

export default StoryMap;
