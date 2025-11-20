import { useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export function GestureWrapper({ children, enableSwipe = true }) {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureStartX = useRef(0);

  if (!enableSwipe) {
    return children;
  }

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      gestureStartX.current = event.translationX;
    })
    .onUpdate((event) => {
      // Only allow horizontal swipes
      if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
        translateX.setValue(event.translationX);
      }
    })
    .onEnd((event) => {
      const swipeDistance = event.translationX;
      const swipeVelocity = event.velocityX;

      // Swipe right (previous tab)
      if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 500) {
        Animated.spring(translateX, {
          toValue: SCREEN_WIDTH,
          useNativeDriver: true,
        }).start(() => {
          navigateToPreviousTab();
          translateX.setValue(0);
        });
      }
      // Swipe left (next tab)
      else if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -500) {
        Animated.spring(translateX, {
          toValue: -SCREEN_WIDTH,
          useNativeDriver: true,
        }).start(() => {
          navigateToNextTab();
          translateX.setValue(0);
        });
      }
      // Reset position
      else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });

  const navigateToPreviousTab = () => {
    const state = navigation.getState();
    const currentIndex = state.index;
    const routes = state.routes;

    if (currentIndex > 0) {
      navigation.navigate(routes[currentIndex - 1].name);
    }
  };

  const navigateToNextTab = () => {
    const state = navigation.getState();
    const currentIndex = state.index;
    const routes = state.routes;

    if (currentIndex < routes.length - 1) {
      navigation.navigate(routes[currentIndex + 1].name);
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX }],
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}