import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Area } from '../domain/entities/Area';
import { Icon } from '@/shared/ui/components/Icon';
import { useColors, useTheme } from '@/shared/ui/theme';
import {
  SkeletonCard,
  fireHaptic,
  useReducedMotion,
  useSmoothKeyboardElevation,
} from '@/shared/ui/motion';

export interface AreaPickerModalProps {
  visible: boolean;
  areas: Area[];
  isLoading: boolean;
  selectedAreaId: string | null;
  onSelect: (area: { id: string; name: string }) => void;
  onClose: () => void;
}

/**
 * Modern, brand-aligned two-step drill-down area picker bottom sheet for Sari3:
 * - Step 1: Lists top-level governorates/cities with badge indicators for sub-districts.
 * - Step 2: Lists sub-districts with option to select the entire governorate.
 * - Interactive instant search to quickly locate any area or district.
 * - Tactile brand gold accents, Tajawal typography, and smooth bottom sheet entrance.
 */
export function AreaPickerModal({
  visible,
  areas,
  isLoading,
  selectedAreaId,
  onSelect,
  onClose,
}: AreaPickerModalProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const animatedKeyboardStyle = useSmoothKeyboardElevation();

  const [drilledParent, setDrilledParent] = useState<Area | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Parent area mapping for fast parent name resolution in search results
  const areaById = useMemo(() => {
    const map = new Map<string, Area>();
    for (const a of areas) {
      map.set(a.id, a);
    }
    return map;
  }, [areas]);

  const topLevelAreas = useMemo(
    () => areas.filter((a) => a.parentAreaId === null),
    [areas],
  );

  const childrenOf = (parentId: string): Area[] =>
    areas.filter((a) => a.parentAreaId === parentId);

  const handleClose = () => {
    Keyboard.dismiss();
    setDrilledParent(null);
    setSearchQuery('');
    onClose();
  };

  const handleSelect = (area: Area) => {
    fireHaptic('importantConfirmation', reducedMotion);
    Keyboard.dismiss();
    setDrilledParent(null);
    setSearchQuery('');
    onSelect({ id: area.id, name: area.name });
  };

  const handleDrillIntoParent = (parent: Area) => {
    setDrilledParent(parent);
    setSearchQuery('');
  };

  const handleBackToTopLevel = () => {
    setDrilledParent(null);
    setSearchQuery('');
  };

  // Determine what items to display based on drill state & search query
  const trimmedSearch = searchQuery.trim().toLowerCase();

  // If search query is active at the root level, search through all areas
  const isSearchingGlobal = !drilledParent && trimmedSearch.length > 0;
  const globalSearchResults = useMemo(() => {
    if (!isSearchingGlobal) return [];
    return areas.filter((a) => a.name.toLowerCase().includes(trimmedSearch));
  }, [isSearchingGlobal, areas, trimmedSearch]);

  // Current drill-down child items (filtered by search if search is active in drill-down)
  const drilledChildren = useMemo(() => {
    if (!drilledParent) return [];
    const children = childrenOf(drilledParent.id);
    if (!trimmedSearch) return children;
    return children.filter((c) => c.name.toLowerCase().includes(trimmedSearch));
  }, [drilledParent, areas, trimmedSearch]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {/* Scrim tap-to-dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="none"
          accessibilityLabel="إغلاق"
        />

        {/* Bottom Sheet Container */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            animatedKeyboardStyle,
          ]}
        >
          {/* Sheet Handle */}
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.mutedForeground, opacity: 0.25 },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              {drilledParent ? (
                <TouchableOpacity
                  onPress={handleBackToTopLevel}
                  hitSlop={8}
                  style={[
                    styles.backBadge,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="العودة لجميع المناطق"
                >
                  <Icon name="ArrowRight" size={16} color={colors.foreground} />
                  <Text
                    style={[
                      styles.backBadgeText,
                      {
                        color: colors.foreground,
                        fontFamily: theme.typography.button.fontFamily,
                      },
                    ]}
                  >
                    كل المحافظات
                  </Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.headerIconBadge,
                    {
                      backgroundColor: colors.primarySubtle,
                      borderColor: 'rgba(245, 189, 22, 0.3)',
                    },
                  ]}
                >
                  <Icon name="MapPin" size={20} color={colors.primaryPressed} />
                </View>
              )}

              <View style={styles.headerTextCol}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: colors.foreground,
                      fontFamily: theme.typography.headingSmall.fontFamily,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {drilledParent ? drilledParent.name : 'اختر منطقة التوصيل'}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: colors.mutedForeground,
                      fontFamily: theme.typography.caption.fontFamily,
                    },
                  ]}
                >
                  {drilledParent
                    ? 'اختر الحي التابع أو حدد كامل المنطقة'
                    : 'حدد منطقتك لتصفح المتاجر والمطاعم المتاحة حولك'}
                </Text>
              </View>
            </View>

            {/* Close button */}
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={8}
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
            >
              <Icon name="X" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBarWrap,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name="Search" size={18} color={colors.mutedForeground} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                drilledParent
                  ? `ابحث في أحياء ${drilledParent.name}...`
                  : 'ابحث عن منطقتك أو محافظتك...'
              }
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.searchInput,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.bodyMedium.fontFamily,
                },
              ]}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={styles.searchClearBtn}
              >
                <Icon name="X" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List Content */}
          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <SkeletonCard style={styles.skeletonCard} />
              <SkeletonCard style={styles.skeletonCard} />
              <SkeletonCard style={styles.skeletonCard} />
              <SkeletonCard style={styles.skeletonCard} />
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {/* GLOBAL SEARCH RESULTS MODE */}
              {isSearchingGlobal ? (
                globalSearchResults.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Icon name="MapPin" size={36} color={colors.mutedForeground} />
                    <Text
                      style={[
                        styles.emptyTitle,
                        {
                          color: colors.foreground,
                          fontFamily: theme.typography.headingSmall.fontFamily,
                        },
                      ]}
                    >
                      لا توجد مناطق مطابقة
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        {
                          color: colors.mutedForeground,
                          fontFamily: theme.typography.caption.fontFamily,
                        },
                      ]}
                    >
                      تأكد من كتابة اسم المنطقة أو المدينة بشكل صحيح
                    </Text>
                  </View>
                ) : (
                  globalSearchResults.map((area) => {
                    const isSelected = selectedAreaId === area.id;
                    const parent = area.parentAreaId ? areaById.get(area.parentAreaId) : null;

                    return (
                      <TouchableOpacity
                        key={area.id}
                        style={[
                          styles.areaCard,
                          {
                            backgroundColor: isSelected ? colors.primarySubtle : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => handleSelect(area)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.cardRight}>
                          <View
                            style={[
                              styles.areaIconBadge,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.muted,
                              },
                            ]}
                          >
                            <Icon
                              name="MapPin"
                              size={18}
                              color={isSelected ? '#1A1D20' : colors.mutedForeground}
                            />
                          </View>
                          <View style={styles.areaInfoCol}>
                            <Text
                              style={[
                                styles.areaName,
                                {
                                  color: colors.foreground,
                                  fontFamily: theme.typography.bodyLarge.fontFamily,
                                  fontWeight: isSelected ? '700' : '600',
                                },
                              ]}
                            >
                              {area.name}
                            </Text>
                            {parent ? (
                              <Text
                                style={[
                                  styles.areaSubtext,
                                  {
                                    color: colors.mutedForeground,
                                    fontFamily: theme.typography.caption.fontFamily,
                                  },
                                ]}
                              >
                                تابعة لـ {parent.name}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {isSelected ? (
                          <View
                            style={[
                              styles.checkBadge,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Icon name="Check" size={14} color="#1A1D20" strokeWidth={3} />
                          </View>
                        ) : (
                          <Icon name="ChevronLeft" size={18} color={colors.mutedForeground} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )
              ) : drilledParent ? (
                /* DRILLED DOWN MODE (Governorate + Sub-districts) */
                <>
                  {/* Option A: Select whole parent area */}
                  {!trimmedSearch ? (
                    <TouchableOpacity
                      style={[
                        styles.featuredParentCard,
                        {
                          backgroundColor:
                            selectedAreaId === drilledParent.id
                              ? colors.primarySubtle
                              : colors.background,
                          borderColor:
                            selectedAreaId === drilledParent.id ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => handleSelect(drilledParent)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardRight}>
                        <View
                          style={[
                            styles.areaIconBadge,
                            {
                              backgroundColor:
                                selectedAreaId === drilledParent.id
                                  ? colors.primary
                                  : colors.primarySubtle,
                            },
                          ]}
                        >
                          <Icon
                            name="Map"
                            size={18}
                            color={
                              selectedAreaId === drilledParent.id ? '#1A1D20' : colors.primaryPressed
                            }
                          />
                        </View>
                        <View style={styles.areaInfoCol}>
                          <View style={styles.rowInline}>
                            <Text
                              style={[
                                styles.areaName,
                                {
                                  color: colors.foreground,
                                  fontFamily: theme.typography.bodyLarge.fontFamily,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              كل {drilledParent.name}
                            </Text>
                            <View
                              style={[
                                styles.allBadge,
                                { backgroundColor: colors.primarySubtle },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.allBadgeText,
                                  {
                                    color: colors.primaryPressed,
                                    fontFamily: theme.typography.caption.fontFamily,
                                  },
                                ]}
                              >
                                كامل المنطقة
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.areaSubtext,
                              {
                                color: colors.mutedForeground,
                                fontFamily: theme.typography.caption.fontFamily,
                              },
                            ]}
                          >
                            عرض جميع المتاجر المتوفرة في نطاق {drilledParent.name}
                          </Text>
                        </View>
                      </View>

                      {selectedAreaId === drilledParent.id ? (
                        <View
                          style={[
                            styles.checkBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Icon name="Check" size={14} color="#1A1D20" strokeWidth={3} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: colors.border },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {/* Section divider label */}
                  {drilledChildren.length > 0 ? (
                    <Text
                      style={[
                        styles.sectionHeaderLabel,
                        {
                          color: colors.mutedForeground,
                          fontFamily: theme.typography.caption.fontFamily,
                        },
                      ]}
                    >
                      الأحياء والمناطق التابعة
                    </Text>
                  ) : null}

                  {drilledChildren.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Icon name="MapPin" size={32} color={colors.mutedForeground} />
                      <Text
                        style={[
                          styles.emptySubtitle,
                          {
                            color: colors.mutedForeground,
                            fontFamily: theme.typography.caption.fontFamily,
                          },
                        ]}
                      >
                        لا توجد أحياء مطابقة لبحثك
                      </Text>
                    </View>
                  ) : (
                    drilledChildren.map((child) => {
                      const isSelected = selectedAreaId === child.id;

                      return (
                        <TouchableOpacity
                          key={child.id}
                          style={[
                            styles.areaCard,
                            {
                              backgroundColor: isSelected
                                ? colors.primarySubtle
                                : colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => handleSelect(child)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.cardRight}>
                            <View
                              style={[
                                styles.areaIconBadge,
                                {
                                  backgroundColor: isSelected ? colors.primary : colors.muted,
                                },
                              ]}
                            >
                              <Icon
                                name="MapPin"
                                size={18}
                                color={isSelected ? '#1A1D20' : colors.mutedForeground}
                              />
                            </View>
                            <Text
                              style={[
                                styles.areaName,
                                {
                                  color: colors.foreground,
                                  fontFamily: theme.typography.bodyLarge.fontFamily,
                                  fontWeight: isSelected ? '700' : '600',
                                },
                              ]}
                            >
                              {child.name}
                            </Text>
                          </View>

                          {isSelected ? (
                            <View
                              style={[
                                styles.checkBadge,
                                { backgroundColor: colors.primary },
                              ]}
                            >
                              <Icon name="Check" size={14} color="#1A1D20" strokeWidth={3} />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.radioCircle,
                                { borderColor: colors.border },
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              ) : (
                /* STEP 1: TOP LEVEL AREAS */
                topLevelAreas.map((area) => {
                  const children = childrenOf(area.id);
                  const hasChildren = children.length > 0;
                  const isSelected = selectedAreaId === area.id;

                  return (
                    <TouchableOpacity
                      key={area.id}
                      style={[
                        styles.areaCard,
                        {
                          backgroundColor: isSelected ? colors.primarySubtle : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (hasChildren) {
                          handleDrillIntoParent(area);
                        } else {
                          handleSelect(area);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardRight}>
                        <View
                          style={[
                            styles.areaIconBadge,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.muted,
                            },
                          ]}
                        >
                          <Icon
                            name="MapPin"
                            size={18}
                            color={isSelected ? '#1A1D20' : colors.mutedForeground}
                          />
                        </View>
                        <View style={styles.areaInfoCol}>
                          <Text
                            style={[
                              styles.areaName,
                              {
                                color: colors.foreground,
                                fontFamily: theme.typography.bodyLarge.fontFamily,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {area.name}
                          </Text>
                          {hasChildren ? (
                            <Text
                              style={[
                                styles.areaSubtext,
                                {
                                  color: colors.mutedForeground,
                                  fontFamily: theme.typography.caption.fontFamily,
                                },
                              ]}
                            >
                              {children.length} مناطق وأحياء فرعية
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {isSelected ? (
                        <View
                          style={[
                            styles.checkBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Icon name="Check" size={14} color="#1A1D20" strokeWidth={3} />
                        </View>
                      ) : hasChildren ? (
                        <View style={styles.drillActionWrap}>
                          <Text
                            style={[
                              styles.drillActionText,
                              {
                                color: colors.mutedForeground,
                                fontFamily: theme.typography.caption.fontFamily,
                              },
                            ]}
                          >
                            عرض الأحياء
                          </Text>
                          <Icon name="ChevronLeft" size={16} color={colors.mutedForeground} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: colors.border },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  skeletonContainer: {
    gap: 10,
    paddingVertical: 12,
  },
  skeletonCard: {
    height: 64,
    borderRadius: 16,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 8,
    gap: 10,
  },
  featuredParentCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  areaCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  areaIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaInfoCol: {
    flex: 1,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  areaName: {
    fontSize: 15,
    textAlign: 'right',
  },
  areaSubtext: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  allBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  allBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 2,
  },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  drillActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drillActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
