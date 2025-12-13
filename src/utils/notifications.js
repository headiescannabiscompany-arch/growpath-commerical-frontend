import { Platform } from "react-native";

let Notifications;
let Device;

if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");
  Device = require("expo-device");
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const result = await Notifications.requestPermissionsAsync();
    return result.status === "granted";
  }
  return true;
}

export async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Grow Reminders",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }
}

export async function scheduleTaskReminder(task) {
  const triggerDate = new Date(task.dueDate);
  if (triggerDate <= new Date()) return;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Grow task due",
      body: task.title,
      sound: true
    },
    trigger: {
      date: triggerDate,
      channelId: "reminders"
    }
  });
}

export async function cancelTaskReminder(notificationId) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export function canUseReminders(user) {
  return user.role === "paid" || user.role === "guild";
}
