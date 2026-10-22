import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { AppLogo } from '@/shared/ui/components/AppLogo';

export const ONBOARDING_COMPLETED_KEY = '@sari3_onboarding_completed';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FOOD_SCREEN1_IMAGE = require('../../assets/images/food_screen1.png');
const DELIVERY_LOTTIE = require('../../assets/lotties/Delivery-yellow.json');
const SCOOTER_FALLBACK_IMAGE = require('../../assets/avatar_home_screen.jpeg');

const isLottieSupported =
  Platform.OS !== 'web' &&
  (Boolean(UIManager.getViewManagerConfig('LottieAnimationView')) ||
    Boolean(UIManager.getViewManagerConfig('RCTLottieAnimationView')));

interface SlideItem {
  id: string;
  badge: string;
  titlePart1: string;
  titleHighlight: string;
  titlePart2?: string;
  description: string;
  type: 'restaurants_market' | 'delivery_speed' | 'discounts_deals';
}

const SLIDES: SlideItem[] = [
  {
    id: '1',
    badge: 'تنوع لا محدود',
    titlePart1: 'كل مطاعمك ومتاجرك',
    titleHighlight: 'في مكان واحد',
    description:
      'استكشف أشهى الأكلات، طلبات السوبرماركت، والاحتياجات اليومية من أقرب الأماكن إليك بضغطة واحدة.',
    type: 'restaurants_market',
  },
  {
    id: '2',
    badge: 'سرعة فائقة',
    titlePart1: 'توصيل سريع...',
    titleHighlight: 'لباب بيتك',
    description:
      'طلباتك بتوصلك سخنة وطازجة في أسرع وقت مع كباتن سريع المجهزين لتلبية طلبك بأعلى معايير الأمان.',
    type: 'delivery_speed',
  },
  {
    id: '3',
    badge: 'توفير مستمر',
    titlePart1: 'عروض وتخفيضات',
    titleHighlight: 'حصرية ويومية',
    description:
      'استمتع بخصومات حصرية وعروض يومية متجددة على وجباتك المفضلة ومشترياتك بأفضل الأسعار.',
    type: 'discounts_deals',
  },
];

// Circular progress dimensions
const CIRCLE_RADIUS = 30;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { theme, isDark } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideItem>>(null);

  // Reanimated progress shared value: 1/3 -> 2/3 -> 1.0
  const progressAnim = useSharedValue(1 / 3);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      void Haptics.impactAsync(style);
    } catch {
      // ignore on unsupported devices
    }
  };

  const completeOnboarding = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
    router.replace('/(customer)/(home)');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrentIndex(nextIdx);
      progressAnim.value = withTiming((nextIdx + 1) / SLIDES.length, { duration: 300 });
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void completeOnboarding();
    }
  };

  const handleSkip = () => {
    void completeOnboarding();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentIndex && page >= 0 && page < SLIDES.length) {
      setCurrentIndex(page);
      progressAnim.value = withTiming((page + 1) / SLIDES.length, { duration: 250 });
    }
  };

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressAnim.value);
    return {
      strokeDashoffset,
    };
  });

  const renderIllustration = (type: SlideItem['type']) => {
    switch (type) {
      case 'restaurants_market':
        return (
          <View style={styles.artContainer}>
            {/* Ambient Background Glow */}
            <View
              style={[
                styles.artGlow,
                {
                  backgroundColor: colors.primary + '18',
                },
              ]}
            />

            {/* Central Elevated Card with Food Image */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardInnerMediaWrap}>
                <Image
                  source={FOOD_SCREEN1_IMAGE}
                  style={styles.foodHeroImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>

              {/* Floating Pill 1: Restaurant Badge */}
              <View
                style={[
                  styles.floatingPill,
                  styles.pillTopRight,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: '#FF6B6B20' }]}>
                  <Icon name="Utensils" size={16} color="#FF6B6B" />
                </View>
                <View>
                  <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily }]}>
                    أشهر المطاعم
                  </Text>
                  {/* <Text style={[styles.pillSubtitle, { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily }]}>
                    +150 مطعم
                  </Text> */}
                </View>
              </View>

              {/* Floating Pill 2: Market Badge */}
              <View
                style={[
                  styles.floatingPill,
                  styles.pillBottomLeft,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: '#27AE6020' }]}>
                  <Icon name="ShoppingBag" size={16} color="#27AE60" />
                </View>
                <View>
                  <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily }]}>
                    سوبرماركت وماركت
                  </Text>
                  <Text style={[styles.pillSubtitle, { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily }]}>
                    مقاضي طازجة يومية
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'delivery_speed':
        return (
          <View style={styles.artContainer}>
            {/* Ambient Background Glow */}
            <View
              style={[
                styles.artGlow,
                {
                  backgroundColor: colors.primary + '22',
                },
              ]}
            />

            {/* Central Elevated Card with Animated Delivery Lottie */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardInnerMediaWrap}>
                {isLottieSupported ? (
                  <LottieView
                    source={DELIVERY_LOTTIE}
                    autoPlay
                    loop
                    style={styles.deliveryLottie}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={SCOOTER_FALLBACK_IMAGE}
                    style={styles.foodHeroImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}
              </View>

              {/* Floating Speed Badge */}
              <View
                style={[
                  styles.floatingPill,
                  styles.pillTopRight,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: colors.primary + '30' }]}>
                  <Icon name="Zap" size={16} color={colors.primaryPressed} />
                </View>
                <View>
                  <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily }]}>
                    توصيل سريع
                  </Text>
                  <Text style={[styles.pillSubtitle, { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily }]}>
                    15 - 30 دقيقة
                  </Text>
                </View>
              </View>

              {/* Floating Shield Badge */}
              <View
                style={[
                  styles.floatingPill,
                  styles.pillBottomLeft,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: '#3498DB20' }]}>
                  <Icon name="ShieldCheck" size={16} color="#3498DB" />
                </View>
                <View>
                  <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily }]}>
                    أمان واحترافية
                  </Text>
                  <Text style={[styles.pillSubtitle, { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily }]}>
                    كباتن مدربون
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'discounts_deals':
        return (
          <View style={styles.artContainer}>
            {/* Ambient Background Glow */}
            <View
              style={[
                styles.artGlow,
                {
                  backgroundColor: '#FF950020',
                },
              ]}
            />

            {/* Central Elevated Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Big Discount Tag */}
              <View style={styles.centerArtBadge}>
                <View
                  style={[
                    styles.primaryArtCircle,
                    {
                      backgroundColor: '#FF9500',
                    },
                  ]}
                >
                  <Icon name="Percent" size={46} color="#FFFFFF" strokeWidth={2.8} />
                </View>
                <View
                  style={[
                    styles.discountPill,
                    { backgroundColor: colors.primarySubtle, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.discountPillText, { color: colors.primaryPressed, fontFamily: theme.typography.button.fontFamily }]}>
                    خصومات تصل إلى 50%
                  </Text>
                </View>
              </View>

              {/* Floating Promo Coupon Card */}
              <View
                style={[
                  styles.floatingPill,
                  styles.pillTopRight,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: '#9B51E020' }]}>
                  <Icon name="Tag" size={16} color="#9B51E0" />
                </View>
                <View>
                  <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily }]}>
                    كوبونات توفير
                  </Text>
                  <Text style={[styles.pillSubtitle, { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily }]}>
                    عروض متجددة يومياً
                  </Text>
                </View>
              </View>

              {/* Floating Free Delivery Pill */}
              <View
                style={[
                  styles.floatingPill,
                  styles.pillBottomLeft,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.pillIconWrap, { backgroundColor: '#27AE6020' }]}>
                  <Icon name="Sparkles" size={16} color="#27AE60" />
                </View>
                <View>
                  <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily }]}>
                    عروض حصرية
                  </Text>
                  <Text style={[styles.pillSubtitle, { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily }]}>
                    وجبات وعروض عائلية
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
    }
  };

  const renderSlide = ({ item }: { item: SlideItem }) => {
    return (
      <View style={[styles.slideWrap, { width: SCREEN_WIDTH }]}>
        {/* Visual Hero Container */}
        {renderIllustration(item.type)}

        {/* Text Details Area */}
        <View style={styles.textDetailsWrap}>
          {/* Badge Tag */}
          <View
            style={[
              styles.badgeTag,
              {
                backgroundColor: colors.primarySubtle,
                borderColor: colors.primary + '40',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeTagText,
                {
                  color: colors.primaryPressed,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              {item.badge}
            </Text>
          </View>

          {/* Headline with Gold Highlight */}
          <Text
            style={[
              styles.slideTitle,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingLarge.fontFamily,
              },
            ]}
          >
            {item.titlePart1}{' '}
            <Text style={{ color: colors.primary }}>{item.titleHighlight}</Text>
          </Text>

          {/* Description */}
          <Text
            style={[
              styles.slideDescription,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.bodyMedium.fontFamily,
              },
            ]}
          >
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        {/* App Mini Logo */}
        <View style={styles.topLogoWrap}>
          <AppLogo size={38} />
        </View>

        {/* Skip button (only shown on slides 0 & 1) */}
        {!isLastSlide ? (
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={12}
            style={[
              styles.skipButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="تخطي المقدمة"
          >
            <Text
              style={[
                styles.skipButtonText,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              تخطي
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButtonSpacer} />
        )}
      </View>

      {/* Main Slides Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Bottom Controls Area: Expanding Dots + Circular Progress CTA */}
      <View style={styles.bottomControlsArea}>
        {/* Expanding Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isActive
                    ? [styles.activeDot, { backgroundColor: colors.primary }]
                    : [
                        styles.inactiveDot,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.18)'
                            : 'rgba(0, 0, 0, 0.12)',
                        },
                      ],
                ]}
              />
            );
          })}
        </View>

        {/* Circular Progress Button (with dynamic expansion on slide 3) */}
        {!isLastSlide ? (
          <View style={styles.circularCtaWrapper}>
            <Svg width={74} height={74} viewBox="0 0 74 74" style={styles.svgProgress}>
              {/* Background Track Circle */}
              <Circle
                cx={37}
                cy={37}
                r={CIRCLE_RADIUS}
                stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(245, 189, 22, 0.22)'}
                strokeWidth={4.5}
                fill="transparent"
              />
              {/* Dynamic Animated Progress Arc */}
              <AnimatedCircle
                cx={37}
                cy={37}
                r={CIRCLE_RADIUS}
                stroke={colors.primary}
                strokeWidth={4.5}
                strokeDasharray={`${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
                fill="transparent"
                transform="rotate(-90 37 37)"
              />
            </Svg>

            {/* Inner Round Button */}
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
              style={[
                styles.innerRoundBtn,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="الشاشة التالية"
            >
              <Icon name="ArrowRight" size={24} color="#1A1D20" strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        ) : (
          /* Final Slide: Big Brand Button */
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={[
              styles.startNowButton,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="ابدأ الآن"
          >
            <Text
              style={[
                styles.startNowText,
                {
                  color: '#1A1D20',
                  fontFamily: theme.typography.button.fontFamily,
                },
              ]}
            >
              ابدأ الآن
            </Text>
            <View style={styles.startNowIconCircle}>
              <Icon name="ArrowRight" size={18} color="#1A1D20" strokeWidth={2.8} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    zIndex: 10,
  },
  topLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skipButtonSpacer: {
    width: 60,
    height: 32,
  },
  flatList: {
    flex: 1,
  },
  slideWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  artContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  artGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: SCREEN_WIDTH * 0.375,
  },
  heroCard: {
    width: '100%',  //was 92
    height: '90%',
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardInnerMediaWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // padding: 8,
  },
  centerArtBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryArtCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#F5BD16',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  floatingPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  pillTopRight: {
    top: 14,
    right: -10,
  },
  pillBottomLeft: {
    bottom: 14,
    left: -10,
  },
  pillIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  pillSubtitle: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 1,
  },
  discountPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  discountPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  foodHeroImage: {
    width: '95%',
    height: '95%',
  },
  deliveryLottie: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    backgroundColor: "white"
  },
  textDetailsWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeTag: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slideTitle: {
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 10,
  },
  bottomControlsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 16,
    minHeight: 88,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 26,
  },
  inactiveDot: {
    width: 8,
  },
  circularCtaWrapper: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgProgress: {
    position: 'absolute',
  },
  innerRoundBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#F5BD16',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  startNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  startNowText: {
    fontSize: 16,
    fontWeight: '800',
  },
  startNowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
