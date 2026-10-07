import React from 'react';
import { Image, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AvatarProps {
  size?: 'small' | 'medium' | 'large';
  /** Remote image URL — when provided the image renders instead of initials. */
  source?: { uri: string };
  /** Fallback initials (e.g. "YA") shown when no image is available. */
  initials?: string;
  accessibilityLabel?: string;
}

const SIZES = { small: 32, medium: 44, large: 64 } as const;

/**
 * Themed avatar (feature 009 US4, contracts §9). Shows the image when a
 * source is provided; falls back to initials on the primarySubtle background.
 */
export function Avatar({ size = 'medium', source, initials, accessibilityLabel }: AvatarProps) {
  const { theme } = useTheme();
  const dimension = SIZES[size];

  const containerStyle = {
    width: dimension,
    height: dimension,
    borderRadius: theme.radii.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    backgroundColor: source ? 'transparent' : theme.colors.primarySubtle,
  };

  const imageStyle = { width: dimension, height: dimension };
  const initialsStyle = {
    ...theme.typography.button,
    fontSize: Math.round(dimension * 0.36),
    color: theme.colors.primary,
    textAlign: 'center' as const,
  };

  return (
    <View
      style={containerStyle}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? initials}
    >
      {source ? (
        <Image source={source} style={imageStyle} resizeMode="cover" />
      ) : (
        <Text style={initialsStyle}>{initials ?? '?'}</Text>
      )}
    </View>
  );
}
