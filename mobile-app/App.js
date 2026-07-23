import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import SplashScreen from "./src/screens/SplashScreen.jsx";
import RestaurantListScreen from "./src/screens/RestaurantListScreen.jsx";
import MenuScreen from "./src/screens/MenuScreen.jsx";
import CheckoutScreen from "./src/screens/CheckoutScreen.jsx";
import TrackingScreen from "./src/screens/TrackingScreen.jsx";

export default function App() {
  const [screen, setScreen] = useState("splash"); // splash -> restaurants -> menu -> checkout -> tracking
  const [restaurant, setRestaurant] = useState(null);
  const [cart, setCart] = useState(null);
  const [order, setOrder] = useState(null);

  return (
    <>
      <StatusBar style="light" />
      {screen === "splash" && <SplashScreen onDone={() => setScreen("restaurants")} />}
      {screen === "restaurants" && (
        <RestaurantListScreen
          onSelect={(r) => {
            setRestaurant(r);
            setScreen("menu");
          }}
        />
      )}
      {screen === "menu" && (
        <MenuScreen
          restaurant={restaurant}
          onBack={() => setScreen("restaurants")}
          onCheckout={(c) => {
            setCart(c);
            setScreen("checkout");
          }}
        />
      )}
      {screen === "checkout" && (
        <CheckoutScreen
          cart={cart}
          onBack={() => setScreen("menu")}
          onPlaced={(o) => {
            setOrder(o);
            setScreen("tracking");
          }}
        />
      )}
      {screen === "tracking" && (
        <TrackingScreen
          order={order}
          onNewOrder={() => {
            setRestaurant(null);
            setCart(null);
            setOrder(null);
            setScreen("restaurants");
          }}
        />
      )}
    </>
  );
}
