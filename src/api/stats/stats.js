import React , { Component } from 'react';
import SafeAreaView from 'react-native-safe-area-view';
import { ImageBackground, TouchableOpacity,Image, StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
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
  let memory = await getUsedMemory()
  const stat = {
    name: name,
    sid: sid,
    ssid: ssid,
    values: null,
    data : {
      position: (position) ? position : null,
      appDir: AppDir,
      uniqueId: getUniqueId(),
      systemVersion: getSystemVersion(),
      usedMemory: humanFileSize(memory),
      getFirstInstallTime: await getFirstInstallTime(),
      useragent: await getUserAgent(),
      deviceType: getDeviceType(),
      manufacturer: await getManufacturer(),
      supportedProc: await supportedAbis(),
      isLOcationEnbled: await isLocationEnabled(), // true or false
      android: await getAndroidId(), // androidId here
      is_camera_prensent: await isCameraPresent(),
      locale: RNLocalize.getLocales()[0],
    },
  };
  return stat;
};
const setStat = async (name, sid, ssid ,debug_mode,server, AppDir, position) => {
  let data = await getStat(name, sid, ssid, debug_mode,server, AppDir, position);
  const statURL = server + '/stat';
  await fetch( statURL , {
    method: 'POST',
    headers: {'Access-Control-Allow-Origin': '*', credentials: 'same-origin', 'Content-Type':'application/json'},
    body: JSON.stringify(data)
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
        const stat = await getStat("App install", null, null, debug_mode,server, AppDir, position);
        return await setStat("App install", null, null, debug_mode,server, AppDir, position);
      } catch(e) {
        console.log(e.message);
      }
    }
  }
export { getStat, setStat, statFirstRun };
