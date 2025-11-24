# Enable Firestore Database - Step by Step

## The Issue
Your Firebase config is working, but Firestore Database is not enabled or accessible.

## Solution: Enable Firestore Database

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **roadmap-19885**

### Step 2: Enable Firestore Database
1. In the left sidebar, look for **"Firestore Database"**
2. Click on it
3. If you see a **"Create database"** button:
   - Click **"Create database"**
   - Choose **"Start in test mode"** (for development)
   - Select a **location** (choose the closest to you, e.g., `us-central1`)
   - Click **"Enable"**
   - Wait 1-2 minutes for it to initialize

### Step 3: Set Security Rules
1. After Firestore is created, click the **"Rules"** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

### Step 4: Verify
1. You should see:
   - A "Data" tab (may be empty, that's OK)
   - A "Rules" tab with your security rules
   - No error messages

### Step 5: Refresh Your App
1. Go back to your app
2. Refresh the page (F5)
3. Check the console - you should see "Firebase connected!" instead of timeout

## Still Having Issues?

If you still see timeout after enabling Firestore:
1. Check browser console for specific error codes
2. Make sure you clicked "Publish" on the Rules tab
3. Wait a few minutes after enabling Firestore (it takes time to propagate)

