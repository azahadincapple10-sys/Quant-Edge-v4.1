
import { getApps, initializeApp, FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "placeholder-api-key",
  authDomain: "placeholder-project-id.firebaseapp.com",
  projectId: "placeholder-project-id",
  storageBucket: "placeholder-project-id.appspot.com",
  messagingSenderId: "placeholder-sender-id",
  appId: "placeholder-app-id"
};

export function getFirebaseApp(): FirebaseApp {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  return initializeApp(firebaseConfig);
}
