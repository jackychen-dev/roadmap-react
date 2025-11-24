// Test Firebase connection
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    if (!db) {
      return {
        success: false,
        error: 'Firebase not initialized. Check your .env file.',
        details: 'Make sure all VITE_FIREBASE_* variables are set correctly.'
      };
    }

    // Try to read from Firestore
    const testDocRef = doc(db, 'test', 'connection');
    await getDoc(testDocRef);
    
    // Try to write to Firestore
    await setDoc(testDocRef, { 
      timestamp: new Date().toISOString(),
      test: true 
    }, { merge: true });

    return {
      success: true,
      message: 'Firebase connection successful!',
      details: 'Firestore is working correctly.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.code || 'Unknown error'
    };
  }
}

