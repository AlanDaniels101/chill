import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);


import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyD0VmqD08KTLKKxLEiAcvF-6xnup0-L0mY",
    authDomain: "chill-app-dev.firebaseapp.com",
    projectId: "chill-app-dev",
    storageBucket: "chill-app-dev.firebasestorage.app",
    messagingSenderId: "1075707557290",
    appId: "1:1075707557290:web:2ab9ff7f92bdb263be67d3",
    measurementId: "G-ZE5KQW5JLY"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);