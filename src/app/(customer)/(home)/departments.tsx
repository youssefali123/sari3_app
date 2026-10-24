import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '@/shared/ui/theme';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { AppScreen, BrandHeader } from '@/shared/ui/components/AppUI';
import { SearchBar } from '@/features/search/presentation/SearchBar';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { SkeletonShape } from '@/shared/ui/motion';
import { useDepartments } from '@/features/departments/application/hooks/useDepartments';
import { DepartmentTile } from '@/features/departments/presentation/components/DepartmentTile';
import { Department } from '@/features/departments/domain/entities/Department';

const GRID_GAP = 10;

export default function DepartmentsScreen() {
  const colors = useColors();
  const router = useAppRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { departments, isLoading } = useDepartments();

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(query));
  }, [departments, searchQuery]);

  // Split filtered departments into fixed 3-column rows to avoid any wrapping glitches
  const rows = useMemo(() => {
    const result: Department[][] = [];
    for (let i = 0; i < filteredDepartments.length; i += 3) {
      result.push(filteredDepartments.slice(i, i + 3));
    }
    return result;
  }, [filteredDepartments]);

  const handleSelectDepartment = (dept: Department) => {
    router.push({
      pathname: '/(customer)/(home)/browse',
      params: {
        departmentId: dept.id,
        departmentName: dept.name,
      },
    } as any);
  };

  return (
    <AppScreen>
      <BrandHeader
        title="جميع الأقسام"
        subtitle={`${departments.length} أقسام متاحة`}
        onBack={() => router.back()}
      />

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="ابحث عن قسم..."
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.gridContainer}>
            {[0, 1, 2].map((rowIndex) => (
              <View key={`dept-skel-row-${rowIndex}`} style={styles.gridRow}>
                {[0, 1, 2].map((colIndex) => (
                  <View
                    key={`dept-skel-${rowIndex}-${colIndex}`}
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
        ) : filteredDepartments.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="لا توجد أقسام مطابقة"
            message={`لم نجد أي قسم يطابق "${searchQuery}". جرّب كلمة بحث أخرى.`}
          />
        ) : (
          <View style={styles.gridContainer}>
            {rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {row.map((dept) => (
                  <DepartmentTile
                    key={dept.id}
                    department={dept}
                    onPress={() => handleSelectDepartment(dept)}
                  />
                ))}
                {Array.from({ length: 3 - row.length }).map((_, i) => (
                  <View key={`spacer-${rowIndex}-${i}`} style={styles.spacerTile} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
