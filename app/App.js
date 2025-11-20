import { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Text, Animated } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { MonitoringScreen } from "./src/screens/MonitoringScreen.js";
import { ControlScreen } from "./src/screens/ControlScreen.js";
import { ProfileScreen } from "./src/screens/ProfileScreen.js";
import { LoginScreen } from "./src/screens/LoginScreen.js";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext.js";
import { assertConfig } from "./src/services/config.js";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

enableScreens(true);

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Custom Splash Screen Component
function CustomSplashScreen({ onFinish }) {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={[splashStyles.content, { opacity: fadeAnim }]}>
        <Text style={splashStyles.icon}>🌡️</Text>
        <Text style={splashStyles.title}>IOTWatch</Text>
        <Text style={splashStyles.subtitle}>Monitor Your Temperature</Text>
      </Animated.View>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: "IOTWatch",
        headerTitleAlign: "center",
        headerTintColor: "#1f2937",
        headerStyle: { backgroundColor: "#f8f9fb" },
        headerTitleStyle: { fontWeight: "600", fontSize: 18 },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Monitoring") {
            iconName = "analytics";
          } else if (route.name === "Control") {
            iconName = "options";
          } else if (route.name === "Profile") {
            iconName = "person";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Monitoring" component={MonitoringScreen} />
      <Tab.Screen name="Control" component={ControlScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        assertConfig();
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && !loading && !showSplash) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, loading, showSplash]);

  if (!appIsReady || loading || showSplash) {
    return (
      <CustomSplashScreen 
        onFinish={() => {
          setShowSplash(false);
          onLayoutRootView();
        }} 
      />
    );
  }

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#f8f9fb",
    },
  };

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="MainTabs" component={TabNavigator} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="MainTabs" component={TabNavigator} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#dbeafe",
    fontWeight: "500",
  },
});