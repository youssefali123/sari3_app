import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';

interface SearchEmptyStateProps {
  query: string;
  areaName: string | null;
  onSelectSuggestion?: (suggestion: string) => void;
}

const SUGGESTIONS = [
  { label: 'بيتزا', emoji: '🍕' },
  { label: 'برجر', emoji: '🍔' },
  { label: 'شاورما', emoji: '🌯' },
  { label: 'كريب', emoji: '🥞' },
  { label: 'مشويات', emoji: '🥩' },
  { label: 'حلويات', emoji: '🍰' },
  { label: 'عصائر', emoji: '🧃' },
  { label: 'سوبرماركت', emoji: '🛒' },
];

/**
 * Modern Arabic zero-search-match state matching Sari3 design system:
 * RTL alignment, friendly Lucide illustration icon, and interactive suggestion chips.
 */
export function SearchEmptyState({
  query,
  areaName,
  onSelectSuggestion,
}: SearchEmptyStateProps) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Icon Circle */}
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Icon name="SearchX" size={36} color={colors.mutedForeground} />
      </View>

      {/* Main Title */}
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontFamily: theme.typography.headingMedium.fontFamily },
        ]}
      >
        لم نجد نتائج مطابقة
      </Text>

      {/* Descriptive Message */}
      <Text
        style={[
          styles.message,
          { color: colors.mutedForeground, fontFamily: theme.typography.bodyMedium.fontFamily },
        ]}
      >
        لا توجد متاجر أو منتجات تطابق &quot;{query}&quot;
        {areaName ? ` في نطاق ${areaName}` : ''}.
        {'\n'}جرّب كتابة كلمة مختلفة أو تصفح المقترحات الشائعة:
      </Text>

      {/* Interactive Suggestion Chips */}
      {onSelectSuggestion ? (
        <View style={styles.suggestionsContainer}>
          <Text
            style={[
              styles.suggestionsTitle,
              { color: colors.foreground, fontFamily: theme.typography.label.fontFamily },
            ]}
          >
            عمليات بحث شائعة:
          </Text>
          <View style={styles.chipRow}>
            {SUGGESTIONS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => onSelectSuggestion(item.label)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`البحث عن ${item.label}`}
              >
                <Text style={styles.chipEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: colors.foreground,
                      fontFamily: theme.typography.bodySmall.fontFamily,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

