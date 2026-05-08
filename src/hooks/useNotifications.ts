import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification, NotificationType } from '../types';

export function useNotifications(isAdmin: boolean) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for Admin
  useEffect(() => {
    if (!isAdmin) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AppNotification[];
      setNotifications(notifs);
      setLoading(false);
      
      // Auto cleanup expired notifications
      cleanupExpiredNotifications(notifs);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const cleanupExpiredNotifications = async (currentNotifs: AppNotification[]) => {
    const now = new Date().toISOString();
    const expired = currentNotifs.filter(n => n.expiresAt < now);
    
    for (const n of expired) {
      try {
        await deleteDoc(doc(db, 'notifications', n.id));
      } catch (err) {
        console.error('Error cleaning up notification:', err);
      }
    }
  };

  const createNotification = useCallback(async (
    senderName: string, 
    taskCode: string, 
    taskId: string, 
    type: NotificationType
  ) => {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // +72 hours

      await addDoc(collection(db, 'notifications'), {
        senderName,
        taskCode,
        taskId,
        type,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isRead: false
      });
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    createNotification,
    markAsRead,
    deleteNotification
  };
}
