import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { SkeletonShape } from '@/shared/ui/motion';
import { Department } from '../../domain/entities/Department';
import { useDepartments } from '../../application/hooks/useDepartments';
import { DepartmentTile } from './DepartmentTile';

export interface HomeDepartmentsGridProps {
  onSelectDepartment?: (department: Department) => void;
  onViewAllPress?: () => void;
}

const GRID_GAP = 10;

export function HomeDepartmentsGrid({
  onSelectDepartment,
  onViewAllPress,
}: HomeDepartmentsGridProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const router = useAppRouter();
  const { topDepartments, isLoading, isError } = useDepartments();

  // Split departments into fixed 3-column rows to guarantee exact alignment without wrapping glitches
  const rows = useMemo(() => {
    const result: Department[][] = [];
    for (let i = 0; i < topDepartments.length; i += 3) {
      result.push(topDepartments.slice(i, i + 3));
    }
    return result;
  }, [topDepartments]);

  const handleDepartmentPress = (department: Department) => {
    if (onSelectDepartment) {
      onSelectDepartment(department);
      return;
    }
    router.push({
      pathname: '/(customer)/(home)/browse',
      params: {
        departmentId: department.id,
        departmentName: department.name,
      },
    } as any);
  };

  const handleViewAllPress = () => {
    if (onViewAllPress) {
      onViewAllPress();
      return;
    }
    router.push('/(customer)/(home)/departments' as any);
  };

  // ── SKELETON LOADING STATE ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall?.fontFamily,
              },
            ]}
          >
            اطلب دلوقتي
          </Text>
        </View>

        <View style={styles.gridContainer}>
          {[0, 1].map((rowIndex) => (
            <View key={`skel-row-${rowIndex}`} style={styles.gridRow}>
              {[0, 1, 2].map((colIndex) => (
                <View
                  key={`dept-skeleton-${rowIndex}-${colIndex}`}
                  style={[
                    styles.skeletonTile,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <SkeletonShape
                    style={[
                      styles.skeletonImage,
                      { backgroundColor: colors.muted ?? '#f3f4f6' },
                    ]}
                  />
                  <SkeletonShape
                    style={[
                      styles.skeletonText,
                      { backgroundColor: colors.muted ?? '#f3f4f6' },
                    ]}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Gracefully hide section if no active departments or error occurred (spec FR-010)
  if (isError || topDepartments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.foreground,
              fontFamily: theme.typography.headingSmall?.fontFamily,
            },
          ]}
        >
          اطلب دلوقتي
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="عرض كل الأقسام"
          onPress={handleViewAllPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.viewAllButton,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text
            style={[
              styles.viewAllText,
              {
                color: colors.primary,
                fontFamily:
                  theme.typography.caption?.fontFamily ||
                  theme.typography.label?.fontFamily,
              },
            ]}
          >
            عرض الكل
          </Text>
        </Pressable>
      </View>

      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.map((dept) => (
              <DepartmentTile
                key={dept.id}
                department={dept}
                onPress={() => handleDepartmentPress(dept)}
              />
            ))}
            {/* If a row has fewer than 3 items, pad with invisible spacers so width stays 1/3 */}
            {Array.from({ length: 3 - row.length }).map((_, i) => (
              <View key={`spacer-${rowIndex}-${i}`} style={styles.spacerTile} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  viewAllButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridContainer: {
    gap: GRID_GAP,
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row-reverse',
    gap: GRID_GAP,
    width: '100%',
  },
  spacerTile: {
    flex: 1,
    minWidth: 0,
  },
  skeletonTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1.18,
    borderRadius: 12,
  },
  skeletonText: {
    width: '70%',
    height: 12,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 4,
  },
});
