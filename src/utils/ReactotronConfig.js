import Reactotron from 'reactotron-react-native';
Reactotron
  //.setAsyncStorageHandler(AsyncStorage) // AsyncStorage would either come from `react-native` or `@react-native-community/async-storage` depending on where you get it from
  .configure({
    host: 'localhost', // default is localhost (on android don't forget to `adb reverse tcp:9090 tcp:9090`)
    name: 'BooksOnWall' // would you like to see your app's name?
  })
  .useReactNative({
    asyncStorage: false, // there are more options to the async storage.
    networking: { // optionally, you can turn it off with false.
      ignoreUrls: /symbolicate/
    },
    editor: false, // there are more options to editor
    errors: { veto: (stackFrame) => false }, // or turn it off with false
    overlay: false, // just turning off overlay
  })
  .connect();
