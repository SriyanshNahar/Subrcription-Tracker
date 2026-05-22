export const environment = {
  production: false,
  apiUrl: typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.startsWith('192.168.') ||
       window.location.hostname.startsWith('10.') ||
       window.location.hostname.startsWith('172.'))
      ? `http://${window.location.hostname}:5000`
      : ''
    : '',
  firebase: {
    apiKey: "AIzaSyCdndKuPhePMvLBBMefVNP6rNfGqXZ1SZw",
    authDomain: "subtrackr-b11eb.firebaseapp.com",
    projectId: "subtrackr-b11eb",
    storageBucket: "subtrackr-b11eb.firebasestorage.app",
    messagingSenderId: "463708311691",
    appId: "1:463708311691:web:8b720f4badda4a45b3848e",
    measurementId: "G-LNXD7MC6G3"
  },
  recaptchaSiteKey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
};
