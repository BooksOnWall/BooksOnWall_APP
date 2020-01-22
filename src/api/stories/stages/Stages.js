import React, {Component} from 'react';
import {  Animated, StyleSheet, View, Text, I18nManager } from 'react-native';
import { FlatList, RectButton } from 'react-native-gesture-handler';


const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },leftAction: {
    flex: 1,
    backgroundColor: '#388e3c',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse'
  },
  actionIcon: {
    width: 30,
    marginHorizontal: 10
  },
  rightAction: {
    alignItems: 'center',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#dd2c00',
    flex: 1,
    justifyContent: 'flex-end'
  },
  container: {
    flex:1,
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    flexDirection: 'row',
    flexWrap:'wrap',
    justifyContent:'center',
  },
  rectButton: {
    flex: 1,
    height: 80,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  separator: {
    backgroundColor: 'rgb(200, 199, 204)',
    height: StyleSheet.hairlineWidth,
  },
  fromText: {
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },
  messageText: {
    color: '#999',
    backgroundColor: 'transparent',
  },
  dateText: {
    backgroundColor: 'transparent',
    position: 'absolute',
    right: 20,
    top: 10,
    color: '#999',
    fontWeight: 'bold',
  },
});

export default class Stages extends Component {
  static navigationOptions = {
    title: 'Stages',
    tabBarVisible: true,
  };
  constructor(props) {
    super(props);
    this.state= {
      stages: this.props.navigation.getParam('stages'),
    };
  }
  componentDidMount() {

  }
  render() {

    return (
      <View style={styles.container}>
        <FlatList
          data={this.state.stages}
          temSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item, index }) => (
            <Swipeable
              friction={2}
              leftThreshold={80}
              rightThreshold={40}
              renderLeftActions={this.renderLeftActions}
              renderRightActions={this.renderRightActions}
              >
              <RectButton style={styles.rectButton} onPress={() => this.props.navigation.navigate('Map', {'stage': item})}>
                <Text style={styles.fromText}>{item.name}</Text>
                <Text numberOfLines={2} style={styles.messageText}>
                  {item.name}
                </Text>
                <Text style={styles.dateText}>
                  {item.updatedAt} {'❭'}
                </Text>
              </RectButton>
              </Swipeable>
          )}
          keyExtractor={(item, index) => `message ${index}`}
          />

      </View>
    );
  }
}
