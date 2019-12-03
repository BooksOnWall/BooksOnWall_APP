import React, {Component} from 'react';
import { Card, Animated, StyleSheet, View, Text, I18nManager } from 'react-native';


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
  },
});

export default class Story extends Component {
  static navigationOptions = {
    title: 'Story',
    tabBarVisible: true,
  };
  constructor(props) {
    super(props);
    this.state= {
      story: this.props.navigation.getParam('story'),
    };
  }
  componentDidMount() {
    if (!this.props.navigation.getParam('story') ) this.props.navigation.navigate('Stories');
  }
  render() {
    let story = this.state.story;

    return (
      <View style={styles.container}>
        <Text>Story</Text>
        // <Card>
        //   <Card.Title title={story.title} subtitle={story.aa.name} left={(props) => <Avatar.Icon {...props} icon="folder" />} />
        //   <Card.Content>
        //     <Title>Sinopsys</Title>
        //     <Paragraph>{story.sinopsys}</Paragraph>
        //   </Card.Content>
        //   <Card.Cover source={{ uri: 'https://picsum.photos/700' }} />
        //   <Card.Actions>
        //     <Button onPress={() => this.props.navigation.navigate('Download', {'story': story})} icon="cloud-download" mode="contained"  >Download</Button>
        //     <Button onPress={() => this.props.navigation.navigate('Stages', {'stages': story.stages})} icon="camera" mode="contained">Start</Button>
        //   </Card.Actions>
        // </Card>
      </View>
    );
  }
}
