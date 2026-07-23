import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { LogoLockup } from "../components/Logo.jsx";
import { colors } from "../theme.js";

export default function SplashScreen({ onDone }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity }}>
        <LogoLockup size={90} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBlack,
    alignItems: "center",
    justifyContent: "center",
  },
});
