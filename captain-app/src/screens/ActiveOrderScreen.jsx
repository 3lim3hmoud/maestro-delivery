import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from "react-native";
import * as Location from "expo-location";
import { io } from "socket.io-client";
import { API_BASE, setOrderStatus } from "../api.js";
import { colors, radius } from "../theme.js";

const STATUS_LABELS = {
  preparing: "استلمت الأوردر من المطعم",
  out_for_delivery: "في الطريق للعميل",
  delivered: "تم التسليم",
};

export default function ActiveOrderScreen({ order, onDone }) {
  const [current, setCurrent] = useState(order);
  const socketRef = useRef(null);
  const watchRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(API_BASE);
    return () => socketRef.current?.disconnect();
  }, []);

  // While the order is out for delivery, stream the courier's live GPS to the customer.
  useEffect(() => {
    if (current.status !== "out_for_delivery") return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 15 },
        (pos) => {
          socketRef.current?.emit("courier:location", {
            orderId: current.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      );
    })();
    return () => watchRef.current?.remove();
  }, [current.status]);

  async function advanceStatus() {
    const next = current.status === "preparing" ? "out_for_delivery" : "delivered";
    const updated = await setOrderStatus(current.id, next);
    setCurrent(updated);
    if (next === "delivered") setTimeout(() => onDone(updated), 800);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>الأوردر الحالي</Text>
      <View style={styles.card}>
        <Text style={styles.total}>{current.total} ج.م</Text>
        <Text style={styles.customer}>{current.customerName || "عميل"} · {current.customerPhone}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(current.mapsUrl)}>
          <Text style={styles.mapsLink}>📍 فتح موقع العميل على جوجل ماب</Text>
        </TouchableOpacity>
        <Text style={styles.status}>الحالة: {STATUS_LABELS[current.status] || current.status}</Text>

        {current.status !== "delivered" && (
          <TouchableOpacity style={styles.btn} onPress={advanceStatus}>
            <Text style={styles.btnText}>
              {current.status === "preparing" ? "خرجت للتوصيل" : "تم التسليم"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack },
  header: { color: colors.white, fontSize: 20, fontWeight: "800", textAlign: "center", padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 20, margin: 16, borderWidth: 1, borderColor: colors.line },
  total: { color: colors.white, fontSize: 20, fontWeight: "800", textAlign: "right" },
  customer: { color: colors.textSoft, textAlign: "right", marginTop: 4 },
  mapsLink: { color: colors.infoBlue, textAlign: "right", marginTop: 14, fontWeight: "600" },
  status: { color: colors.goGreen, textAlign: "right", marginTop: 18, fontWeight: "700" },
  btn: { backgroundColor: colors.boltYellow, borderRadius: radius.sm, padding: 14, alignItems: "center", marginTop: 20 },
  btnText: { color: "#1a1400", fontWeight: "800" },
});
