import React, { useMemo, useState } from 'react';
import {
  I18nManager,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { useTheme } from '@/shared/ui/context/ThemeContext';
import {
  Button,
  QuantitySelector,
  Sari3BottomSheet,
  Text as SariText,
} from '@/shared/ui/components';
import {
  hapticPairings,
  listEntrance,
  SkeletonCard,
  SkeletonImage,
  SkeletonItem,
  SkeletonProductCard,
  SkeletonStoreCard,
  SkeletonText,
  useAddToCartFeedback,
  useEntranceAnimation,
  useFavoriteToggleAnimation,
  useLoadingStateTransition,
  useModalMotion,
  useOrderStatusTransition,
  useOutcomeFeedback,
  useReducedMotion,
  type ConfirmedOrderStatus,
  type LoadingPhase,
  type OutcomeKind,
} from '@/shared/ui/motion';

/**
 * Dev-only motion gallery (feature 010). The verification harness for every
 * recipe and state — NOT reachable from production navigation, and it
 * renders nothing outside `__DEV__` so it never ships in a production
 * bundle's visible UI. Doubles as the Phase 3 consumer documentation
 * (contracts/motion-api.md §5).
 */

// ── Section primitives ──────────────────────────────────────────────────────

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  const styles = useSectionStyles();
  return (
    <View style={styles.section}>
      <SariText variant="headingSmall" color="textPrimary">
        {title}
      </SariText>
      {caption ? (
        <SariText variant="caption" color="textMuted">
          {caption}
        </SariText>
      ) : null}
      {children}
    </View>
  );
}

function useSectionStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        section: {
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.divider,
        },
      }),
    [theme],
  );
}

// ── US1: Button wall ────────────────────────────────────────────────────────

type ButtonVariantKey =
  | 'primary'
  | 'secondary'
  | 'outlined'
  | 'inverted'
  | 'ghost'
  | 'destructive';

function ButtonWall() {
  const { theme } = useTheme();
  const styles = useButtonWallStyles(theme);
  const [loading, setLoading] = useState(false);
  const [loadingVariant, setLoadingVariant] = useState<ButtonVariantKey>('primary');

  const variants: ButtonVariantKey[] = [
    'primary',
    'secondary',
    'outlined',
    'inverted',
    'ghost',
    'destructive',
  ];

  return (
    <View style={styles.wall}>
      {variants.map((variant) => (
        <Button
          key={variant}
          label={`Press ${variant}`}
          variant={variant}
          loading={loading && loadingVariant === variant}
          onPress={() => {
            setLoadingVariant(variant);
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        />
      ))}
      <Button label="Disabled (no press motion)" variant="primary" disabled onPress={() => undefined} />
      <SariText variant="caption" color="textMuted">
        Recipe: buttonPress via usePressAnimation — identical compression on every
        enabled variant; disabled plays nothing; loading fades instead of pressing.
      </SariText>
    </View>
  );
}

const useButtonWallStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    wall: {
      gap: theme.spacing.sm,
    },
  });

// ── US2: List entrance ──────────────────────────────────────────────────────

function EntranceCell({
  index,
  itemKey,
  direction,
  children,
}: {
  index: number;
  itemKey: string;
  direction: 'vertical' | 'horizontal';
  children: React.ReactNode;
}) {
  const config = listEntrance({ direction });
  const animatedStyle = useEntranceAnimation(index, { ...config, itemKey });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function DemoRow({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radii.medium,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <SariText variant="bodyMedium" color="textPrimary">
        {title}
      </SariText>
    </View>
  );
}

function ListEntranceSection() {
  const { theme } = useTheme();
  const styles = useListStyles(theme);
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');

  const shortItems = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ id: `short-${i}`, title: `Short list item ${i + 1}` })),
    [],
  );
  const longItems = useMemo(
    () => Array.from({ length: 1000 }, (_, i) => ({ id: `long-${i}`, title: `Long list item ${i + 1}` })),
    [],
  );

  return (
    <View>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() =>
          setDirection((d) => (d === 'vertical' ? 'horizontal' : 'vertical'))
        }
      >
        <SariText variant="label" color="textPrimary">
          Direction: {direction} (tap to toggle — horizontal mirrors under RTL)
        </SariText>
      </TouchableOpacity>

      <SariText variant="label" color="textSecondary">
        Opted-in short list (capped stagger: min(index, 8) × 30ms)
      </SariText>
      <View>
        {shortItems.map((item, index) => (
          <EntranceCell key={item.id} index={index} itemKey={item.id} direction={direction}>
            <DemoRow title={item.title} />
          </EntranceCell>
        ))}
      </View>

      <SariText variant="label" color="textSecondary">
        Opted-in 1000-item FlashList (scroll — same capped cascade, no pileup)
      </SariText>
      <View style={styles.longList}>
        <FlashList
          data={longItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <EntranceCell index={index} itemKey={item.id} direction={direction}>
              <DemoRow title={item.title} />
            </EntranceCell>
          )}
        />
      </View>

      <SariText variant="label" color="textSecondary">
        Non-opted baseline (renders exactly as before — FR-007)
      </SariText>
      {shortItems.slice(0, 3).map((item) => (
        <DemoRow key={`plain-${item.id}`} title={`${item.title} (no animation)`} />
      ))}

      <SariText variant="caption" color="textMuted">
        Recipe: listEntrance via useEntranceAnimation(index, config) — strictly
        opt-in; item keys guard against FlashList cell-recycling replays.
      </SariText>
    </View>
  );
}

const useListStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    toggle: {
      padding: theme.spacing.sm,
      borderRadius: theme.radii.medium,
      backgroundColor: theme.colors.primarySubtle,
      marginBottom: theme.spacing.sm,
    },
    longList: {
      height: 320,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.medium,
      padding: theme.spacing.sm,
    },
  });

// ── US3: Dialog (modal recipe) ──────────────────────────────────────────────

function DialogDemo() {
  const { theme } = useTheme();
  const styles = useDialogStyles(theme);
  const [open, setOpen] = useState(false);
  const { backdropStyle, surfaceStyle } = useModalMotion(open);

  return (
    <View>
      <Button label="Open dialog (modalMotion)" onPress={() => setOpen(true)} />
      {open && (
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
          <Animated.View style={[styles.surface, surfaceStyle]}>
            <SariText variant="headingSmall" color="textPrimary">
              Dialog
            </SariText>
            <SariText variant="bodyMedium" color="textSecondary">
              Backdrop fades; surface settles with subtle scale/translation.
              No bounce.
            </SariText>
            <Button label="Dismiss" variant="outlined" onPress={() => setOpen(false)} />
          </Animated.View>
        </View>
      )}
      <SariText variant="caption" color="textMuted">
        Recipe: useModalMotion — backdrop fade + surface settle (modalMotion
        config), smooth dismissal.
      </SariText>
    </View>
  );
}

const useDialogStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay,
    },
    surface: {
      width: '80%',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.extraLarge,
      backgroundColor: theme.colors.surfaceElevated,
    },
  });

// ── US4: Commerce micro-interactions ────────────────────────────────────────

function FavoriteDemo({ label }: { label: string }) {
  const { theme } = useTheme();
  const styles = useFavoriteStyles(theme);
  const [isFavorite, setIsFavorite] = useState(false);
  const { iconStyle } = useFavoriteToggleAnimation(isFavorite);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => setIsFavorite((f) => !f)}
      accessibilityRole="button"
      accessibilityLabel={`Toggle favorite ${label}`}
    >
      <Animated.View style={iconStyle}>
        <RNText style={[styles.heart, isFavorite && styles.heartOn]}>
          {isFavorite ? '♥' : '♡'}
        </RNText>
      </Animated.View>
      <SariText variant="bodyMedium" color="textPrimary">
        {label} {isFavorite ? '(favorited)' : ''}
      </SariText>
    </TouchableOpacity>
  );
}

const useFavoriteStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 44,
    },
    heart: {
      fontSize: 24,
      color: theme.colors.textMuted,
    },
    heartOn: {
      color: theme.colors.error,
    },
  });

function AddToCartDemo() {
  const { theme } = useTheme();
  const styles = useCartStyles(theme);
  // `cartCount` stands in for the CONFIRMED server/UI state (motion never
  // owns or writes business state — FR-011).
  const [cartCount, setCartCount] = useState(0);
  const { pulseStyle } = useAddToCartFeedback(cartCount);

  return (
    <View style={styles.row}>
      <Animated.View style={pulseStyle}>
        <Button label="Add to cart" onPress={() => setCartCount((c) => c + 1)} />
      </Animated.View>
      <SariText variant="bodyMedium" color="textSecondary">
        Confirmed count: {cartCount}
      </SariText>
    </View>
  );
}

function QuantityDemo() {
  const [quantity, setQuantity] = useState(1);
  return <QuantitySelector quantity={quantity} min={1} max={9} onChange={setQuantity} />;
}

const useCartStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
  });

// ── US5: Bottom sheet ───────────────────────────────────────────────────────

function SheetDemo() {
  const { theme } = useTheme();
  const styles = useSheetStyles(theme);
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Button label="Open sheet (shared animationConfigs)" onPress={() => setOpen(true)} />
      {open && (
        <Sari3BottomSheet
          snapPoints={['35%', '60%']}
          onClose={() => setOpen(false)}
        >
          <View style={styles.sheetContent}>
            <SariText variant="bodyMedium" color="textPrimary">
              Drag between snap points — the spring is the shared
              bottomSheetAnimationConfigs (snappy preset); finger tracking is
              100% gorhom.
            </SariText>
            <Button label="Close" variant="outlined" onPress={() => setOpen(false)} />
          </View>
        </Sari3BottomSheet>
      )}
      <SariText variant="caption" color="textMuted">
        Recipe: config/bottomSheet via Sari3BottomSheet prop passthrough — no
        custom engine, no blur.
      </SariText>
    </View>
  );
}

const useSheetStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    sheetContent: {
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
  });

// ── US6: Skeletons + loading states ─────────────────────────────────────────

function SkeletonsSection() {
  const { theme } = useTheme();
  const styles = useSkeletonStyles(theme);
  const [phase, setPhase] = useState<LoadingPhase>('idle');
  const { transitionStyle } = useLoadingStateTransition(phase);

  const phases: LoadingPhase[] = ['idle', 'loading', 'success', 'error'];
  const nextPhase = () => {
    const current = phases.indexOf(phase);
    setPhase(phases[(current + 1) % phases.length]);
  };

  return (
    <View>
      <SariText variant="label" color="textSecondary">
        Six shared shapes, one pulse language
      </SariText>
      <View style={styles.shapes}>
        <SkeletonText
          style={{ height: 14, width: '60%', backgroundColor: theme.colors.disabled }}
        />
        <SkeletonImage
          style={{ height: 56, width: 56, borderRadius: theme.radii.medium, backgroundColor: theme.colors.disabled }}
        />
        <SkeletonCard
          style={{ height: 64, width: '100%', backgroundColor: theme.colors.disabled }}
        />
        <SkeletonItem style={{ width: '100%' }} />
        <SkeletonProductCard style={{ width: '100%' }} />
        <SkeletonStoreCard style={{ width: '100%' }} />
      </View>

      <SariText variant="label" color="textSecondary">
        Opt-in state cycler (current: {phase})
      </SariText>
      <Animated.View style={[styles.phaseCard, transitionStyle]}>
        <SariText variant="bodyMedium" color="textPrimary">
          Phase content: {phase}
        </SariText>
      </Animated.View>
      <Button label="Cycle idle → loading → success → error" variant="secondary" onPress={nextPhase} />
      <SariText variant="caption" color="textMuted">
        Recipes: useSkeletonAnimation (opacity pulse ~1200ms; static under
        reduced motion) + useLoadingStateTransition (opt-in crossfade —
        loading never animates by default).
      </SariText>
    </View>
  );
}

const useSkeletonStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    shapes: {
      gap: theme.spacing.sm,
    },
    phaseCard: {
      padding: theme.spacing.md,
      borderRadius: theme.radii.large,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });

// ── US7: Order status + outcomes ────────────────────────────────────────────

const STATUSES: ConfirmedOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

function StatusDemo() {
  const { theme } = useTheme();
  const styles = useStatusStyles(theme);
  const [status, setStatus] = useState<ConfirmedOrderStatus>('pending');
  const [unconfirmedLabel, setUnconfirmedLabel] = useState('(unconfirmed: no motion)');
  const { indicatorStyle } = useOrderStatusTransition(status);

  return (
    <View>
      <View style={styles.indicatorRow}>
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <SariText variant="price" color="textInverse">
            ★
          </SariText>
        </Animated.View>
        <SariText variant="bodyMedium" color="textPrimary">
          Confirmed status: {status}
        </SariText>
      </View>
      <View style={styles.chips}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, status === s && styles.chipActive]}
            onPress={() => setStatus(s)}
          >
            <RNText style={styles.chipText}>{s}</RNText>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.unconfirmed} onPress={() => setUnconfirmedLabel(`(unconfirmed tick ${Date.now()})`)}>
        <SariText variant="bodySmall" color="textMuted">
          Unconfirmed change {unconfirmedLabel} — changes label only, feeds NO
          recipe, plays NO status motion (FR-018).
        </SariText>
      </TouchableOpacity>
      <SariText variant="caption" color="textMuted">
        Recipe: orderStatusTransition + useOrderStatusTransition — one subtle
        pop per confirmed change; significant arrivals hap
        `significantStatus` (Light).
      </SariText>
    </View>
  );
}

function OutcomeDemo() {
  const { theme } = useTheme();
  const styles = useOutcomeStyles(theme);
  const [kind, setKind] = useState<OutcomeKind>('success');
  const [trigger, setTrigger] = useState(0);
  const { feedbackStyle } = useOutcomeFeedback(kind, trigger);

  const fire = (k: OutcomeKind) => {
    setKind(k);
    setTrigger((t) => t + 1);
  };

  return (
    <View>
      <View style={styles.row}>
        <Button label="Fire success" variant="primary" onPress={() => fire('success')} />
        <Button label="Fire error" variant="destructive" onPress={() => fire('error')} />
      </View>
      <Animated.View
        style={[
          styles.surface,
          trigger > 0 && feedbackStyle,
          kind === 'success' ? styles.success : styles.error,
        ]}
      >
        <SariText variant="bodyMedium" color="textPrimary">
          {kind === 'success' ? '✓ Saved' : '✕ Action failed'}
        </SariText>
      </Animated.View>
      <SariText variant="caption" color="textMuted">
        Recipe: useOutcomeFeedback — restrained settle; text/icon/color carry
        the meaning, motion only supports (FR-019).
      </SariText>
    </View>
  );
}

const useStatusStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    indicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    indicator: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondary,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.primarySubtle,
      borderColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 11,
      color: theme.colors.textPrimary,
    },
    unconfirmed: {
      padding: theme.spacing.sm,
      borderRadius: theme.radii.medium,
      backgroundColor: theme.colors.background,
    },
  });

const useOutcomeStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    surface: {
      padding: theme.spacing.md,
      borderRadius: theme.radii.large,
      alignItems: 'center',
    },
    success: {
      backgroundColor: theme.colors.successSubtle,
    },
    error: {
      backgroundColor: theme.colors.errorSubtle,
    },
  });

// ── Gallery root ────────────────────────────────────────────────────────────

export default function MotionGallery() {
  const { theme } = useTheme();
  const styles = useGalleryStyles(theme);
  const reducedMotion = useReducedMotion();

  if (!__DEV__) {
    // Dev-only surface: never render in production builds.
    return null;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SariText variant="headingMedium" color="textPrimary">
        Motion gallery (dev only)
      </SariText>
      <View style={styles.readouts}>
        <SariText variant="label" color="textSecondary">
          Reduced motion (OS, live): {reducedMotion ? 'ON — calm equivalents' : 'OFF'}
        </SariText>
        <SariText variant="label" color="textSecondary">
          RTL (I18nManager.isRTL): {I18nManager.isRTL ? 'true' : 'false'}
        </SariText>
        <SariText variant="caption" color="textMuted">
          No override control exists — the OS accessibility setting is the only
          source (FR-021). Toggle it in device settings and watch recipes
          settle live.
        </SariText>
      </View>

      <Section title="US1 · Button press" caption="Six variants + disabled + loading — identical press everywhere.">
        <ButtonWall />
      </Section>

      <Section title="US2 · List entrance" caption="Short + 1000-item FlashList + non-opted baseline.">
        <ListEntranceSection />
      </Section>

      <Section title="US3 · Screen transitions" caption="Router presets × LTR/RTL + dialog recipe.">
        <View style={styles.transitions}>
          <Button label="Push fade" variant="outlined" onPress={() => router.push('/(dev)/demo-fade')} />
          <Button label="Push horizontal (RTL-mirrored)" variant="outlined" onPress={() => router.push('/(dev)/demo-horizontal')} />
          <Button label="Push vertical" variant="outlined" onPress={() => router.push('/(dev)/demo-vertical')} />
          <Button label="Push sheet/modal-like" variant="outlined" onPress={() => router.push('/(dev)/demo-modal')} />
        </View>
        <DialogDemo />
      </Section>

      <Section title="US4 · Commerce micro-interactions" caption="Favorite pop · add-to-cart pulse · quantity ticks + haptic allow-list.">
        <FavoriteDemo label="Favorite store" />
        <FavoriteDemo label="Favorite product" />
        <AddToCartDemo />
        <SariText variant="bodySmall" color="textSecondary">
          Quantity (integrated QuantitySelector):
        </SariText>
        <QuantityDemo />
        <TouchableOpacity
          style={styles.hapticProbe}
          onPress={() => hapticPairings.importantConfirmation()}
        >
          <SariText variant="caption" color="textMuted">
            Probe haptic: importantConfirmation → Medium (allow-list; silent
            under reduced motion). `orderPlaced` → Success also available.
          </SariText>
        </TouchableOpacity>
      </Section>

      <Section title="US5 · Bottom sheet" caption="Shared open/close/snap spring; gorhom owns drag physics.">
        <SheetDemo />
      </Section>

      <Section title="US6 · Skeletons + loading states" caption="Six shapes, one pulse; opt-in phase transitions.">
        <SkeletonsSection />
      </Section>

      <Section title="US7 · Order status + outcomes" caption="Confirmed states only; motion never implies.">
        <StatusDemo />
        <OutcomeDemo />
      </Section>

      <Section title="Deliverables map" caption="18 deliverables (SC-009) — where each lives.">
        <SariText variant="bodySmall" color="textSecondary">
          {[
            'presets (presets.ts)',
            'buttonPress / cardPress (recipes)',
            'listEntrance (recipe + useEntranceAnimation)',
            'screenTransitions (transitions/screen.ts)',
            'favoriteToggle / addToCartFeedback / quantityTick (recipes)',
            'bottomSheetAnimationConfigs (config)',
            'modalMotion (recipe)',
            'SkeletonShapes ×6 + useSkeletonAnimation',
            'loadingTransition (recipe)',
            'orderStatusTransition (recipe)',
            'outcomeFeedback (recipe)',
            'hapticPairings (config)',
            'reducedMotion mode (useReducedMotion — live OS)',
          ].map((d) => `• ${d}`).join('\n')}
        </SariText>
      </Section>
    </ScrollView>
  );
}

const useGalleryStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    readouts: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radii.large,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    transitions: {
      gap: theme.spacing.sm,
    },
    hapticProbe: {
      padding: theme.spacing.sm,
      borderRadius: theme.radii.medium,
      backgroundColor: theme.colors.background,
    },
  });
