import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, typography, shadow, gradients } from "../theme.js";

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
  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>›</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.subtitle}>اختار من المنيو وأضيف لسلتك</Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={restaurant.menu}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => {
          const qty = cart[item.id] || 0;
          return (
            <View style={[styles.row, qty > 0 && styles.rowActive]}>
              <View style={styles.qtyControls}>
                <TouchableOpacity style={styles.qtyBtnPlus} onPress={() => updateQty(item, 1)}>
                  <Text style={styles.qtyBtnPlusText}>+</Text>
                </TouchableOpacity>
                {qty > 0 && (
                  <>
                    <Text style={styles.qtyText}>{qty}</Text>
                    <TouchableOpacity style={styles.qtyBtnMinus} onPress={() => updateQty(item, -1)}>
                      <Text style={styles.qtyBtnMinusText}>−</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.price} ج.م</Text>
              </View>
              <View style={styles.itemIcon}>
                <Text style={{ fontSize: 22 }}>🍽️</Text>
              </View>
            </View>
          );
        }}
      />

      {items.length > 0 && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onCheckout({ items, total, restaurantId: restaurant.id })}>
          <LinearGradient colors={gradients.primary} style={[styles.checkoutBar, shadow.glow]}>
            <View style={styles.checkoutCountBadge}>
              <Text style={styles.checkoutCountText}>{totalQty}</Text>
            </View>
            <Text style={styles.checkoutText}>عرض السلة</Text>
            <Text style={styles.checkoutTotal}>{total} ج.م</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bgElevated, padding: spacing.lg,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.line, gap: spacing.md,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  title: { ...typography.h2, color: colors.white },
  subtitle: { color: colors.textSoft, fontSize: 12.5, marginTop: 2 },
  listContent: { padding: spacing.lg, paddingBottom: 110 },
  row: {
    flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.line, gap: spacing.md,
  },
  rowActive: { borderColor: colors.primary },
  itemName: { ...typography.h3, color: colors.white, textAlign: "right" },
  itemPrice: { fontSize: 13, color: colors.textSoft, textAlign: "right", marginTop: 3, fontWeight: "600" },
  itemIcon: {
    width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 34 },
  qtyBtnPlus: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  qtyBtnPlusText: { fontSize: 18, color: "#1a1400", fontWeight: "800" },
  qtyBtnMinus: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line,
  },
  qtyBtnMinusText: { fontSize: 18, color: colors.white, fontWeight: "700" },
  qtyText: { fontSize: 16, fontWeight: "800", minWidth: 18, textAlign: "center", color: colors.white },
  checkoutBar: {
    position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    borderRadius: radius.pill, paddingVertical: 16, paddingHorizontal: 20,
  },
  checkoutCountBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  checkoutCountText: { color: "#1a1400", fontWeight: "800", fontSize: 13 },
  checkoutText: { color: "#1a1400", fontSize: 16, fontWeight: "800" },
  checkoutTotal: { color: "#1a1400", fontSize: 16, fontWeight: "900" },
});
