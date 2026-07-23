import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { getRestaurants } from "../api.js";
import { colors, radius } from "../theme.js";
import { LogoMark } from "../components/Logo.jsx";

export default function RestaurantListScreen({ onSelect }) {
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    getRestaurants().then(setRestaurants);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LogoMark size={40} />
        <Text style={styles.tagline}>اختار مطعمك وسيبنا نظبطلك الطلب</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={restaurants}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelect(item)}>
            <View style={styles.boltDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.menu.length} أصناف متاحة</Text>
            </View>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack },
  header: {
    backgroundColor: colors.bgBlackSoft,
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 10,
  },
  tagline: { color: colors.textSoft, textAlign: "center", marginTop: 4, fontSize: 13 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  boltDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.boltYellow },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.white, textAlign: "right" },
  cardSub: { fontSize: 13, color: colors.textSoft, textAlign: "right", marginTop: 2 },
  arrow: { fontSize: 22, color: colors.boltYellow },
});
