import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NAME_KEY = "maestro_customer_name";
const PHONE_KEY = "maestro_customer_phone";

// Remembers the customer's name & phone locally on the device so they don't
// have to retype it every time, and so we can fetch their past orders.
export default function useCustomerProfile() {
  const [name, setNameState] = useState("");
  const [phone, setPhoneState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedName, savedPhone] = await Promise.all([
          AsyncStorage.getItem(NAME_KEY),
          AsyncStorage.getItem(PHONE_KEY),
        ]);
        if (savedName) setNameState(savedName);
        if (savedPhone) setPhoneState(savedPhone);
      } catch (e) {
        // Ignore — worst case the fields just start empty
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const save = useCallback(async (newName, newPhone) => {
    setNameState(newName);
    setPhoneState(newPhone);
    try {
      await AsyncStorage.setItem(NAME_KEY, newName || "");
      await AsyncStorage.setItem(PHONE_KEY, newPhone || "");
    } catch (e) {
      // Ignore storage errors — the app still works, it just won't remember next time
    }
  }, []);

  return { name, phone, loaded, save };
}
