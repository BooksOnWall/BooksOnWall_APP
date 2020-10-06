import React from 'react';
import * as RNFS from 'react-native-fs';
import RNFetchBlob from 'rn-fetch-blob';
import moment from 'moment';
import I18n from "../../utils/i18n";

const getScore = async ({sid, ssid, order, path}) => {
  // // check if file exist
  try {
   const storyHF = path + 'nav.json';
   const nav = {
     index: (order > 0) ? (order-1) : 0,
     selected: (order) ? order : 1,
     completed: null,
   };
   console.log('nav',nav);
   return await RNFS.exists(storyHF)
   .then( (exists) => {
       if (exists) {
           // get id from file
           return RNFetchBlob.fs.readFile(storyHF, 'utf8')
           .then((data) => {
             return JSON.parse(data);
           })
       } else {
           return RNFetchBlob.fs.createFile(storyHF, JSON.stringify(nav), 'utf8').then(()=>{
             return nav;
           });
       }
   });
  } catch(e) {
    console.log(e.message);
  }

}
const addNewIndex = async ({sid, ssid, order, path, newIndex}) => {
  try {
    // // check if complete need to be updated
    const nav = {
      index: newIndex,
      selected: selected,
      completed: completed,
    };
      const storyHF = path + 'nav.json'
      await RNFS.exists(storyHF)
      .then( (exists) => {
          if (exists) {
              // get write new value to file
              // rimraf file
              return RNFetchBlob.fs.writeFile(storyHF, JSON.stringify(nav), 'utf8').then(()=>{
              });

          } else {
              return RNFetchBlob.fs.createFile(storyHF, JSON.stringify(nav), 'utf8').then(()=>{
              });
          }
      });
      return await storeTimestamp({sid, ssid, order, path, newIndex});
  } catch(e) {
    console.log(e.message);
  }

}

const humanTime = (ms) => {
  let duration = moment.duration(ms, 'milliseconds');
  console.log('duration', duration);
  let humanTime = (duration._days > 0 ) ? duration._data.days+' days,' : '';
  humanTime = (duration._data.hours > 0 ) ? humanTime+' '+duration._data.hours: humanTime + '00';
  humanTime = (duration._data.minutes > 0 ) ? humanTime+':'+duration._data.minutes : humanTime + ':00';
  humanTime = (duration._data.seconds > 0 ) ? humanTime+':'+duration._data.seconds : humanTime + ':00';
  console.log('humanTime', humanTime);
  return humanTime;
}
const getScores = async (path) => {
  try {
    const timeHF = path + 'time.json';
    return await RNFS.exists(timeHF)
    .then( (exists) => {
        if (exists) {
            // get id from file
            return RNFetchBlob.fs.readFile(timeHF, 'utf8')
            .then((data) => {
              return JSON.parse(data);
            });
        }
    });
  } catch(e) {
    console.log(e);
  }
}
const storeTimestamp = async ({sid, ssid, order, path, newIndex }) => {
    // // check if file exist
    try {
      const timeHF = path + 'time.json';
      const index = (newIndex -1);
      return await RNFS.exists(timeHF)
      .then( (exists) => {
          if (exists) {
              // get id from file
             return RNFetchBlob.fs.readFile(timeHF, 'utf8')
              .then((data) => {
                const time = Math.round((new Date()).getTime());
                console.log('time', time);
                let file = JSON.parse(data);
                const start = file.stages[0].time;
                let elapsed = (time-start);
                elapsed = humanTime(elapsed);
                const stage = {sid: sid, ssid: ssid, order: order, newIndex: newIndex, time: time, elapsed: elapsed};
                file.stages[index] = stage;
               return RNFetchBlob.fs.writeFile(timeHF, JSON.stringify(file), 'utf8')
                .then((data) => {return data })
              });
          } else {
              const time = Math.round((new Date()).getTime());
              const stages = [{sid: sid, ssid: ssid, order: order, newIndex: newIndex, time: time, elapsed: 0 }];
              const file = {stages: stages};
             return RNFetchBlob.fs.createFile(timeHF, JSON.stringify(file), 'utf8').then(()=>{
                return 0;
              });
          }
          return true;
      });
    } catch(e) {
      console.log(e);
    }
}
export { getScore,getScores, addNewIndex, storeTimestamp, humanTime };
