import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { Dimensions, ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { Icon, registerCustomIconType } from 'react-native-elements';
import I18n from "../../utils/i18n";
import IconSet from '../../utils/Icon';
import Orientation from 'react-native-orientation';
import * as RNLocalize from "react-native-localize";
import {
  isCameraPresent,
  getCarrier,
  getDevice,
  getDeviceType,
  getSystemVersion,
  getUsedMemory,
  getHardware,
  getApplicationName,
  getFirstInstallTime,
  getUserAgent,
  getUniqueId,
  supportedAbis,
  isLocationEnabled,
  android,
  getAndroidId,
  getManufacturer } from 'react-native-device-info';
registerCustomIconType('booksonwall', IconSet);

const getStat = async (name, sid, ssid, debug_mode,server, AppDir, position) => {
  try {
    let memory = await getUsedMemory();
    let dimension = Dimensions.get('window');
    dimension.width=Math.round(dimension.width);
    dimension.height=Math.round(dimension.height);
    const stat = {
      name: name,
      sid: sid,
      ssid: ssid,
      values: null,
      uniqueId: getUniqueId(),
      data : {
        position: (position) ? position : null,
        applicationName: await getApplicationName(),
        appDir: AppDir,
        orientation: Orientation.getInitialOrientation(),
        screenDimension: dimension,
        carrier: await getCarrier(),
        harware: await getHardware(),
        systemVersion: getSystemVersion(),
        usedMemory: humanFileSize(memory),
        firstInstallTime: await getFirstInstallTime(),
        useragent: await getUserAgent(),
        device: await getDevice(),
        deviceType: getDeviceType(),
        manufacturer: await getManufacturer(),
        supportedProc: await supportedAbis(),
        isLocationEnabled: await isLocationEnabled(), // true or false
        android: await getAndroidId(), // androidId here
        is_camera_prensent: await isCameraPresent(),
        locale: RNLocalize.getLocales()[0],
      },
    };
    return stat;
  } catch(e) {
    console.log(e);
  }
};
const setStat = async (name, sid, ssid , debug_mode, server, AppDir, position, extra) => {
  try {
    let stat = await getStat(name, sid, ssid, debug_mode, server, AppDir, position);
    if(extra) stat.data.extra = extra;
    const statURL = server + '/stat';
    await fetch( statURL , {
      method: 'POST',
      headers: {'Access-Control-Allow-Origin': '*', credentials: 'same-origin', 'Content-Type':'application/json'},
      body: JSON.stringify(stat)
    })
    .then(response => {
      if (response && !response.ok) { throw new Error(response.statusText);}
      return response.json();
    })
    .then(data => {
        if(data) {
          console.log(data);
        }
    })
    .catch((error) => {
      // Your error is here!
      console.error(error);
    });
    return "toto";
  } catch(e) {
    console.log(e);
  }
};
const humanFileSize= (bytes, si) => {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}
const statFirstRun = async (name, sid, ssid,debug_mode,server, AppDir, position) => {
    if(!debug_mode) {
      try {
        return await setStat(name, sid, ssid, debug_mode,server, AppDir, position);
      } catch(e) {
        console.log(e.message);
      }
    }
  }
export { getStat, setStat, statFirstRun };
