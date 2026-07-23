import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getRestaurants } from "../api.js";
import { colors, radius, spacing, typography, shadow, gradients } from "../theme.js";
import { LogoMark } from "../components/Logo.jsx";

const CUISINE_EMOJI = {
  rest_afandina: "🍝",
  rest_la_rose: "🍕",
  rest_la_rotonda: "🍝",
  rest_lorenzo: "🍕",
  rest_belban: "🍮",
  rest_kunafa_basbousa: "🍮",
  rest_hadramout: "🍛",
};

export default function RestaurantListScreen({ onSelect, onOpenHistory }) {
  const [restaurants, setRestaurants] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getRestaurants().then(setRestaurants);
  }, []);

  const filtered = restaurants.filter((r) => r.name.includes(query));

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={gradients.dark} style={styles.header}>
        <View style={styles.headerTop}>
          <LogoMark size={38} />
          <TouchableOpacity style={styles.locationPill} onPress={onOpenHistory}>
            <Text style={styles.locationPillText}>📋 طلباتي</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>عايز تاكل إيه النهاردة؟</Text>
        <Text style={styles.tagline}>مطاعمك المفضلة على بعد دقايق منك</Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="دور على مطعم..."
            placeholderTextColor={colors.textFaint}
            textAlign="right"
          />
        </View>
      </LinearGradient>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>مطاعم متاحة دلوقتي ({filtered.length})</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} style={[styles.card, shadow.card]} onPress={() => onSelect(item)}>
            <View style={styles.cardBanner}>
              <LinearGradient colors={gradients.primary} style={styles.cardAvatar}>
                <Text style={styles.cardAvatarEmoji}>{CUISINE_EMOJI[item.id] || "🍽️"}</Text>
              </LinearGradient>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>⭐ 4.8</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>🕐 20-30 د</Text>
                <View style={styles.metaDot} />
                <Text style={styles.cardMeta}>{item.menu.length} صنف</Text>
                <View style={styles.metaDot} />
                <Text style={styles.cardMetaFree}>توصيل مجاني</Text>
              </View>
            </View>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrow}>‹</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  locationPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  locationPillText: { color: colors.textSoft, fontSize: 12.5, fontWeight: "600" },
  greeting: { ...typography.h1, color: colors.white, textAlign: "right", marginTop: spacing.lg },
  tagline: { color: colors.textSoft, textAlign: "right", marginTop: 6, fontSize: 13.5 },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: colors.white, fontSize: 15 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.white, textAlign: "right", marginBottom: spacing.md },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardBanner: { position: "relative" },
  cardAvatar: {
    width: 56, height: 56, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  cardAvatarEmoji: { fontSize: 26 },
  ratingBadge: {
    position: "absolute", bottom: -8, left: -6,
    backgroundColor: colors.bgElevated, borderRadius: radius.pill,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.line,
  },
  ratingBadgeText: { fontSize: 10.5, color: colors.white, fontWeight: "700" },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.h3, color: colors.white, textAlign: "right" },
  cardMetaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 6 },
  cardMeta: { fontSize: 12, color: colors.textSoft },
  cardMetaFree: { fontSize: 12, color: colors.success, fontWeight: "700" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textFaint },
  arrowCircle: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  arrow: { fontSize: 18, color: colors.primary, fontWeight: "700" },
});
