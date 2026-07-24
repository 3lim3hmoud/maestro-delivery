import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useLocation from "../useLocation.js";
import usePushToken from "../usePush.js";
import { submitCustomRequest, getServiceArea } from "../api.js";
import { colors, radius, spacing, typography, shadow, gradients } from "../theme.js";

export default function CustomRequestScreen({ onBack, onPlaced }) {
  const { location, error: locationError, loading: locating } = useLocation(); // used as the drop-off point
  const pushToken = usePushToken();
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!description.trim()) return setError("اكتب وصف مختصر لطلبك");
    if (!location) return setError("لازم نعرف موقع التسليم الأول");

    setSubmitting(true);
    setError("");
    try {
      // Company HQ is used as the default pickup pin until the employee dashboard assigns
      // the real pickup point — the address you typed travels with the order either way.
      const area = await getServiceArea();
      const order = await submitCustomRequest({
        description,
        pickup: { lat: area.hq.lat, lng: area.hq.lng, address: pickupAddress },
        dropoff: location,
        customerName: name,
        customerPhone: phone,
        pushToken,
      });
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
        <Text style={styles.title}>اطلب أي حاجة</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardHeading}>إيه اللي محتاجه؟</Text>
          <TextInput
            style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription}
            placeholder="مثال: جيب دوا من الصيدلية / وصّل مستندات / اشتري هدية..."
            placeholderTextColor={colors.textFaint} multiline numberOfLines={3} textAlign="right"
          />

          <Text style={styles.label}>عنوان الاستلام (المطعم / الصيدلية / المحل)</Text>
          <TextInput
            style={styles.input} value={pickupAddress} onChangeText={setPickupAddress}
            placeholder="مثال: صيدلية النور، شارع فؤاد" placeholderTextColor={colors.textFaint} textAlign="right"
          />
        </View>

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
          <Text style={styles.cardHeading}>موقع التسليم</Text>
          {locating && (
            <View style={styles.locationRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.locationText}>جارٍ تحديد موقعك...</Text>
            </View>
          )}
          {!locating && location && (
            <Text style={styles.locationOk}>📍 هيتم التسليم لموقعك الحالي</Text>
          )}
          {!locating && locationError && <Text style={styles.locationErr}>⚠️ {locationError}</Text>}
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
            <Text style={styles.submitText}>{submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}</Text>
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
    flexDirection: "row-reverse", alignItems: "center", gap: spacing.md,
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
  textarea: { textAlignVertical: "top", minHeight: 80 },
  locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  locationText: { color: colors.textSoft },
  locationOk: { color: colors.success, textAlign: "right", fontWeight: "600" },
  locationErr: { color: colors.danger, textAlign: "right" },
  error: { color: colors.danger, textAlign: "right", marginTop: 4, fontWeight: "600" },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line,
  },
  submitBtn: { borderRadius: radius.pill, padding: 17, alignItems: "center" },
  submitText: { color: "#1a1400", fontSize: 16.5, fontWeight: "800" },
});
