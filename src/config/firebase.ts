import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

import { env } from "@/config/env";

/**
 * Firebase Admin SDK singleton.
 *
 * Initialized once from the three service-account env vars. The private key
 * comes from a `.env` file where newlines are escaped as `\n`; we unescape
 * them here because env files cannot hold literal newlines.
 *
 * `getApps().length` guards against re-initialization on dev hot-reload
 * (which would throw `app/duplicate-app`).
 */
let firebaseAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;

  const app: App =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}