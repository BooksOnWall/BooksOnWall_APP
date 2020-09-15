import React, {Component, useState, useEffect, useCallback} from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { RefreshControl, Platform, ImageBackground, ActivityIndicator, ScrollView, Animated, Image, StyleSheet, View, Text, I18nManager, TouchableOpacity, TouchableNativeFeedback } from 'react-native';
import { Button, Header, Card, ListItem, ThemeProvider } from 'react-native-elements';

export default class TabletDefault extends Component {
  static navigationOptions = {
    title: 'Stories landscape',
    headerShown: false
  };
  render() {
    return (
      <Text>Default</Text>
    );
  }
}
