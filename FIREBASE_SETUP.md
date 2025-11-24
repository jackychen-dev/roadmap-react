# Firebase Setup Guide

This guide will help you set up Firebase Firestore for your roadmap application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name (e.g., "roadmap-app")
   - Enable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Enable"

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. If you don't have a web app, click "</>" (Web icon) to add one
5. Register your app with a nickname (e.g., "Roadmap Web App")
6. Copy the `firebaseConfig` object values

## Step 4: Configure Your App

1. Create a `.env` file in the root of your project (copy from `.env.example`)
2. Add your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

3. Replace all the placeholder values with your actual Firebase config values

## Step 5: Set Up Firestore Security Rules (Important!)

1. In Firebase Console, go to "Firestore Database" > "Rules"
2. Update the rules to allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{document=**} {
      allow read, write: if true; // For development - restrict in production!
    }
  }
}
```

3. Click "Publish"

**⚠️ Security Note:** The above rules allow anyone to read/write. For production, you should:
- Add authentication
- Restrict access based on user ID
- Use proper security rules

## Step 6: Test Your Setup

1. Start your development server: `npm run dev`
2. The app will automatically:
   - Use Firestore if configured correctly
   - Fall back to localStorage if Firebase is not configured
3. Check the browser console for any Firebase errors

## How It Works

- **Real-time Sync**: Changes are automatically synced across all devices/tabs
- **Backup**: Data is also saved to localStorage as a backup
- **Fallback**: If Firebase is not configured, the app uses localStorage (current behavior)

## Troubleshooting

### "Firebase initialization error"
- Check that your `.env` file exists and has correct values
- Make sure all environment variables start with `VITE_`
- Restart your dev server after creating/updating `.env`

### "Permission denied" errors
- Check your Firestore security rules
- Make sure rules allow read/write access

### Data not syncing
- Check browser console for errors
- Verify Firestore is enabled in Firebase Console
- Check that your `.env` file is in the project root

## Next Steps

- Add Firebase Authentication for user-specific data
- Set up proper security rules for production
- Consider adding data validation rules

