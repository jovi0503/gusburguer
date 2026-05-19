
// /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDPHN3lCCQ1qBzwIRV4TuH5mCnq6oKewe4",
    authDomain: "gusburguer-9f712.firebaseapp.com",
    projectId: "gusburguer-9f712",
    storageBucket: "gusburguer-9f712.firebasestorage.app",
    messagingSenderId: "986216952659",
    appId: "1:986216952659:web:9bc83409887ad941b2a7a6"
};

try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.icon || '/images/logo.svg'
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (error) {
    console.error("Erro ao inicializar Firebase no Service Worker:", error);
}
