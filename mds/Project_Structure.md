# Project Structure

```
src/
├── app
│   ├── (auth)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (customer)
│   │   ├── (home)
│   │   │   ├── promotion
│   │   │   │   └── [id].tsx
│   │   │   ├── restaurant
│   │   │   │   └── [id].tsx
│   │   │   ├── store
│   │   │   │   └── [id].tsx
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── addresses
│   │   │   └── index.tsx
│   │   ├── checkout
│   │   │   └── index.tsx
│   │   ├── favorites
│   │   │   ├── products.tsx
│   │   │   └── stores.tsx
│   │   ├── orders
│   │   │   ├── _layout.tsx
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── _layout.tsx
│   │   ├── cart.tsx
│   │   └── profile.tsx
│   ├── (driver)
│   │   ├── available-orders
│   │   │   ├── _layout.tsx
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── history
│   │   │   ├── _layout.tsx
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── _layout.tsx
│   │   ├── active-order.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── features
│   ├── addresses
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── SavedDeliveryAddress.ts
│   │   │   └── repositories
│   │   │       └── AddressRepository.ts
│   │   ├── infrastructure
│   │   │   └── SupabaseAddressRepository.ts
│   │   └── presentation
│   │       ├── AddressCard.tsx
│   │       └── AddressSelectionModal.tsx
│   ├── auth
│   │   ├── application
│   │   │   ├── context
│   │   │   │   └── AuthContext.tsx
│   │   │   └── hooks
│   │   │       └── useAuth.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── AuthUser.ts
│   │   │   └── repositories
│   │   │       └── AuthRepository.ts
│   │   ├── infrastructure
│   │   │   └── SupabaseAuthRepository.ts
│   │   └── presentation
│   │       ├── components
│   │       │   ├── authErrorToMessage.ts
│   │       │   ├── LoginForm.tsx
│   │       │   ├── postAuthRouting.ts
│   │       │   ├── ProfileErrorView.tsx
│   │       │   └── RegisterForm.tsx
│   │       └── hooks
│   │           └── useRequireAuth.ts
│   ├── cart
│   │   ├── application
│   │   │   ├── cartSlice.ts
│   │   │   └── useAddToCart.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── CartItem.ts
│   │   │   └── cartUtils.ts
│   │   └── presentation
│   │       ├── CartItemRow.tsx
│   │       └── StoreConflictModal.tsx
│   ├── drivers
│   │   ├── application
│   │   │   └── hooks
│   │   │       ├── useActiveOrder.ts
│   │   │       ├── useAvailableOrders.ts
│   │   │       ├── useDriverAvailability.ts
│   │   │       ├── useDriverHistory.ts
│   │   │       └── useNetworkStatus.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   ├── AvailableOrderPreview.ts
│   │   │   │   ├── DeliveryHistoryEntry.ts
│   │   │   │   ├── DriverOrderInteraction.ts
│   │   │   │   └── DriverProfile.ts
│   │   │   ├── repositories
│   │   │   │   └── DriverFulfillmentRepository.ts
│   │   │   └── services
│   │   │       ├── DriverRealtimeService.ts
│   │   │       └── NetworkStatusService.ts
│   │   ├── infrastructure
│   │   │   ├── ExpoNetworkStatusService.ts
│   │   │   ├── SupabaseDriverFulfillmentRepository.ts
│   │   │   └── SupabaseDriverRealtimeService.ts
│   │   └── presentation
│   │       └── components
│   │           ├── ActiveOrderCard.tsx
│   │           ├── AvailabilityToggle.tsx
│   │           ├── AvailableOrderCard.tsx
│   │           ├── DeliveryHistoryCard.tsx
│   │           ├── OfflineNoticeBanner.tsx
│   │           └── OrderReleaseModal.tsx
│   ├── favorites
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Favorite.ts
│   │   │   └── repositories
│   │   │       └── FavoritesRepository.ts
│   │   ├── infrastructure
│   │   │   └── SupabaseFavoritesRepository.ts
│   │   └── presentation
│   │       └── FavoriteButton.tsx
│   ├── notifications
│   │   ├── application
│   │   │   └── hooks
│   │   │       ├── useNotificationPermission.ts
│   │   │       └── useNotificationSetup.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   ├── DevicePushRegistration.ts
│   │   │   │   └── NotificationEventType.ts
│   │   │   └── services
│   │   │       └── NotificationService.ts
│   │   └── infrastructure
│   │       └── ExpoNotificationService.ts
│   ├── orders
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   ├── Order.ts
│   │   │   │   ├── OrderDriverInfo.ts
│   │   │   │   └── OrderStatus.ts
│   │   │   ├── repositories
│   │   │   │   └── OrderRepository.ts
│   │   │   └── services
│   │   │       ├── DriverInfoService.ts
│   │   │       └── OrderRealtimeService.ts
│   │   ├── infrastructure
│   │   │   ├── SupabaseDriverInfoService.ts
│   │   │   ├── SupabaseOrderRealtimeService.ts
│   │   │   └── SupabaseOrderRepository.ts
│   │   └── presentation
│   │       ├── OrderSummaryCard.tsx
│   │       └── ScopedDriverCard.tsx
│   ├── payments
│   │   └── README.md
│   ├── products
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   ├── Product.ts
│   │   │   │   └── ProductAddOn.ts
│   │   │   └── repositories
│   │   │       └── ProductRepository.ts
│   │   ├── infrastructure
│   │   │   └── SupabaseProductRepository.ts
│   │   └── presentation
│   │       ├── AddOnSelectorModal.tsx
│   │       └── ProductCard.tsx
│   ├── profile
│   │   ├── application
│   │   │   └── hooks
│   │   │       └── useProfile.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── UserProfile.ts
│   │   │   └── repositories
│   │   │       └── ProfileRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseProfileRepository.ts
│   ├── promotions
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   ├── Coupon.ts
│   │   │   │   └── Promotion.ts
│   │   │   └── repositories
│   │   │       ├── CouponRepository.ts
│   │   │       └── PromotionRepository.ts
│   │   ├── infrastructure
│   │   │   ├── SupabaseCouponRepository.ts
│   │   │   └── SupabasePromotionRepository.ts
│   │   └── presentation
│   │       ├── CouponInputSection.tsx
│   │       └── PromoBannerCarousel.tsx
│   └── restaurants
│       ├── domain
│       │   ├── entities
│       │   │   ├── Store.ts
│       │   │   └── StoreCategory.ts
│       │   └── repositories
│       │       └── StoreRepository.ts
│       ├── infrastructure
│       │   └── SupabaseStoreRepository.ts
│       └── presentation
│           ├── CategoryTabBar.tsx
│           └── StoreCard.tsx
├── providers
│   └── AppProviders.tsx
└── shared
    ├── lib
    │   ├── auth.ts
    │   ├── queryClient.ts
    │   ├── store.ts
    │   └── supabase.ts
    ├── types
    │   ├── common.ts
    │   └── supabase.ts
    ├── ui
    │   ├── components
    │   │   ├── Button.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ErrorView.tsx
    │   │   ├── Input.tsx
    │   │   └── LoadingSpinner.tsx
    │   └── theme
    │       ├── colors.ts
    │       ├── spacing.ts
    │       └── typography.ts
    └── utils
        ├── formatting.ts
        └── validation.ts
```
