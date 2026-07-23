import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useLocation from "../useLocation.js";
import usePushToken from "../usePush.js";
import { placeOrder } from "../api.js";
import { colors, radius, spacing, typography, shadow, gradients } from "../theme.js";

export default function CheckoutScreen({ cart, onBack, onPlaced, initialName = "", initialPhone = "", onSaveProfile }) {
  const { location, error: locationError, loading: locating } = useLocation();
  const pushToken = usePushToken();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!location) {
      setError("لازم نعرف موقعك الأول عشان نبعت الطلب");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const order = await placeOrder({
        restaurantId: cart.restaurantId,
        items: cart.items,
        customerName: name,
        customerPhone: phone,
        location,
        paymentMethod,
        pushToken,
      });
      if (onSaveProfile) onSaveProfile(name, phone);
      onPlaced(order);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>›</Text>
        </TouchableOpacity>
        <Text style={styles.title}>تأكيد الطلب</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardHeading}>بياناتك</Text>
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            style={styles.input} value={name} onChangeText={setName}
            placeholder="اسمك بالكامل" placeholderTextColor={colors.textFaint} textAlign="right"
          />
          <Text style={styles.label}>رقم الموبايل</Text>
          <TextInput
            style={styles.input} value={phone} onChangeText={setPhone}
            placeholder="01xxxxxxxxx" placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad" textAlign="right"
          />
        </View>

        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardHeading}>موقع التوصيل</Text>
          {locating && (
            <View style={styles.locationRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.locationText}>جارٍ تحديد موقعك...</Text>
            </View>
          )}
          {!locating && location && (
            <View style={styles.locationOkRow}>
              <Text style={styles.locationOk}>تم تحديد موقعك بنجاح، هيتبعت مع الطلب أوتوماتيك</Text>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
          )}
          {!locating && locationError && (
            <Text style={styles.locationErr}>⚠️ {locationError}</Text>
          )}
        </View>

        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardHeading}>وسيلة الدفع</Text>
          <View style={styles.paymentOption}>
            <Text style={{ fontSize: 20 }}>💵</Text>
            <Text style={styles.paymentText}>كاش عند الاستلام</Text>
            <View style={styles.radioActive}><View style={styles.radioDot} /></View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={submitting || !location}
          onPress={submit}
          style={{ opacity: submitting || !location ? 0.6 : 1 }}
        >
          <LinearGradient colors={gradients.primary} style={[styles.submitBtn, shadow.glow]}>
            <Text style={styles.submitText}>
              {submitting ? "جارٍ الإرسال..." : `تأكيد الطلب — ${cart.total} ج.م`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bgElevated, padding: spacing.lg,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  title: { ...typography.h2, color: colors.white },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  cardHeading: { ...typography.h3, color: colors.white, textAlign: "right", marginBottom: spacing.sm },
  label: { fontSize: 13, color: colors.textSoft, textAlign: "right", marginBottom: 6, marginTop: 10, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: 13, fontSize: 15.5, color: colors.white,
    borderWidth: 1, borderColor: colors.line,
  },
  locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  locationText: { color: colors.textSoft },
  locationOkRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  locationOk: { color: colors.success, textAlign: "right", fontWeight: "600", flex: 1, fontSize: 13.5 },
  locationErr: { color: colors.danger, textAlign: "right" },
  error: { color: colors.danger, textAlign: "right", marginTop: 4, fontWeight: "600" },
  paymentOption: {
    flexDirection: "row-reverse", alignItems: "center", gap: 12,
    padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  paymentText: { color: colors.white, fontWeight: "700", flex: 1, textAlign: "right", fontSize: 15 },
  radioActive: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line,
  },
  submitBtn: { borderRadius: radius.pill, padding: 17, alignItems: "center" },
  submitText: { color: "#1a1400", fontSize: 16.5, fontWeight: "800" },
});
