import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APP_ICON = require('../../../../assets/images/icon-2.png');

interface AppSplashScreenProps {
  /** When true, initiates the smooth fade-out exit animation. */
  isReady: boolean;
  /** Callback fired once the exit animation finishes to cleanly unmount the splash. */
  onAnimationEnd: () => void;
  /** Whether Tajawal fonts have finished loading. */
  fontsLoaded?: boolean;
}

/**
 * Animated Brand Splash Screen for Sari3:
 * - Dark Luxury aesthetic (#1A1915 background with rich gold accents)
 * - 4-stage staggered entrance (Logo spring -> Title & slogan rise -> Pulsing gold dots -> Smooth fade exit)
 * - Zero white flash: overlays seamlessly on the already-mounted root screen
 */
export function AppSplashScreen({
  isReady,
  onAnimationEnd,
  fontsLoaded = false,
}: AppSplashScreenProps) {
  const insets = useSafeAreaInsets();

  // Root container opacity for fade-out exit
  const containerOpacity = useSharedValue(1);

  // Logo animation values (Stage 1)
  const logoScale = useSharedValue(0.82);
  const logoOpacity = useSharedValue(0);

  // Text animation values (Stage 2)
  const textTranslateY = useSharedValue(16);
  const textOpacity = useSharedValue(0);

  // 3-dot pulse animation values (Stage 3)
  const dot1Scale = useSharedValue(1);
  const dot2Scale = useSharedValue(1);
  const dot3Scale = useSharedValue(1);

  // Start entrance animations on mount
  useEffect(() => {
    // 1. Logo entrance: Spring zoom + fade in (0 - 450ms)
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 160,
    });
    logoOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });

    // 2. Identity text entrance: rise + fade in (delayed by 180ms)
    textTranslateY.value = withDelay(
      180,
      withTiming(0, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      }),
    );
    textOpacity.value = withDelay(
      180,
      withTiming(1, {
        duration: 420,
        easing: Easing.out(Easing.quad),
      }),
    );

    // 3. Staggered pulsing dots (looping)
    dot1Scale.value = withDelay(
      350,
      withRepeat(
        withSequence(
          withTiming(1.35, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );

    dot2Scale.value = withDelay(
      480,
      withRepeat(
        withSequence(
          withTiming(1.35, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );

    dot3Scale.value = withDelay(
      610,
      withRepeat(
        withSequence(
          withTiming(1.35, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  // Exit transition when app requirements are ready (Stage 4)
  useEffect(() => {
    if (isReady) {
      containerOpacity.value = withTiming(
        0,
        {
          duration: 380,
          easing: Easing.out(Easing.ease),
        },
        (finished) => {
          if (finished) {
            runOnJS(onAnimationEnd)();
          }
        },
      );
    }
  }, [isReady]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
    opacity: textOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dot1Scale.value }],
    opacity: dot1Scale.value > 1 ? 1 : 0.6,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dot2Scale.value }],
    opacity: dot2Scale.value > 1 ? 1 : 0.6,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dot3Scale.value }],
    opacity: dot3Scale.value > 1 ? 1 : 0.6,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1915" translucent />

      {/* Main Center Content */}
      <View style={styles.centerWrap}>
        {/* Logo with warm golden glow shadow */}
        <Animated.View style={[styles.logoCard, logoAnimatedStyle]}>
          <Image
            source={APP_ICON}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Name & Slogan */}
        <Animated.View style={[styles.textWrap, textAnimatedStyle]}>
          <Text
            style={[
              styles.appName,
              fontsLoaded && { fontFamily: 'Tajawal_700Bold' },
            ]}
          >
            سـريـع
          </Text>

          <Text
            style={[
              styles.slogan,
              fontsLoaded && { fontFamily: 'Tajawal_500Medium' },
            ]}
          >
            توصيل سريع لباب بيتك
          </Text>
        </Animated.View>

        {/* 3-Dot Staggered Pulsing Loader */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>
      </View>

      {/* Footer Branding at bottom */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Text
          style={[
            styles.footerText,
            fontsLoaded && { fontFamily: 'Tajawal_400Regular' },
          ]}
        >
          منصة سريع للتوصيل
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1915',
    zIndex: 9999,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 104,
    height: 104,
    borderRadius: 26,
    backgroundColor: '#25231D',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 189, 22, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FAC402',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  textWrap: {
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F5BD16',
    letterSpacing: 1,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C7C4BE',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    height: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FAC402',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#7E7B74',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
