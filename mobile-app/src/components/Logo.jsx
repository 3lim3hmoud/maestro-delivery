import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme.js";

export function LogoMark({ size = 64 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Path d="M14 96V30L38 54V96H14Z" fill="#FFFFFF" />
      <Path d="M106 96V30L82 54V96H106Z" fill="#FFFFFF" />
      <Path
        d="M38 54L60 30L82 54"
        stroke="#FFFFFF"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M66 14L44 58H58L52 106L80 50H64L66 14Z"
        fill={colors.boltYellow}
        stroke="#0D0D0D"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function LogoLockup({ size = 72 }) {
  return (
    <View style={styles.wrap}>
      <LogoMark size={size} />
      <Text style={[styles.maestro, { fontSize: size * 0.4 }]}>MAESTRO</Text>
      <Text style={[styles.tagline, { fontSize: size * 0.14 }]}>FAST DELIVERY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 4 },
  maestro: {
    color: colors.boltYellow,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  tagline: {
    color: colors.white,
    letterSpacing: 4,
    marginTop: 4,
  },
});
