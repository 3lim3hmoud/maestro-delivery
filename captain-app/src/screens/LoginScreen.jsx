import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { loginCourier } from "../api.js";
import { colors, radius } from "../theme.js";

export default function LoginScreen({ onLogin }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const courier = await loginCourier(code.trim(), password);
      onLogin(courier);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🎼 كابتن المايسترو</Text>
        <Text style={styles.sub}>سجّل دخول عشان تشوف الأوردرات الجاهزة للتوصيل</Text>
        <TextInput style={styles.input} placeholder="كود الكابتن" placeholderTextColor={colors.textSoft} value={code} onChangeText={setCode} textAlign="right" />
        <TextInput style={styles.input} placeholder="الباسورد" placeholderTextColor={colors.textSoft} value={password} onChangeText={setPassword} secureTextEntry textAlign="right" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} disabled={loading || !code || !password} onPress={submit}>
          <Text style={styles.btnText}>{loading ? "جارٍ الدخول..." : "دخول"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBlack, justifyContent: "center" },
  card: { padding: 24 },
  title: { color: colors.white, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  sub: { color: colors.textSoft, textAlign: "center", marginBottom: 24 },
  input: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: 14, color: colors.white, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  error: { color: colors.danger, textAlign: "center", marginBottom: 10 },
  btn: { backgroundColor: colors.boltYellow, borderRadius: radius.md, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#1a1400", fontWeight: "800", fontSize: 16 },
});
