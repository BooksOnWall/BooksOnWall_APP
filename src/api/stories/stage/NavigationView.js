import React, { Component } from "react";
import PropTypes from "prop-types";
import { requireNativeComponent } from "react-native";

type Props = {
  origin: {
    lat: number,
    long: number
  },
  destination: {
    lat: number,
    long: number
  },
  style?: Object
};

const MapboxNavigationView = requireNativeComponent(
  "MapboxNavigationView",
  NavigationView
);

export default class NavigationView extends Component<any, Props, any> {
  render() {
    debugger;
    return <MapboxNavigationView style={this.props.style} {...this.props} />;
  }
}

NavigationView.propTypes = {
  origin: PropTypes.shape({
    lat: PropTypes.number,
    long: PropTypes.number
  }).isRequired,
  destination: PropTypes.shape({
    lat: PropTypes.number,
    long: PropTypes.number
  }).isRequired
};
