import { useEffect, useState } from "react";
import * as Location from "expo-location";

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("محتاجين إذن الموقع عشان نوصلك طلبك بالظبط");
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e) {
        setError("مقدرناش نجيب موقعك، جرب تاني");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, error, loading };
}
