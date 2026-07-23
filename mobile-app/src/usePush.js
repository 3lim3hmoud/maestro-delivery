import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Registers the device for push notifications and returns its Expo push token.
 * This token gets sent with the order so the backend can notify the customer
 * even while the app is closed (see backend/src/push.js).
 * Works without any external account — Expo's push service is free — but only
 * functions in a real device build (not in the Expo Go simulator on web).
 */
export default function usePushToken() {
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    (async () => {
      if (!Device.isDevice) return; // push tokens require a physical/emulated device
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setPushToken(token);
    })().catch(() => {});
  }, []);

  return pushToken;
}
