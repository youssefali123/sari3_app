/**
 * Barrel export for all shared UI components (feature 009 T045).
 * Import from here: `import { Button, Card, Text } from '@/shared/ui/components'`.
 */
export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { Card } from './Card';
export { SariText as Text } from './Text';
export { Input } from './Input';
export { Icon, RTL_DIRECTIONAL_ICONS } from './Icon';
export { IconButton } from './IconButton';
export { Badge } from './Badge';
export type { BadgeVariant } from './Badge';
export { Chip } from './Chip';
export { Divider } from './Divider';
export { Avatar } from './Avatar';
export { SearchBar } from './SearchBar';
export { QuantitySelector } from './QuantitySelector';
export { SectionHeader } from './SectionHeader';
export { LoadingState } from './LoadingState';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { Sari3BottomSheet } from './Sari3BottomSheet';
export { ConfirmDialog } from './ConfirmDialog';
export { AuthRequiredModal, AuthRequiredView } from './AuthRequiredModal';

// Feature 011 design-identity components (shared across Phase 3 screens)
export { AppHeader } from './AppHeader';
export { HeroHeader } from './HeroHeader';
export { StickyBar } from './StickyBar';
export { RatingPill } from './RatingPill';
export { OptionRow } from './OptionRow';

export { TabBarButton } from './TabBarButton';
export type { TabBarButtonProps } from './TabBarButton';

// AppUI primitives (SOURCE project parity)
export {
  AppScreen,
  PageScroll,
  BrandHeader,
  SectionTitle,
  PrimaryButton,
  Surface,
  ProfileRow,
} from './AppUI';

// Legacy aliases (deprecated — kept for existing call sites)
export { LoadingSpinner } from './LoadingSpinner';
export { ErrorView } from './ErrorView';
