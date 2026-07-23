import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import useLocation from "../useLocation.js";
import usePushToken from "../usePush.js";
import { placeOrder } from "../api.js";
import { colors, radius } from "../theme.js";

export default function CheckoutScreen({ cart, onBack, onPlaced }) {
  const { location, error: locationError, loading: locating } = useLocation();
  const pushToken = usePushToken();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        location, // GPS location attached automatically to every order
        paymentMethod,
        pushToken, // so the backend can notify this phone even if the app is closed
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
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ رجوع</Text></TouchableOpacity>
        <Text style={styles.title}>تأكيد الطلب</Text>
      </View>

      <View style={{ padding: 20 }}>
        <Text style={styles.label}>الاسم</Text>
        <TextInput
          style={styles.input} value={name} onChangeText={setName}
          placeholder="اسمك" placeholderTextColor={colors.textSoft} textAlign="right"
        />

        <Text style={styles.label}>رقم الموبايل</Text>
        <TextInput
          style={styles.input} value={phone} onChangeText={setPhone}
          placeholder="01xxxxxxxxx" placeholderTextColor={colors.textSoft}
          keyboardType="phone-pad" textAlign="right"
        />

        <View style={styles.locationBox}>
          {locating && (
            <View style={styles.locationRow}>
              <ActivityIndicator color={colors.boltYellow} />
              <Text style={styles.locationText}>جارٍ تحديد موقعك...</Text>
            </View>
          )}
          {!locating && location && (
            <Text style={styles.locationOk}>📍 تم تحديد موقعك بنجاح، هيتبعت مع الطلب أوتوماتيك</Text>
          )}
          {!locating && locationError && (
            <Text style={styles.locationErr}>⚠️ {locationError}</Text>
          )}
        </View>

        <Text style={styles.label}>وسيلة الدفع</Text>
        <View style={styles.paymentRow}>
          <View style={[styles.paymentOption, styles.paymentOptionActive]}>
            <Text style={[styles.paymentText, styles.paymentTextActive]}>كاش عند الاستلام</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !location) && { opacity: 0.6 }]}
          disabled={submitting || !location}
          onPress={submit}
        >
          <Text style={styles.submitText}>
            {submitting ? "جارٍ الإرسال..." : `تأكيد الطلب — ${cart.total} ج.م`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack },
  header: {
    backgroundColor: colors.bgBlackSoft, padding: 20,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  back: { color: colors.boltYellow, fontSize: 16 },
  title: { color: colors.white, fontSize: 19, fontWeight: "700" },
  label: { fontSize: 13, color: colors.textSoft, textAlign: "right", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.sm, padding: 12, fontSize: 16, color: colors.white,
    borderWidth: 1, borderColor: colors.line,
  },
  locationBox: { marginTop: 20, padding: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  locationText: { color: colors.textSoft },
  locationOk: { color: colors.goGreen, textAlign: "right", fontWeight: "600" },
  locationErr: { color: colors.danger, textAlign: "right" },
  error: { color: colors.danger, textAlign: "right", marginTop: 10 },
  paymentRow: { flexDirection: "row-reverse", gap: 10 },
  paymentOption: {
    flex: 1, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, alignItems: "center",
  },
  paymentOptionActive: { borderColor: colors.boltYellow, backgroundColor: colors.boltYellow + "22" },
  paymentText: { color: colors.textSoft, fontWeight: "600" },
  paymentTextActive: { color: colors.white },
  paymentNote: { color: colors.textSoft, fontSize: 12, textAlign: "right", marginTop: 8 },
  submitBtn: { backgroundColor: colors.boltYellow, borderRadius: radius.md, padding: 16, alignItems: "center", marginTop: 26 },
  submitText: { color: "#1a1400", fontSize: 17, fontWeight: "800" },
});
