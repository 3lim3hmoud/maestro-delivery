import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import LoginScreen from "./src/screens/LoginScreen.jsx";
import AvailableOrdersScreen from "./src/screens/AvailableOrdersScreen.jsx";
import ActiveOrderScreen from "./src/screens/ActiveOrderScreen.jsx";

export default function App() {
  const [courier, setCourier] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

  return (
    <>
      <StatusBar style="light" />
      {!courier ? (
        <LoginScreen onLogin={setCourier} />
      ) : activeOrder ? (
        <ActiveOrderScreen order={activeOrder} onDone={() => setActiveOrder(null)} />
      ) : (
        <AvailableOrdersScreen onClaimed={setActiveOrder} />
      )}
    </>
  );
}
