# Firebase Troubleshooting Guide

## Issue: Stuck on "Loading Firebase..."

### Most Common Causes:

### 1. **Firestore Security Rules** (Most Likely!)

Your Firestore security rules might be blocking access. Check and fix:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Make sure your rules allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{document=**} {
      allow read, write: if true; // For development/testing
    }
    match /test/{document=**} {
      allow read, write: if true; // For connection testing
    }
  }
}
```

5. Click **"Publish"** to save the rules

### 2. **Check Browser Console**

Open Developer Tools (F12) and check for errors:
- Look for red error messages
- Common errors:
  - `PERMISSION_DENIED` → Security rules issue
  - `UNAUTHENTICATED` → Authentication required
  - `NETWORK_ERROR` → Connection issue

### 3. **Verify Firebase Config**

Make sure your `.env` file has ALL 6 values filled in:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 4. **Restart Dev Server**

After updating `.env` or Firestore rules:
1. Stop the server (Ctrl+C)
2. Start again: `npm run dev`

### 5. **Check Firestore is Enabled**

1. Go to Firebase Console
2. Click **Firestore Database**
3. If you see "Create database", click it and enable Firestore

### Quick Fix:

If you just want to use localStorage for now:
1. Open `.env` file
2. Change `VITE_FIREBASE_PROJECT_ID` back to `YOUR_PROJECT_ID`
3. Restart dev server
4. App will use localStorage instead

