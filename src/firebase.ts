import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged };
export type { User };

// Translation Record interface
export interface TranslationRecord {
  id?: string;
  userId: string;
  problemType: 'existing' | 'ai-generated';
  originalText: string;
  userTranslation: string;
  aiTranslation: string;
  feedback: string;
  score?: number;
  topic?: string;
  difficulty?: string;
  createdAt: Timestamp;
}

// Save translation record to Firestore
export const saveTranslationRecord = async (record: Omit<TranslationRecord, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'translation_records'), {
      ...record,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    // Error saving translation record
    throw error;
  }
};

// Get user's translation records
export const getUserTranslationRecords = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'translation_records'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TranslationRecord[];
  } catch (error) {
    // Error getting translation records
    throw error;
  }
};

// Delete translation record
export const deleteTranslationRecord = async (recordId: string) => {
  try {
    await deleteDoc(doc(db, 'translation_records', recordId));
  } catch (error) {
    // Error deleting translation record
    throw error;
  }
};

// Delete multiple translation records
export const deleteMultipleTranslationRecords = async (recordIds: string[]) => {
  try {
    const deletePromises = recordIds.map(id => deleteDoc(doc(db, 'translation_records', id)));
    await Promise.all(deletePromises);
  } catch (error) {
    // Error deleting multiple translation records
    throw error;
  }
};
