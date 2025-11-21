import { View, StyleSheet, Animated, Dimensions, Text } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 800;

export function SwipeGestureHandler({ children, currentRoute }) {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const [swipeDirection, setSwipeDirection] = useState(null);

  const routeOrder = ["Monitoring", "Control", "Profile"];
  const routeIcons = {
    Monitoring: "analytics",
    Control: "options",
    Profile: "person",
  };

  const getCurrentIndex = () => {
    const state = navigation.getState();
    const tabState = state.routes.find((r) => r.name === "MainTabs")?.state;
    if (tabState) {
      const activeTab = tabState.routes[tabState.index]?.name;
      return routeOrder.indexOf(activeTab);
    }
    return routeOrder.indexOf(currentRoute);
  };

  const canSwipeLeft = () => {
    const index = getCurrentIndex();
    return index < routeOrder.length - 1;
  };

  const canSwipeRight = () => {
    const index = getCurrentIndex();
    return index > 0;
  };

  const getTargetRoute = (direction) => {
    const currentIndex = getCurrentIndex();
    if (direction === "left" && canSwipeLeft()) {
      return routeOrder[currentIndex + 1];
    } else if (direction === "right" && canSwipeRight()) {
      return routeOrder[currentIndex - 1];
    }
    return null;
  };

  const navigateToRoute = (direction) => {
    const targetRoute = getTargetRoute(direction);
    if (targetRoute) {
      navigation.navigate(targetRoute);
    }
  };

  const panGesture = Gesture.Pan()
    // Hanya aktif untuk gerakan horizontal, bukan vertikal
    .activeOffsetX([-15, 15]) // Minimal 15px horizontal movement to activate
    .failOffsetY([-20, 20]) // Fail if vertical movement exceeds 20px
    .enableTrackpadTwoFingerGesture(false)
    .onStart(() => {
      Animated.timing(indicatorOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    })
    .onUpdate((event) => {
      const { translationX, translationY } = event;

      // Jika gerakan vertikal lebih dominan, jangan proses gesture
      if (Math.abs(translationY) > Math.abs(translationX) * 1.5) {
        return;
      }

      // Tentukan arah swipe
      if (translationX > 15 && canSwipeRight()) {
        setSwipeDirection("right");
      } else if (translationX < -15 && canSwipeLeft()) {
        setSwipeDirection("left");
      } else if (Math.abs(translationX) < 15) {
        setSwipeDirection(null);
      }

      // Batasi gerakan jika tidak bisa swipe
      let limitedTranslation = translationX;
      const maxTranslate = SCREEN_WIDTH * 0.3;

      if (translationX > 0 && !canSwipeRight()) {
        limitedTranslation = Math.min(translationX * 0.2, 40);
      } else if (translationX < 0 && !canSwipeLeft()) {
        limitedTranslation = Math.max(translationX * 0.2, -40);
      } else {
        limitedTranslation = Math.max(
          -maxTranslate,
          Math.min(maxTranslate, translationX)
        );
      }

      translateX.setValue(limitedTranslation);
    })
    .onEnd((event) => {
      const { translationX, velocityX, translationY } = event;

      // Jika gerakan vertikal lebih dominan, batalkan gesture
      if (Math.abs(translationY) > Math.abs(translationX) * 1.5) {
        resetGesture();
        return;
      }

      const shouldNavigate =
        Math.abs(translationX) > SWIPE_THRESHOLD ||
        Math.abs(velocityX) > VELOCITY_THRESHOLD;

      if (shouldNavigate) {
        const direction = translationX > 0 ? "right" : "left";

        if (
          (direction === "right" && canSwipeRight()) ||
          (direction === "left" && canSwipeLeft())
        ) {
          // Animate out sebelum navigate
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: direction === "right" ? SCREEN_WIDTH : -SCREEN_WIDTH,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(indicatorOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            navigateToRoute(direction);
            translateX.setValue(0);
            setSwipeDirection(null);
          });
          return;
        }
      }

      // Kembali ke posisi awal
      resetGesture(velocityX);
    });

  const resetGesture = (velocity = 0) => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
        velocity: velocity / 1000,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSwipeDirection(null);
    });
  };

  const targetRoute = getTargetRoute(swipeDirection);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: translateX.interpolate({
              inputRange: [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
              outputRange: [0.85, 1, 0.85],
            }),
          },
        ]}
      >
        {children}

        {/* Indicator kiri */}
        {swipeDirection === "right" && targetRoute && (
          <Animated.View
            style={[
              styles.leftIndicator,
              {
                opacity: indicatorOpacity,
                transform: [
                  {
                    translateX: translateX.interpolate({
                      inputRange: [0, SCREEN_WIDTH * 0.3],
                      outputRange: [-100, 20],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.indicatorContent}>
              <Ionicons
                name="chevron-back-circle"
                size={28}
                color="#2563eb"
              />
              <View style={styles.routeInfo}>
                <Ionicons
                  name={routeIcons[targetRoute]}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.routeName}>{targetRoute}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Indicator kanan */}
        {swipeDirection === "left" && targetRoute && (
          <Animated.View
            style={[
              styles.rightIndicator,
              {
                opacity: indicatorOpacity,
                transform: [
                  {
                    translateX: translateX.interpolate({
                      inputRange: [-SCREEN_WIDTH * 0.3, 0],
                      outputRange: [-20, 100],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.indicatorContent}>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{targetRoute}</Text>
                <Ionicons
                  name={routeIcons[targetRoute]}
                  size={18}
                  color="#fff"
                />
              </View>
              <Ionicons
                name="chevron-forward-circle"
                size={28}
                color="#2563eb"
              />
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  leftIndicator: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -30,
    zIndex: 1000,
  },
  rightIndicator: {
    position: "absolute",
    right: 0,
    top: "50%",
    marginTop: -30,
    zIndex: 1000,
  },
  indicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});