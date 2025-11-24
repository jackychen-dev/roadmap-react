# Setting Up Firebase on Vercel

## ✅ Good News!
Your Firebase integration will work on Vercel, but you need to configure environment variables in Vercel's dashboard.

## 🔧 Step-by-Step Setup

### Step 1: Go to Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Sign in
3. Find your project: **roadmap-react** (or whatever you named it)

### Step 2: Add Environment Variables
1. Click on your project
2. Go to **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. Add these 6 variables one by one:

```
VITE_FIREBASE_API_KEY = AIzaSyCCDk-vTY1wN5UfpUavM8B_-eXvp7HdNpI
VITE_FIREBASE_AUTH_DOMAIN = roadmap-19885.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = roadmap-19885
VITE_FIREBASE_STORAGE_BUCKET = roadmap-19885.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 513870187138
VITE_FIREBASE_APP_ID = 1:513870187138:web:695220e27c7c35c3cf829b
```

**Important:**
- Make sure to select **Production**, **Preview**, and **Development** environments
- Click **Save** after each variable

### Step 3: Redeploy
After adding all environment variables:
1. Go to **Deployments** tab
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger automatic redeploy

### Step 4: Verify
1. Visit your Vercel URL (e.g., `your-app.vercel.app`)
2. Check if you see: **"✅ Firebase connected! Data is syncing to cloud."**
3. Add a test task
4. Check Firebase Console to verify data is being saved

## 🔍 Quick Check

After redeploying, verify:
- ✅ Status message shows "Firebase connected!"
- ✅ Tasks save and persist
- ✅ Data appears in Firestore console
- ✅ No errors in browser console

## ⚠️ Common Issues

**Issue:** Still shows "localStorage" message
- **Fix:** Make sure you redeployed after adding environment variables

**Issue:** Environment variables not working
- **Fix:** Check that variable names start with `VITE_` (required for Vite)
- **Fix:** Make sure you selected all environments (Production, Preview, Development)

**Issue:** Firebase works locally but not on Vercel
- **Fix:** Double-check all 6 variables are added correctly
- **Fix:** Make sure there are no extra spaces or quotes in the values

## 📝 Copy-Paste Values for Vercel

Here are your values ready to paste:

**Variable 1:**
- Key: `VITE_FIREBASE_API_KEY`
- Value: `AIzaSyCCDk-vTY1wN5UfpUavM8B_-eXvp7HdNpI`

**Variable 2:**
- Key: `VITE_FIREBASE_AUTH_DOMAIN`
- Value: `roadmap-19885.firebaseapp.com`

**Variable 3:**
- Key: `VITE_FIREBASE_PROJECT_ID`
- Value: `roadmap-19885`

**Variable 4:**
- Key: `VITE_FIREBASE_STORAGE_BUCKET`
- Value: `roadmap-19885.firebasestorage.app`

**Variable 5:**
- Key: `VITE_FIREBASE_MESSAGING_SENDER_ID`
- Value: `513870187138`

**Variable 6:**
- Key: `VITE_FIREBASE_APP_ID`
- Value: `1:513870187138:web:695220e27c7c35c3cf829b`

## 🎉 After Setup

Once configured:
- Your app on Vercel will use the same Firebase database
- Data will sync between local development and production
- All users will share the same data (unless you add authentication later)

