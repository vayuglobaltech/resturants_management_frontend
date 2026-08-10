// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAeAse7523kJjaEDkOk2_2TS82b35FsLdU",
  authDomain: "restaurant-d8c26.firebaseapp.com",
  projectId: "restaurant-d8c26",
  storageBucket: "restaurant-d8c26.appspot.com",
  messagingSenderId: "737042296898",
  appId: "1:737042296898:web:a855275efb86d910fbbddb"
});

const messaging = firebase.messaging();
// Optional background handler
messaging.onBackgroundMessage((payload) => {
  console.log('Background:', payload);
});