importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAeAse7523kJjaEDkOk2_2TS82b35FsLdU", // Replace with actual value
  authDomain: "restaurant-d8c26.firebaseapp.com",
  projectId: "restaurant-d8c26",
  storageBucket: "restaurant-d8c26.appspot.com",
  messagingSenderId: "737042296898",
  appId: "1:737042296898:web:a855275efb86d910fbbddb"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png', // Optional: add an icon in public/
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});