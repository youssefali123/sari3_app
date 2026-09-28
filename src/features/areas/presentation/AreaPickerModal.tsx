import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Area } from '../domain/entities/Area';
import { Button } from '@/shared/ui/components/Button';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface AreaPickerModalProps {
  visible: boolean;
  areas: Area[];
  isLoading: boolean;
  selectedAreaId: string | null;
  onSelect: (area: { id: string; name: string }) => void;
  onClose: () => void;
}

/**
 * Two-step drill-down area selector (feature 006 US1, FR-012):
 * Step 1 lists top-level areas (governorates/cities). Tapping a parent that
 * has children offers "[Parent] only" plus its child list; leaf areas
 * select directly. Selection is an exact area id — no rollups (FR-013).
 */
export function AreaPickerModal({
  visible,
  areas,
  isLoading,
  selectedAreaId,
  onSelect,
  onClose,
}: AreaPickerModalProps) {
  const [drilledParent, setDrilledParent] = useState<Area | null>(null);

  const topLevelAreas = useMemo(
    () => areas.filter((a) => a.parentAreaId === null),
    [areas],
  );
  const childrenOf = (parentId: string): Area[] =>
    areas.filter((a) => a.parentAreaId === parentId);

  const close = () => {
    setDrilledParent(null);
    onClose();
  };

  const select = (area: Area) => {
    setDrilledParent(null);
    onSelect({ id: area.id, name: area.name });
  };

  const rows: { key: string; label: string; onPress: () => void; highlighted: boolean }[] =
    drilledParent
      ? [
          {
            key: `${drilledParent.id}-only`,
            label: `${drilledParent.name} only`,
            onPress: () => select(drilledParent),
            highlighted: selectedAreaId === drilledParent.id,
          },
          ...childrenOf(drilledParent.id).map((child) => ({
            key: child.id,
            label: child.name,
            onPress: () => select(child),
            highlighted: selectedAreaId === child.id,
          })),
        ]
      : topLevelAreas.map((area) => ({
          key: area.id,
          label: area.name,
          onPress: () => {
            if (childrenOf(area.id).length > 0) {
              setDrilledParent(area);
            } else {
              select(area);
            }
          },
          highlighted: selectedAreaId === area.id,
        }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            {drilledParent ? (
              <TouchableOpacity onPress={() => setDrilledParent(null)} hitSlop={8}>
                <Text style={styles.backLink}>‹ Back</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.headerLabel}>Choose area</Text>
            )}
            <Text style={styles.title}>
              {drilledParent ? drilledParent.name : 'Select your area'}
            </Text>
          </View>

          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <ScrollView style={styles.list} nestedScrollEnabled>
              {rows.map((row) => (
                <TouchableOpacity
                  key={row.key}
                  style={[styles.row, row.highlighted && styles.rowHighlighted]}
                  onPress={row.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rowLabel, row.highlighted && styles.rowLabelHighlighted]}>
                    {row.label}
                  </Text>
                  <Text style={styles.rowChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Button title="Close" variant="outline" onPress={close} style={styles.closeButton} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  header: {
    marginBottom: spacing.md,
  },
  headerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  backLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowHighlighted: {
    backgroundColor: colors.primaryLight,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowLabelHighlighted: {
    color: colors.primary,
    fontWeight: '700',
  },
  rowChevron: {
    ...typography.body,
    color: colors.textMuted,
  },
  closeButton: {
    marginTop: spacing.md,
  },
});
