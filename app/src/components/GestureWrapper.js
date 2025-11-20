import { useRef, useState, useEffect } from 'react';
import { Animated, Dimensions, View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export function GestureWrapper({ children, enableSwipe = true }) {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;
  const [isActive, setIsActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const indicatorScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(indicatorScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(indicatorOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorScale, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  if (!enableSwipe) {
    return children;
  }

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      setIsActive(true);
      if (event.translationX > 0) {
        setSwipeDirection('right');
      } else {
        setSwipeDirection('left');
      }
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
        translateX.setValue(event.translationX);
        
        if (event.translationX > 0) {
          setSwipeDirection('right');
        } else {
          setSwipeDirection('left');
        }
      }
    })
    .onEnd((event) => {
      const swipeDistance = event.translationX;
      const swipeVelocity = event.velocityX;

      if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 500) {
        Animated.spring(translateX, {
          toValue: SCREEN_WIDTH,
          useNativeDriver: true,
        }).start(() => {
          navigateToPreviousTab();
          translateX.setValue(0);
          setIsActive(false);
        });
      } else if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -500) {
        Animated.spring(translateX, {
          toValue: -SCREEN_WIDTH,
          useNativeDriver: true,
        }).start(() => {
          navigateToNextTab();
          translateX.setValue(0);
          setIsActive(false);
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start(() => {
          setIsActive(false);
        });
      }
    })
    .onFinalize(() => {
      setIsActive(false);
      setSwipeDirection(null);
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
      <View style={{ flex: 1 }}>
        {/* Left Swipe Indicator */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.leftIndicator,
            {
              opacity: swipeDirection === 'right' ? indicatorOpacity : 0,
              transform: [{ scale: indicatorScale }],
            },
          ]}
        >
          <Ionicons name="chevron-back" size={32} color="#2563eb" />
          <Text style={styles.indicatorText}>Previous</Text>
        </Animated.View>

        {/* Right Swipe Indicator */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.rightIndicator,
            {
              opacity: swipeDirection === 'left' ? indicatorOpacity : 0,
              transform: [{ scale: indicatorScale }],
            },
          ]}
        >
          <Text style={styles.indicatorText}>Next</Text>
          <Ionicons name="chevron-forward" size={32} color="#2563eb" />
        </Animated.View>

        {/* Main Content */}
        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateX }],
          }}
        >
          {children}
        </Animated.View>

        {/* Bottom Gesture Hint */}
        {!isActive && (
          <View style={styles.gestureHint}>
            <View style={styles.hintBar} />
            <Text style={styles.hintText}>Swipe left or right to navigate</Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -50,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  leftIndicator: {
    left: 20,
  },
  rightIndicator: {
    right: 20,
  },
  indicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  gestureHint: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  hintBar: {
    width: 60,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});