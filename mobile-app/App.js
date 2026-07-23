import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import SplashScreen from "./src/screens/SplashScreen.jsx";
import RestaurantListScreen from "./src/screens/RestaurantListScreen.jsx";
import MenuScreen from "./src/screens/MenuScreen.jsx";
import CheckoutScreen from "./src/screens/CheckoutScreen.jsx";
import TrackingScreen from "./src/screens/TrackingScreen.jsx";
import OrderHistoryScreen from "./src/screens/OrderHistoryScreen.jsx";
import useCustomerProfile from "./src/useCustomerProfile.js";

export default function App() {
  const [screen, setScreen] = useState("splash"); // splash -> restaurants -> menu -> checkout -> tracking -> history
  const [restaurant, setRestaurant] = useState(null);
  const [cart, setCart] = useState(null);
  const [order, setOrder] = useState(null);
  const profile = useCustomerProfile();

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
          onOpenHistory={() => setScreen("history")}
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
          initialName={profile.name}
          initialPhone={profile.phone}
          onSaveProfile={profile.save}
          onBack={() => setScreen(restaurant ? "menu" : "history")}
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
      {screen === "history" && (
        <OrderHistoryScreen
          phone={profile.phone}
          onBack={() => setScreen("restaurants")}
          onReorder={(pastOrder) => {
            setRestaurant(null); // reordering skips the menu screen — we already have the items
            setCart({
              items: pastOrder.items,
              total: pastOrder.total,
              restaurantId: pastOrder.restaurantId,
            });
            setScreen("checkout");
          }}
        />
      )}
    </>
  );
}
