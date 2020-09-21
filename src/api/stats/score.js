import React from 'react';
import * as RNFS from 'react-native-fs';
import RNFetchBlob from 'rn-fetch-blob';
import moment from 'moment';
import I18n from "../../utils/i18n";

const validateStage = async ({sid, ssid, order, path}) => {
  // // check if file exist
  try {
   const storyHF = path + 'complete.txt'
   return await RNFS.exists(storyHF)
   .then( (exists) => {
       if (exists) {
           // get id from file
           RNFetchBlob.fs.readFile(storyHF, 'utf8')
           .then((data) => {
             return data;
           })
       } else {
           RNFetchBlob.fs.createFile(storyHF, '0', 'utf8').then(()=>{
             return 0;
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
      const storyHF = path + 'complete.txt'
      await RNFS.exists(storyHF)
      .then( (exists) => {
          if (exists) {
              // get write new value to file
              // rimraf file
              RNFetchBlob.fs.writeFile(storyHF, JSON.stringify(newIndex), 'utf8').then(()=>{
              });

          } else {
              RNFetchBlob.fs.createFile(storyHF, JSON.stringify(newIndex), 'utf8').then(()=>{
              });
          }
      });
      await storeTimestamp({sid, ssid, order, path, newIndex});
  } catch(e) {
    console.log(e.message);
  }

}

const humanTime = (ms) => {
  const duration = moment.duration(ms);
  let humanTime = (duration._data.days > 0 ) ? duration._data.days+' days,' : '';
  humanTime = (duration._data.hours > 0 ) ? humanTime+' '+duration._data.hours: humanTime + '00';
  humanTime = (duration._data.minutes > 0 ) ? humanTime+'::'+duration._data.minutes : humanTime + '::00';
  humanTime = (duration._data.secondes > 0 ) ? humanTime+'::'+duration._data.secondes : humanTime + '::00';
  return humanTime;
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
              RNFetchBlob.fs.readFile(timeHF, 'utf8')
              .then((data) => {
                const time = new Date().getTime();
                console.log('time', time);
                let file = JSON.parse(data);
                const start = file.stages[0].time;
                console.log('file', file);
                console.log('start', start);
                let elapsed = (parseFloat(time) - parseFloat(start));
                elapsed = humanTime(elapsed);
                const stage = {sid: sid, ssid: ssid, order: order, newIndex: newIndex, time: time, elapsed: 0};

                console.log('index',index);
                file.stages.[index] = stage;
                RNFetchBlob.fs.writeFile(timeHF, JSON.stringify(file), 'utf8')
                .then((data) => {return data;})
              })
          } else {
              const time = new Date().getTime();
              const stages = [{sid: sid, ssid: ssid, order: order, newIndex: newIndex, time: time, elapsed: 0 }];
              const file = {stages: stages};
              RNFetchBlob.fs.createFile(timeHF, JSON.stringify(file), 'utf8').then(()=>{
                return 0;
              });
          }
      });
    } catch(e) {
      console.log(e);
    }
}
export { validateStage, addNewIndex, storeTimestamp };
