import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

// Helper to map common icon keys to Lucide icon names
function mapIconName(name: string): string {
  switch (name) {
    case 'arrow-forward':
    case 'arrow-left':
      return 'ArrowRight';
    case 'arrow-back':
      return 'ArrowLeft';
    case 'chevron-back':
      return 'ChevronLeft';
    case 'chevron-forward':
      return 'ChevronRight';
    case 'location-outline':
    case 'location':
      return 'MapPin';
    case 'notifications-outline':
    case 'notifications':
      return 'Bell';
    case 'bicycle':
    case 'bicycle-outline':
      return 'Bike';
    case 'basket-outline':
    case 'basket':
      return 'ShoppingBasket';
    case 'restaurant-outline':
    case 'restaurant':
      return 'Utensils';
    case 'fast-food-outline':
      return 'Utensils';
    case 'search-outline':
    case 'search':
      return 'Search';
    case 'pricetag-outline':
    case 'pricetag':
      return 'Tag';
    case 'arrow-back-circle':
      return 'ArrowLeftCircle';
    case 'heart':
    case 'heart-outline':
      return 'Heart';
    case 'star':
      return 'Star';
    case 'bag-add-outline':
    case 'bag-handle-outline':
    case 'bag':
      return 'ShoppingBag';
    case 'trash-outline':
    case 'trash':
      return 'Trash2';
    case 'remove-circle-outline':
      return 'MinusCircle';
    case 'add-circle':
    case 'add':
      return 'PlusCircle';
    case 'checkmark-circle-outline':
    case 'checkmark':
    case 'checkmark-done':
      return 'CheckCircle2';
    case 'close-circle-outline':
    case 'close':
      return 'XCircle';
    case 'refresh':
      return 'RotateCw';
    case 'person-outline':
    case 'person':
      return 'User';
    case 'card-outline':
      return 'CreditCard';
    case 'ticket-outline':
      return 'Ticket';
    case 'help-circle-outline':
      return 'HelpCircle';
    case 'cash-outline':
      return 'Banknote';
    case 'receipt-outline':
      return 'Receipt';
    case 'time-outline':
      return 'Clock';
    default:
      return name;
  }
}

export function AppScreen({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 67 : 0,
        },
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

export function PageScroll({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: object;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.pageContent, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

export function BrandHeader({
  title,
  subtitle,
  onBack,
  trailing,
  leading,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  leading?: ReactNode;
}) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View style={styles.brandHeader}>
      {/* Start side (Right in RTL) */}
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={onBack}
          unstable_pressDelay={0}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerIcon,
            {
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.91 : 1 }],
            },
          ]}
          testID="header-back"
        >
          <Icon name="ArrowRight" size={20} color={colors.foreground} />
        </Pressable>
      ) : leading ? (
        leading
      ) : null}

      {/* Middle Copy */}
      <View style={[styles.headerCopy, !onBack && !leading && { paddingRight: 4 }]}>
        {subtitle ? (
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* End side (Left in RTL) */}
      <View style={styles.headerTrailing}>
        {trailing !== undefined ? (
          trailing
        ) : onBack ? (
          <View style={styles.headerSpacer} />
        ) : (
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Icon name="Bike" size={22} color={colors.primaryForeground} />
          </View>
        )}
      </View>
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View style={styles.sectionTitle}>
      {action ? (
        <Pressable
          onPress={onAction}
          unstable_pressDelay={0}
          hitSlop={6}
          style={({ pressed }) => [pressed && { opacity: 0.65 }]}
          testID={`section-${title}-action`}
        >
          <Text
            style={[
              styles.sectionAction,
              { color: colors.secondaryForeground, fontFamily: theme.typography.label.fontFamily },
            ]}
          >
            {action}
          </Text>
        </Pressable>
      ) : (
        <View />
      )}
      <Text
        style={[
          styles.sectionHeading,
          { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  tone = 'primary',
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  tone?: 'primary' | 'dark' | 'outline' | 'danger';
  testID?: string;
}) {
  const colors = useColors();
  const { theme } = useTheme();

  const background =
    tone === 'primary'
      ? colors.primary
      : tone === 'dark'
        ? colors.foreground
        : tone === 'danger'
          ? colors.destructive
          : colors.card;
  const foreground =
    tone === 'primary'
      ? colors.primaryForeground
      : tone === 'outline'
        ? colors.foreground
        : colors.background;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      unstable_pressDelay={0}
      testID={testID}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: background,
          borderColor: tone === 'outline' ? colors.border : background,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.95 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Icon name={mapIconName(icon)} size={18} color={foreground} /> : null}
          <Text
            style={[
              styles.primaryButtonText,
              { color: foreground, fontFamily: theme.typography.button.fontFamily },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  testID,
}: {
  icon: string;
  onPress: () => void;
  label: string;
  color?: string;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      unstable_pressDelay={0}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.91 : 1 }],
        },
      ]}
    >
      <Icon name={mapIconName(icon)} size={20} color={color ?? colors.foreground} />
    </Pressable>
  );
}

export function EmptyState({
  title,
  message,
  icon = 'receipt-outline',
}: {
  title: string;
  message: string;
  icon?: string;
}) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Icon name={mapIconName(icon)} size={24} color={colors.secondaryForeground} />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.emptyMessage,
          { color: colors.mutedForeground, fontFamily: theme.typography.bodySmall.fontFamily },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export function LoadingState() {
  const colors = useColors();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ProfileRow({
  icon,
  title,
  detail,
  onPress,
  isDestructive = false,
  showChevron = true,
}: {
  icon: string;
  title: string;
  detail?: string;
  onPress?: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      unstable_pressDelay={0}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.profileRow,
        { borderBottomColor: colors.border },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={[styles.profileRowIcon, { backgroundColor: isDestructive ? colors.destructive + '15' : colors.muted }]}>
        <Icon
          name={mapIconName(icon) as any}
          size={19}
          color={isDestructive ? colors.destructive : colors.foreground}
        />
      </View>
      <View style={styles.profileRowCopy}>
        <Text
          style={[
            styles.profileRowTitle,
            { color: isDestructive ? colors.destructive : colors.foreground },
          ]}
        >
          {title}
        </Text>
        {detail ? (
          <Text style={[styles.profileRowDetail, { color: colors.mutedForeground }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {showChevron ? (
        <Icon
          name="ChevronLeft"
          size={18}
          color={colors.mutedForeground}
        />
      ) : null}
    </Pressable>
  );
}



const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 112, gap: 18 },
  brandHeader: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  headerCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', justifyContent: 'center' },
  headerSubtitle: { fontSize: 12, marginBottom: 2, textAlign: 'right' },
  headerTitle: { fontSize: 19, fontWeight: '700', textAlign: 'right' },
  headerTrailing: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeading: { fontSize: 18, fontWeight: '700', textAlign: 'right' },
  sectionAction: { fontSize: 13, fontWeight: '600' },
  primaryButton: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 34,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  surface: { borderWidth: 1, borderRadius: 20, padding: 16 },
  profileRow: {
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  profileRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRowCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  profileRowTitle: { fontSize: 14, fontWeight: '700' },
  profileRowDetail: { fontSize: 12 },
});
