import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { colors, radius } from "../theme.js";

export default function MenuScreen({ restaurant, onBack, onCheckout }) {
  const [cart, setCart] = useState({}); // menuItemId -> qty

  function updateQty(item, delta) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = (next[item.id] || 0) + delta;
      if (qty <= 0) delete next[item.id];
      else next[item.id] = qty;
      return next;
    });
  }

  const items = Object.entries(cart).map(([id, qty]) => {
    const menuItem = restaurant.menu.find((m) => m.id === id);
    return { ...menuItem, qty };
  });
  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ رجوع</Text></TouchableOpacity>
        <Text style={styles.title}>{restaurant.name}</Text>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={restaurant.menu}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item, 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{cart[item.id] || 0}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item, -1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price} ج.م</Text>
            </View>
          </View>
        )}
      />

      {items.length > 0 && (
        <TouchableOpacity
          style={styles.checkoutBar}
          onPress={() => onCheckout({ items, total, restaurantId: restaurant.id })}
        >
          <Text style={styles.checkoutText}>إتمام الطلب — {total} ج.م</Text>
        </TouchableOpacity>
      )}
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
  row: {
    flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface,
    borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line, gap: 14,
  },
  itemName: { fontSize: 16, fontWeight: "700", color: colors.white, textAlign: "right" },
  itemPrice: { fontSize: 13, color: colors.textSoft, textAlign: "right", marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgBlackSoft,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line,
  },
  qtyBtnText: { fontSize: 18, color: colors.boltYellow, fontWeight: "700" },
  qtyText: { fontSize: 16, fontWeight: "700", minWidth: 18, textAlign: "center", color: colors.white },
  checkoutBar: { backgroundColor: colors.boltYellow, padding: 18, alignItems: "center" },
  checkoutText: { color: "#1a1400", fontSize: 17, fontWeight: "800" },
});
