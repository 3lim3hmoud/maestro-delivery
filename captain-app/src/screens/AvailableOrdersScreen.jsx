import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, RefreshControl } from "react-native";
import { io } from "socket.io-client";
import { API_BASE, getAvailableOrders, claimOrder } from "../api.js";
import { colors, radius } from "../theme.js";

export default function AvailableOrdersScreen({ onClaimed }) {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    getAvailableOrders().then(setOrders).catch(() => {});
  }

  useEffect(() => {
    load();
    const socket = io(API_BASE);
    socket.emit("courier:join");
    socket.on("order:available", (order) => setOrders((prev) => [order, ...prev]));
    socket.on("order:claimed", ({ orderId }) => setOrders((prev) => prev.filter((o) => o.id !== orderId)));
    return () => socket.disconnect();
  }, []);

  async function handleClaim(orderId) {
    try {
      const order = await claimOrder(orderId);
      onClaimed(order);
    } catch (e) {
      // order likely already taken by another courier — list will refresh via socket
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>🎼 أوردرات جاهزة للتوصيل</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack },
  header: { color: colors.white, fontSize: 20, fontWeight: "800", textAlign: "center", padding: 16 },
  empty: { color: colors.textSoft, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  total: { color: colors.white, fontSize: 17, fontWeight: "700", textAlign: "right" },
  customer: { color: colors.textSoft, textAlign: "right", marginTop: 4, marginBottom: 12 },
  btn: { backgroundColor: colors.boltYellow, borderRadius: radius.sm, padding: 12, alignItems: "center" },
  btnText: { color: "#1a1400", fontWeight: "800" },
});
