#!/bin/sh
# Build and publish dist/ to Firebase Hosting, plus the Firestore security rules
# (firebase.json, firestore.rules). Log in once with: npx firebase-tools login
set -e
node scripts/chords/check.mjs
node scripts/landing/build.mjs
npx tsc --noEmit
npx vite build
npx firebase-tools deploy --only hosting,firestore
