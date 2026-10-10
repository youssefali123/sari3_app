import React from 'react';
import {
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const APP_ICON = require('../../../../assets/images/icon-2.png');

export interface AppLogoProps {
  /** Size (width & height) in pixels. Default is 48. */
  size?: number;
  /** Whether to clip into a soft squircle shape. Default is true. */
  rounded?: boolean;
  /** Optional custom border radius. Defaults to size * 0.22 */
  borderRadius?: number;
  /** Whether to show a subtle brand elevation shadow. Default is true. */
  withShadow?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Optional image style */
  imageStyle?: StyleProp<ImageStyle>;
  /** Test ID for automated testing */
  testID?: string;
}

/**
 * Standard Brand App Logo component for Sari3:
 * - Renders the official app icon (icon-2.png) consistently across all screens
 * - Supports custom sizing, smooth squircling, and brand elevation
 */
export function AppLogo({
  size = 48,
  rounded = true,
  borderRadius,
  withShadow = false,
  style,
  imageStyle,
  testID = 'sari3-app-logo',
}: AppLogoProps) {
  const radius = borderRadius ?? (rounded ? Math.round(size * 0.22) : 0);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        withShadow && styles.shadow,
        style,
      ]}
      testID={testID}
    >
      <Image
        source={APP_ICON}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    overflow: 'hidden',
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#FAC402',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(250, 196, 2, 0.35)',
      },
    }),
  },
});
