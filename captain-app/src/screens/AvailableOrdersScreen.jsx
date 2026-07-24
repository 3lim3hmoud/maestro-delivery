import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, RefreshControl, Switch } from "react-native";
import { io } from "socket.io-client";
import { API_BASE, getAvailableOrders, claimOrder, getMyStatus, goOnline, goOffline } from "../api.js";
import { colors, radius } from "../theme.js";

export default function AvailableOrdersScreen({ onClaimed }) {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("off_duty"); // off_duty | available | busy | returning
  const [toggling, setToggling] = useState(false);

  function load() {
    getAvailableOrders().then(setOrders).catch(() => {});
    getMyStatus().then((c) => setStatus(c.status)).catch(() => {});
  }

  useEffect(() => {
    load();
    const socket = io(API_BASE);
    socket.emit("courier:join");
    socket.on("order:available", (order) => setOrders((prev) => [order, ...prev]));
    socket.on("order:claimed", ({ orderId }) => setOrders((prev) => prev.filter((o) => o.id !== orderId)));
    return () => socket.disconnect();
  }, []);

  async function toggleOnline() {
    setToggling(true);
    try {
      if (status === "available") {
        await goOffline();
        setStatus("off_duty");
      } else if (status === "off_duty") {
        await goOnline();
        setStatus("available");
      }
      // busy / returning: ignore taps — handled from the active-order / return-to-base screens
    } finally {
      setToggling(false);
    }
  }

  async function handleClaim(orderId) {
    try {
      const order = await claimOrder(orderId);
      onClaimed(order);
    } catch (e) {
      // order likely already taken by another courier, or you're not in the queue yet — list refreshes via socket
      load();
    }
  }

  const onlineToggleDisabled = toggling || status === "busy" || status === "returning";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>
          {{ available: "🟢 في الدور — مستني أوردر", off_duty: "⚪ برا الخدمة", busy: "🔵 معاك أوردر دلوقتي", returning: "🟡 محتاج ترجع للمقر" }[status]}
        </Text>
        {(status === "available" || status === "off_duty") && (
          <Switch
            value={status === "available"}
            onValueChange={toggleOnline}
            disabled={onlineToggleDisabled}
            trackColor={{ true: colors.boltYellow, false: colors.line }}
          />
        )}
      </View>

      <Text style={styles.header}>🎼 أوردرات جاهزة للتوصيل</Text>

      {status !== "available" ? (
        <Text style={styles.empty}>
          {status === "off_duty" ? "اضغط أونلاين عشان تدخل الدور وتستلم أوردرات" : "خلص اللي عندك الأول"}
        </Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); setRefreshing(false); }} />}
          ListEmptyComponent={<Text style={styles.empty}>مفيش أوردرات جاهزة دلوقتي</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.total}>{item.total} ج.م — {item.items.length} صنف</Text>
              <Text style={styles.customer}>{item.customerName || "عميل"} · {item.customerPhone}</Text>
              <TouchableOpacity style={styles.btn} onPress={() => handleClaim(item.id)}>
                <Text style={styles.btnText}>استلام الأوردر</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack },
  statusBar: {
    flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center",
    padding: 14, backgroundColor: colors.bgBlackSoft, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  statusLabel: { color: colors.white, fontWeight: "700" },
  header: { color: colors.white, fontSize: 20, fontWeight: "800", textAlign: "center", padding: 16 },
  empty: { color: colors.textSoft, textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  total: { color: colors.white, fontSize: 17, fontWeight: "700", textAlign: "right" },
  customer: { color: colors.textSoft, textAlign: "right", marginTop: 4, marginBottom: 12 },
  btn: { backgroundColor: colors.boltYellow, borderRadius: radius.sm, padding: 12, alignItems: "center" },
  btnText: { color: "#1a1400", fontWeight: "800" },
});
