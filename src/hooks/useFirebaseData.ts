import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User, Task, TaskComment } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export const useFirebaseData = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Users
    console.log("Starting users listener...");
    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        console.log("Users snapshot received, count:", snapshot.size);
        const usersData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as unknown as User));
        setUsers(usersData);
      },
      (error) => {
        console.error("Users listener error:", error);
      }
    );

    // Listen to Tasks
    const tasksUnsubscribe = onSnapshot(
      query(collection(db, 'tasks'), orderBy('code', 'desc')),
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Task));
        setTasks(tasksData);
        setLoading(false);
      }
    );

    // Listen to Messages
    const messagesUnsubscribe = onSnapshot(
      query(collection(db, 'messages'), orderBy('timestamp', 'asc')),
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          timestamp: (doc.data().timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString()
        } as TaskComment));
        setMessages(messagesData);
      }
    );

    return () => {
      usersUnsubscribe();
      tasksUnsubscribe();
      messagesUnsubscribe();
    };
  }, []);

  const addTask = async (task: Omit<Task, 'id'>) => {
    try {
      await addDoc(collection(db, 'tasks'), {
        ...task,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const sendMessage = async (content: string, authorId: string) => {
    try {
      await addDoc(collection(db, 'messages'), {
        authorId,
        content,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  const updateStaff = async (staff: User) => {
    try {
      // Use the staff's id as the document ID if it exists, otherwise use a new one.
      // In this app, we should use the UID as the ID for clarity.
      await setDoc(doc(db, 'users', staff.id), staff);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${staff.id}`);
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  return {
    tasks,
    users,
    messages,
    loading,
    addTask,
    updateTask,
    deleteTask,
    sendMessage,
    updateStaff,
    deleteStaff
  };
};
