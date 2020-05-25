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
import { MAPBOX_KEY  } from 'react-native-dotenv';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from 'react-native-fs';
import PulseCircleLayer from './mapbox-gl/showDirection/PulseCircleLayer';
// import PulseCircle from './mapbox-gl/PulseCircleLayer';
// import audio lib
import Sound from 'react-native-sound';
import openIcon from '../../../../assets/nav/point1.png';
import completeIcon from '../../../../assets/nav/point2.png';
import unknownIcon from '../../../../assets/nav/point3.png';

const SCREEN_HEIGHT = Dimensions.get("window").height;
const IS_IPHONE_X = SCREEN_HEIGHT === 812 || SCREEN_HEIGHT === 896;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 44 : 24) : 0;
const HEADER_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_X ? 88 : 64) : 64;
const NAV_BAR_HEIGHT = HEADER_HEIGHT - STATUS_BAR_HEIGHT;

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
    console.log('index',index);
    const origin = (index > 0) ? routes[index].coordinates: location;
    console.log('origin',origin);
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
      routes: routes,
      mbbox: mbbox,
      features: {},
      images: {
        openIcon: openIcon,
        completeIcon: completeIcon,
        unknownIcon: unknownIcon
      },
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
      selected: (index+1),
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
    console.log('index', index);
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
        (this.state.index > 0) ? this.setState({lastPosition}) : this.setState({origin: lastPosition, lastPosition: lastPosition}) ;
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
    (this.whoosh) ? this.whoosh.release() : '';
    if (this.state.routeSimulator) {
      this.state.routeSimulator.stop();
    }
    this.setState({unset: true});
  }
  getSelected = async() => {
    try {
      const {AppDir, story,selected, index} = this.state;
      console.log(AppDir);
      // get history from file
      const storyHF = AppDir + '/stories/' + story.id + '/complete.txt';
      console.log(storyHF);
      // // check if file exist
      await RNFS.exists(storyHF)
      .then( (exists) => {
          if (exists) {
              // get id from file
              RNFetchBlob.fs.readFile(storyHF, 'utf8')
              .then((data) => {
                // handle the data ..
                this.setState({completed: parseInt(data), selected: parseInt(data)});
                return data;
              })
          } else {
              RNFetchBlob.fs.createFile(storyHF, '0', 'utf8').then(()=>{
                this.setState({completed: 0, selected: 1});
                console.log('file created');
              });
          }
      });
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
    const {index, story, unset} = this.state;
    if(this.whoosh) this.whoosh.release();
    console.log(unset);
    this.setState({unset: true});
    console.log('index', index);
    this.props.navigation.push('ToAr', {screenProps: this.props.screenProps, story: story, index: index});
  }
  renderActions() {
    const {routeSimulator, index, audioButton, audioPaused, unset} = this.state;
    console.log('index',index);
    console.log('unset',unset);
    if (this.state.routeSimulator) {
      return null;
    }
    const launchAR = () => <Icon size={30} name='bow-isologo' type='booksonwall' color='#fff' onPress={() => this.switchToAR()} />;
    const storyDestination = () => <Icon size={30} name='destiny' type='booksonwall' color='#fff' onPress={() => this.goTo(this.state.destination, false)} />;
    const storyLocation = () => <Icon size={30} name='location' type='booksonwall' color='#fff' onPress={() => this.goTo([this.state.position.coords.longitude,this.state.position.coords.latitude], true)} />;
    const storyOrigin = () => (index > 0) ? <Icon size={30} name='origin' type='booksonwall' color='#fff' onPress={() => this.goTo(this.state.origin, false)} /> :<Icon size={30} name='route' type='booksonwall' color='#fff' onPress={() => this.launchNavigation()} />;
    const sound = () => {
      console.log('audioButton', audioButton);
      console.log('audioPaused', audioPaused);
        if(audioButton && audioPaused) {
          return <Icon size={30} name='play' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
        } else if (audioButton && !audioPaused) {
          return <Icon size={30} name='pause' type='booksonwall' color='#fff' onPress={() => this.togglePlaySound()} />;
        } else {
          return null;
        }
    };

    const storyMapDl = () => <Icon size={30} name='download' type='booksonwall' color='#fff' onPress={() => this.offlineSave()} />;
    const MenuButtons = [  { element: storyLocation }, { element: storyOrigin}, { element: storyDestination },{ element: launchAR }, { element: storyMapDl}, {element: sound} ];

    return (
      <View style={styles.footer}>
        <ButtonGroup style={styles.menu}
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
    this.setState({unset: true});
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
    const {unset, distanceTotal, completed, selected, theme, story, index} = this.state;
    const Header = () => (
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
          <Text style={styles.complete}>Complete: {(this.state.index+1)}/{story.stages.length} {distanceTotal}m</Text>
        </ImageBackground>

      </View>
    );
    if(unset) return null;
    return (
      <Page {...this.props}>
        <Header />
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
