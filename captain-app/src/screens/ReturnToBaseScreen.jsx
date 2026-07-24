import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { returnToBase, rateCustomer } from "../api.js";
import { colors, radius } from "../theme.js";

export default function ReturnToBaseScreen({ order, onReturned }) {
  const [loading, setLoading] = useState(false);
  const [rated, setRated] = useState(false);

  async function handleReturn() {
    setLoading(true);
    try {
      await returnToBase();
      onReturned();
    } finally {
      setLoading(false);
    }
  }

  async function flagCustomer(rating) {
    try {
      await rateCustomer(order.id, rating);
      setRated(true);
    } catch {
      // non-blocking — captain can still return to base either way
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>✅ تم تسليم الأوردر</Text>
        <Text style={styles.sub}>محتاج ترجع لمقر الشركة الأول عشان تدخل الدور تاني وتاخد أوردر جديد.</Text>

        {!rated && (
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>تقييم العميل (اختياري — للإبلاغ عن أوردر وهمي مثلاً):</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => flagCustomer(n)}>
                  <Text style={styles.star}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {rated && <Text style={styles.thanks}>تم تسجيل التقييم</Text>}

        <TouchableOpacity style={styles.btn} disabled={loading} onPress={handleReturn}>
          <Text style={styles.btnText}>{loading ? "..." : "رجعت للمقر"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack, justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 24, margin: 16, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.white, fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  sub: { color: colors.textSoft, textAlign: "center", marginBottom: 20 },
  rateRow: { marginBottom: 20 },
  rateLabel: { color: colors.textSoft, textAlign: "center", marginBottom: 10, fontSize: 13 },
  stars: { flexDirection: "row-reverse", justifyContent: "center", gap: 10 },
  star: { fontSize: 26 },
  thanks: { color: colors.goGreen, textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: colors.boltYellow, borderRadius: radius.md, padding: 16, alignItems: "center" },
  btnText: { color: "#1a1400", fontWeight: "800", fontSize: 16 },
});
