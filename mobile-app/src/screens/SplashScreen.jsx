import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LogoLockup } from "../components/Logo.jsx";
import { gradients } from "../theme.js";

export default function SplashScreen({ onDone }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <LinearGradient colors={gradients.dark} style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <LogoLockup size={90} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
