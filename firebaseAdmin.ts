
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const serviceAccount = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'firebase-service-account.json'),
    'utf8'
  )
);

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
