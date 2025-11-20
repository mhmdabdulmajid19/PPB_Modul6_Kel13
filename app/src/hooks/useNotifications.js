import { useState } from "react";

/**
 * Hook sederhana untuk notifikasi tanpa expo-notifications
 * Karena SDK 53 sudah menghapus push notifications dari Expo Go
 */
export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(null);

  // Function dummy untuk mengirim local notification
  const sendLocalNotification = async (title, body, data = {}) => {
    console.log("Local Notification:", { title, body, data });
    // Dalam production, ini akan diganti dengan push notification service
    // atau menggunakan development build yang support expo-notifications
  };

  return {
    expoPushToken: "", // Empty karena tidak ada push token di Expo Go SDK 53
    notification,
    sendLocalNotification,
  };
}