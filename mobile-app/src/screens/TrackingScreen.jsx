import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { io } from "socket.io-client";
import { API_BASE, rateOrder } from "../api.js";
import { colors, radius, spacing, typography, shadow, gradients } from "../theme.js";
import { LogoMark } from "../components/Logo.jsx";

const STEPS = [
  { key: "pending", label: "بانتظار موافقة المطعم", icon: "🕐" },
  { key: "accepted", label: "المطعم وافق على طلبك", icon: "✅" },
  { key: "preparing", label: "جارٍ تحضير طلبك", icon: "👨‍🍳" },
  { key: "out_for_delivery", label: "الدليفري في الطريق ليك", icon: "🛵" },
  { key: "delivered", label: "تم التسليم، بالهنا والشفا", icon: "🎉" },
];

export default function TrackingScreen({ order, onNewOrder }) {
  const [status, setStatus] = useState(order.status);
  const [courierLocation, setCourierLocation] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingSent, setRatingSent] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const socket = io(API_BASE);
    socket.emit("order:track", { orderId: order.id });
    socket.on("order:update", (updated) => setStatus(updated.status));
    socket.on("courier:location", ({ lat, lng }) => setCourierLocation({ lat, lng }));
    return () => socket.disconnect();
  }, [order.id]);

  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const isRejected = status === "rejected";
  const progressPct = isRejected ? 0 : Math.max(0, (currentIndex / (STEPS.length - 1)) * 100);

  async function submitRating(stars) {
    setRating(stars);
    setRatingLoading(true);
    try {
      await rateOrder(order.id, stars, "");
      setRatingSent(true);
    } catch (e) {
      // Silently ignore — rating is a nice-to-have, not critical to the flow
    } finally {
      setRatingLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={gradients.dark} style={styles.header}>
        <LogoMark size={34} />
        <Text style={styles.title}>متابعة الطلب</Text>
        <View style={styles.orderIdPill}>
          <Text style={styles.orderId}>{order.id}</Text>
        </View>
      </LinearGradient>

      <View style={styles.progressTrack}>
        <View style={styles.progressBg} />
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.timeline}>
        {STEPS.map((step, i) => {
          const active = i <= currentIndex && !isRejected;
          const isCurrent = i === currentIndex && !isRejected;
          const isDone = i < currentIndex && !isRejected;
          return (
            <View key={step.key} style={styles.stepRow}>
              {active ? (
                <LinearGradient
                  colors={isDone ? [colors.success, colors.success] : gradients.primary}
                  style={[styles.iconCircle, isCurrent && shadow.glow]}
                >
                  <Text style={styles.iconChar}>{step.icon}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.iconCircleIdle}>
                  <Text style={styles.iconCharIdle}>{step.icon}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
                {isCurrent && <Text style={styles.stepLive}>جارٍ الآن...</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {status === "out_for_delivery" && courierLocation && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.courierBox, shadow.soft]}
          onPress={() => Linking.openURL(`https://www.google.com/maps?q=${courierLocation.lat},${courierLocation.lng}`)}
        >
          <Text style={{ fontSize: 22 }}>🛵</Text>
          <Text style={styles.courierText}>شوف مكان الكابتن دلوقتي على الخريطة</Text>
        </TouchableOpacity>
      )}

      {isRejected && (
        <View style={[styles.rejectedBox, shadow.soft]}>
          <Text style={{ fontSize: 22 }}>😔</Text>
          <Text style={styles.rejectedText}>للأسف المطعم مقدرش يستقبل طلبك دلوقتي</Text>
        </View>
      )}

      {status === "delivered" && !ratingSent && (
        <View style={[styles.ratingBox, shadow.soft]}>
          <Text style={styles.ratingTitle}>قيّم تجربتك مع الكابتن</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} disabled={ratingLoading} onPress={() => submitRating(n)}>
                <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {status === "delivered" && ratingSent && (
        <View style={[styles.ratingBox, shadow.soft]}>
          <Text style={styles.ratingThanks}>🙏 شكرًا على تقييمك!</Text>
        </View>
      )}

      <TouchableOpacity activeOpacity={0.9} onPress={onNewOrder} style={{ marginTop: "auto" }}>
        <LinearGradient colors={gradients.primary} style={[styles.newOrderBtn, shadow.glow]}>
          <Text style={styles.newOrderText}>طلب جديد</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  header: {
    alignItems: "center", gap: 8, padding: spacing.lg, margin: -spacing.lg, marginBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
  },
  title: { ...typography.h2, color: colors.white, marginTop: 4 },
  orderIdPill: {
    backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: radius.pill, marginTop: 4,
  },
  orderId: { color: colors.textSoft, fontFamily: "monospace", fontSize: 12.5 },
  progressTrack: { height: 6, borderRadius: 3, marginBottom: spacing.lg, overflow: "hidden" },
  progressBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceAlt, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  timeline: { marginBottom: spacing.lg },
  stepRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
  },
  iconCircleIdle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center",
  },
  iconChar: { fontSize: 20 },
  iconCharIdle: { fontSize: 20, opacity: 0.35 },
  stepLabel: { fontSize: 15, color: colors.textFaint, textAlign: "right", fontWeight: "600" },
  stepLabelActive: { color: colors.white, fontWeight: "700" },
  stepLive: { color: colors.primary, fontSize: 12, textAlign: "right", marginTop: 2, fontWeight: "700" },
  courierBox: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    padding: spacing.md, backgroundColor: colors.infoBg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.info, marginBottom: spacing.md,
  },
  courierText: { color: colors.info, fontWeight: "700", flex: 1, textAlign: "right" },
  rejectedBox: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    padding: spacing.md, backgroundColor: colors.dangerBg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.danger, marginBottom: spacing.md,
  },
  rejectedText: { color: colors.danger, flex: 1, textAlign: "right", fontWeight: "600" },
  ratingBox: {
    padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md, alignItems: "center", gap: 10,
  },
  ratingTitle: { color: colors.white, fontWeight: "700", fontSize: 15 },
  starsRow: { flexDirection: "row", gap: 6 },
  star: { fontSize: 32, color: colors.line },
  starActive: { color: colors.primary },
  ratingThanks: { color: colors.success, fontWeight: "700", fontSize: 15 },
  newOrderBtn: { padding: 17, borderRadius: radius.pill, alignItems: "center" },
  newOrderText: { color: "#1a1400", fontWeight: "800", fontSize: 16 },
});
