import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from "react-native";
import { io } from "socket.io-client";
import { API_BASE } from "../api.js";
import { colors, radius } from "../theme.js";
import { LogoMark } from "../components/Logo.jsx";

const STEPS = [
  { key: "pending", label: "بانتظار موافقة المطعم", note: "♩" },
  { key: "accepted", label: "المطعم وافق على طلبك", note: "♪" },
  { key: "preparing", label: "جارٍ تحضير طلبك", note: "♫" },
  { key: "out_for_delivery", label: "الدليفري في الطريق ليك", note: "⚡" },
  { key: "delivered", label: "تم التسليم، بالهنا والشفا", note: "✓" },
];

export default function TrackingScreen({ order, onNewOrder }) {
  const [status, setStatus] = useState(order.status);
  const [courierLocation, setCourierLocation] = useState(null);

  useEffect(() => {
    const socket = io(API_BASE);
    socket.emit("order:track", { orderId: order.id });
    socket.on("order:update", (updated) => setStatus(updated.status));
    socket.on("courier:location", ({ lat, lng }) => setCourierLocation({ lat, lng }));
    return () => socket.disconnect();
  }, [order.id]);

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LogoMark size={36} />
        <Text style={styles.title}>متابعة الطلب</Text>
        <Text style={styles.orderId}>{order.id}</Text>
      </View>

      <View style={styles.timeline}>
        {STEPS.map((step, i) => {
          const active = i <= currentIndex;
          const isDelivered = step.key === "delivered" && active;
          const isRejected = status === "rejected";
          return (
            <View key={step.key} style={styles.stepRow}>
              <View
                style={[
                  styles.noteCircle,
                  active && !isRejected && styles.noteCircleActive,
                  isDelivered && styles.noteCircleDone,
                ]}
              >
                <Text style={styles.noteChar}>{step.note}</Text>
              </View>
              <Text style={[styles.stepLabel, active && !isRejected && styles.stepLabelActive]}>{step.label}</Text>
            </View>
          );
        })}
      </View>

      {status === "out_for_delivery" && courierLocation && (
        <TouchableOpacity
          style={styles.courierBox}
          onPress={() => Linking.openURL(`https://www.google.com/maps?q=${courierLocation.lat},${courierLocation.lng}`)}
        >
          <Text style={styles.courierText}>🛵 شوف مكان الكابتن دلوقتي على الخريطة</Text>
        </TouchableOpacity>
      )}

      {status === "rejected" && (
        <View style={styles.rejectedBox}>
          <Text style={styles.rejectedText}>للأسف المطعم مقدرش يستقبل طلبك دلوقتي</Text>
        </View>
      )}

      <TouchableOpacity style={styles.newOrderBtn} onPress={onNewOrder}>
        <Text style={styles.newOrderText}>طلب جديد</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack },
  header: {
    backgroundColor: colors.bgBlackSoft, padding: 24, alignItems: "center", gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  title: { color: colors.white, fontSize: 20, fontWeight: "900" },
  orderId: { color: colors.textSoft, marginTop: 2, fontFamily: "monospace" },
  timeline: { padding: 24 },
  stepRow: { flexDirection: "row-reverse", alignItems: "center", gap: 14, marginBottom: 22 },
  noteCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center",
  },
  noteCircleActive: { backgroundColor: colors.boltYellow, borderColor: colors.boltYellow },
  noteCircleDone: { backgroundColor: colors.goGreen, borderColor: colors.goGreen },
  noteChar: { fontSize: 18 },
  stepLabel: { fontSize: 15, color: colors.textSoft, textAlign: "right", flex: 1 },
  stepLabelActive: { color: colors.white, fontWeight: "700" },
  courierBox: { margin: 24, marginTop: 0, padding: 14, backgroundColor: "rgba(77,166,255,0.12)", borderRadius: radius.md, borderWidth: 1, borderColor: colors.infoBlue },
  courierText: { color: colors.infoBlue, textAlign: "center", fontWeight: "700" },
  rejectedBox: { margin: 24, padding: 16, backgroundColor: "rgba(255,77,77,0.12)", borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger },
  rejectedText: { color: colors.danger, textAlign: "right" },
  newOrderBtn: { margin: 24, padding: 16, backgroundColor: colors.boltYellow, borderRadius: radius.md, alignItems: "center" },
  newOrderText: { color: "#1a1400", fontWeight: "700", fontSize: 16 },
});
