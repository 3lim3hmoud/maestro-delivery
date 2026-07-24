import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import LoginScreen from "./src/screens/LoginScreen.jsx";
import AvailableOrdersScreen from "./src/screens/AvailableOrdersScreen.jsx";
import ActiveOrderScreen from "./src/screens/ActiveOrderScreen.jsx";
import ReturnToBaseScreen from "./src/screens/ReturnToBaseScreen.jsx";

export default function App() {
  const [courier, setCourier] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [deliveredOrder, setDeliveredOrder] = useState(null); // waiting on "رجعت للمقر"

  return (
    <>
      <StatusBar style="light" />
      {!courier ? (
        <LoginScreen onLogin={setCourier} />
      ) : deliveredOrder ? (
        <ReturnToBaseScreen order={deliveredOrder} onReturned={() => setDeliveredOrder(null)} />
      ) : activeOrder ? (
        <ActiveOrderScreen
          order={activeOrder}
          onDone={(finishedOrder) => { setActiveOrder(null); setDeliveredOrder(finishedOrder); }}
        />
      ) : (
        <AvailableOrdersScreen onClaimed={setActiveOrder} />
      )}
    </>
  );
}
