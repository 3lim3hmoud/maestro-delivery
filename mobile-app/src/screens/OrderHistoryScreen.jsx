import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getCustomerOrders } from "../api.js";
import { colors, radius, spacing, typography, shadow, gradients } from "../theme.js";

const STATUS_LABELS = {
  pending: { label: "بانتظار المطعم", color: colors.textSoft },
  accepted: { label: "المطعم وافق", color: colors.info },
  preparing: { label: "جارٍ التحضير", color: colors.info },
  out_for_delivery: { label: "في الطريق", color: colors.primary },
  delivered: { label: "تم التسليم", color: colors.success },
  rejected: { label: "مرفوض", color: colors.danger },
};

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function OrderHistoryScreen({ phone, onBack, onReorder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!phone) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCustomerOrders(phone);
      setOrders(data);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={gradients.dark} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>›</Text>
        </TouchableOpacity>
        <Text style={styles.title}>طلباتي السابقة</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {!loading && !phone && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>لسه معملتش أي طلب — اطلب أول مرة عشان نفتكرك المرة الجاية</Text>
        </View>
      )}

      {!loading && phone && orders.length === 0 && !error && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyText}>مفيش طلبات سابقة لحد دلوقتي</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const statusInfo = STATUS_LABELS[item.status] || { label: item.status, color: colors.textSoft };
          const canReorder = item.status === "delivered";
          return (
            <View style={[styles.card, shadow.soft]}>
              <View style={styles.cardTop}>
                <View style={[styles.statusPill, { borderColor: statusInfo.color }]}>
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
                <Text style={styles.restaurantName}>{item.restaurantName || "مطعم"}</Text>
              </View>

              <Text style={styles.itemsSummary}>
                {item.items.map((it) => `${it.name} ×${it.qty}`).join("، ")}
              </Text>

              <View style={styles.cardBottom}>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.total}>{item.total} ج.م</Text>
              </View>

              {canReorder && (
                <TouchableOpacity activeOpacity={0.9} onPress={() => onReorder(item)}>
                  <LinearGradient colors={gradients.primary} style={styles.reorderBtn}>
                    <Text style={styles.reorderText}>🔁 اطلب تاني</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing.lg, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  title: { ...typography.h2, color: colors.white },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textSoft, textAlign: "center", fontSize: 14.5, lineHeight: 22 },
  errorText: { color: colors.danger, textAlign: "center" },
  listContent: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  cardTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  restaurantName: { ...typography.h3, color: colors.white },
  statusPill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11.5, fontWeight: "700" },
  itemsSummary: { color: colors.textSoft, textAlign: "right", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  cardBottom: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  date: { color: colors.textFaint, fontSize: 12 },
  total: { color: colors.white, fontWeight: "800", fontSize: 15 },
  reorderBtn: { marginTop: 12, borderRadius: radius.pill, paddingVertical: 12, alignItems: "center" },
  reorderText: { color: "#1a1400", fontWeight: "800", fontSize: 14 },
});
