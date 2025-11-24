# Enable Firestore Database - Detailed Steps

## You don't see "Firestore Database" - That's OK! We need to enable it.

### Step 1: Find the Build Section
In Firebase Console, look for one of these in the left sidebar:
- **"Build"** section (might be collapsed)
- **"Firestore Database"** (if it exists but is hidden)
- Or look for **"Realtime Database"** (different service, ignore this)

### Step 2: Enable Firestore Database

**Option A: If you see "Build" section:**
1. Click on **"Build"** to expand it
2. Look for **"Firestore Database"** inside the Build section
3. Click on **"Firestore Database"**

**Option B: If you don't see "Build" or "Firestore Database":**
1. Look for a **"+"** or **"Add product"** button
2. Or go directly to: https://console.firebase.google.com/project/roadmap-19885/firestore
3. You should see a **"Create database"** button

### Step 3: Create the Database
1. Click **"Create database"** button
2. Choose **"Start in test mode"** (for development)
   - This allows read/write access temporarily
   - We'll set proper rules after
3. Select a **location**:
   - Choose the closest to you (e.g., `us-central1`, `us-east1`, `europe-west1`)
   - This is where your data will be stored
4. Click **"Enable"**
5. **Wait 1-2 minutes** for Firebase to set it up

### Step 4: After Creation
You should now see:
- **"Firestore Database"** in the left sidebar
- Tabs: **"Data"**, **"Rules"**, **"Indexes"**, **"Usage"**
- The **"Data"** tab will be empty (that's normal)

### Step 5: Set Security Rules
1. Click the **"Rules"** tab
2. You'll see default test mode rules (they expire after 30 days)
3. Replace with these permanent rules:

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

4. Click **"Publish"**

### Step 6: Test Your App
1. Go back to your app
2. Refresh the page (F5)
3. Check browser console (F12)
4. You should see "Firebase connected!" ✅

## Direct Link
If you can't find it, use this direct link:
https://console.firebase.google.com/project/roadmap-19885/firestore

This will take you directly to Firestore setup for your project.

