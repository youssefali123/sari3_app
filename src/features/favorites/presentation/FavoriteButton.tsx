import React, { useCallback } from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FavoritesRepository } from '../domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '../infrastructure/SupabaseFavoritesRepository';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Heart } from 'lucide-react-native';
import { useFavoriteToggleAnimation } from '@/shared/ui/motion';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();

type FavoriteKind = 'store' | 'product';

const DEFAULT_ACTIVE_COLOR = '#EF4444';

interface FavoriteButtonProps {
  kind: FavoriteKind;
  targetId: string;
  /**
   * White-on-frosted-glass circular style for hearts sitting on top of imagery (feature 010
   * home rollout). The pop animation and haptic pairing come from the
   * shared `useFavoriteToggleAnimation` recipe (FR-010) in both variants.
   */
  overlay?: boolean;
  /** Custom icon size override. */
  size?: number;
  /** Override for the active heart color (defaults to #EF4444). */
  activeColor?: string;
  /** Optional custom container style override. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Heart icon toggle for favoriting/unfavoriting a store or product.
 * Store and product favorites operate fully independently (FR-008–FR-010).
 * Uses fine-grained `select` selector to isolate re-renders strictly to the
 * button whose boolean status changes, plus optimistic cache updates.
 */
export const FavoriteButton = React.memo(function FavoriteButton({
  kind,
  targetId,
  overlay = false,
  size,
  activeColor,
  style,
}: FavoriteButtonProps) {
  const customerId = useCurrentCustomerId();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme } = useTheme();

  const heartColor = activeColor ?? DEFAULT_ACTIVE_COLOR;
  const listKey = kind === 'store' ? 'favoriteStoreIds' : 'favoriteProductIds';
  const queryKey = [listKey, customerId];

  const selectIsFavorite = useCallback(
    (ids: string[]) => ids.includes(targetId),
    [targetId],
  );

  const { data: isFavorite = false } = useQuery({
    queryKey,
    queryFn: async () => {
      if (kind === 'store') {
        const stores = await favoritesRepository.getFavoriteStores(customerId!);
        return stores.map((s) => s.id);
      }
      const products = await favoritesRepository.getFavoriteProducts(customerId!);
      return products.map((p) => p.id);
    },
    select: selectIsFavorite,
    enabled: Boolean(customerId),
    staleTime: 300_000,
    gcTime: 600_000,
  });

  const mutation = useMutation({
    mutationFn: async (nextIsFavorite: boolean) => {
      if (!customerId) throw new Error('Sign in to save favorites');
      if (kind === 'store') {
        if (nextIsFavorite) {
          await favoritesRepository.addFavoriteStore(customerId, targetId);
        } else {
          await favoritesRepository.removeFavoriteStore(customerId, targetId);
        }
      } else if (nextIsFavorite) {
        await favoritesRepository.addFavoriteProduct(customerId, targetId);
      } else {
        await favoritesRepository.removeFavoriteProduct(customerId, targetId);
      }
    },
    onMutate: async (nextIsFavorite: boolean) => {
      await queryClient.cancelQueries({ queryKey });
      const previousIds = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (old = []) => {
        if (nextIsFavorite) {
          return old.includes(targetId) ? old : [...old, targetId];
        }
        return old.filter((id) => id !== targetId);
      });
      return { previousIds };
    },
    onError: (_err, _next, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(queryKey, context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
    },
  });

  const isUserToggled = React.useRef(false);

  const { iconStyle } = useFavoriteToggleAnimation(isFavorite, {
    haptic: false,
    enabled: isUserToggled.current,
  });

  const iconSize = size ?? (overlay ? 16 : 19);
  const iconColor = isFavorite
    ? heartColor
    : (overlay ? '#FFFFFF' : theme.colors.textMuted);
  const fillColor = isFavorite ? heartColor : 'none';
  const strokeWidth = isFavorite ? 1.8 : (overlay ? 2.2 : 2);

  return (
    <TouchableOpacity
      style={[
        overlay ? styles.buttonOverlay : styles.button,
        !overlay && isFavorite && styles.buttonFavorited,
        style,
      ]}
      onPress={(event) => {
        event.stopPropagation();
        // Guests are redirected to auth instead of silently failing (FR-003).
        if (!customerId) {
          router.push({
            pathname: '/(auth)/login',
            params: { returnTo: '/(customer)/favorites/stores' },
          });
          return;
        }
        isUserToggled.current = true;
        mutation.mutate(!isFavorite);
      }}
      hitSlop={6}
      activeOpacity={0.75}
      delayPressIn={0}
      disabled={mutation.isPending}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
      accessibilityState={{ selected: isFavorite }}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Heart
          size={iconSize}
          color={iconColor}
          fill={fillColor}
          strokeWidth={strokeWidth}
        />
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFavorited: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  buttonOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2.5,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
