
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Production: ambil credential dari Environment Variables
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );
} else if (process.env.NODE_ENV !== 'production') {
  // Development lokal: baca file JSON
  serviceAccount = JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'firebase-service-account.json'),
      'utf8'
    )
  );
} else {
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_JSON belum dikonfigurasi!'
  );
}

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
