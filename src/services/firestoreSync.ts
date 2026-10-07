import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  firestore, 
  handleFirestoreError, 
  OperationType,
  auth
} from './firebase';
import { db } from './db';

let isSyncing = false;

export async function syncEntityToFirestore(collectionName: string, id: string | number, data: any) {
  if (!auth.currentUser) return; // Only sync when authenticated
  try {
    const docRef = doc(firestore, collectionName, id.toString());
    // Convert undefined to null for Firestore compatibility
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, {
      ...cleanData,
      _synced_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

export async function syncDeleteToFirestore(collectionName: string, id: string | number) {
  if (!auth.currentUser) return;
  try {
    const docRef = doc(firestore, collectionName, id.toString());
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

/**
 * Initializes real-time listener on key collections when user logs in
 */
export function initFirestoreLiveSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const usersCol = collection(firestore, 'users');
    onSnapshot(usersCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const cloudUser = change.doc.data() as any;
          if (cloudUser && cloudUser.email) {
            const localUsers = db.getUsers(true);
            const exists = localUsers.find(u => u.email === cloudUser.email || u.id === Number(cloudUser.id));
            if (!exists && cloudUser.name) {
              db.insertUser({
                name: cloudUser.name,
                email: cloudUser.email,
                phone: cloudUser.phone || '',
                role_id: Number(cloudUser.role_id) || 4,
                avatar: cloudUser.avatar,
                bio: cloudUser.bio,
                status: cloudUser.status || 'active',
                club_name: cloudUser.club_name,
                membership_tier: cloudUser.membership_tier || 'standard',
              });
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
  } catch (error) {
    console.warn('Live sync initialization notice:', error);
  }
}
