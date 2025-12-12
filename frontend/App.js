import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import RootNavigator from "./src/navigation/RootNavigator";

const navigationRef = React.createRef();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (data.postId && navigationRef?.current) {
        navigationRef.current.navigate("PostDetail", { postId: data.postId });
      }

      if (data.courseId && navigationRef?.current) {
        navigationRef.current.navigate("CourseDetail", { courseId: data.courseId });
      }
    });

    return () => subscription.remove();
  }, []);

  async function registerForPushNotifications() {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Permission denied");
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Push Token:", token);

        global.pushToken = token;

        // Save to backend
        const API_URL = "http://192.168.1.42:4000";
        await fetch(`${API_URL}/api/auth/save-push-token`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${global.authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ pushToken: token })
        });
      }

      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX
        });
      }
    } catch (err) {
      console.log("Push registration error:", err.message);
    }
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </>
  );
}
