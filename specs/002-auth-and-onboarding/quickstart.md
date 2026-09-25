# Quickstart Validation Guide: Authentication & Onboarding

**Feature**: 002-auth-and-onboarding | **Date**: 2026-09-19

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npx expo`)
- Supabase project running (local or remote) with the schema migration applied
- `.env` file configured with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Profile auto-creation trigger deployed (see [data-model.md](./data-model.md) § Database Schema Changes)

## Setup

```bash
# Install dependencies
npm install

# Start the Expo dev server
npx expo start

# Open on a simulator/device
# Press 'i' for iOS simulator, 'a' for Android emulator
```

## Validation Scenarios

### Scenario 1: Guest Browsing (User Story 1)

**Steps**:
1. Launch the app (no previous session)
2. Verify the home screen loads showing restaurants/markets — no sign-in prompt
3. Tap a restaurant → verify categories, products, details, and add-ons are visible
4. Add a product (with an add-on) to the cart
5. Navigate to the Cart tab → verify the item appears correctly

**Expected**: Full catalog browsing and cart-building without any authentication prompt.

---

### Scenario 2: Customer Registration (User Story 2)

**Steps**:
1. As a guest, add items to the cart
2. Tap "Proceed to Checkout" (or another protected action)
3. Verify redirect to the sign-in/sign-up screen
4. Switch to the Register form
5. Enter email, password (6+ characters), and full name
6. Submit the form
7. Verify: you land in the customer navigation (Home tab) with cart items intact
8. Verify in Supabase dashboard: a `profiles` row exists for the new user with `role = 'customer'` and the entered `full_name`

**Expected**: Account created, profile auto-created, cart preserved, customer navigation shown.

---

### Scenario 3: Customer Login (User Story 3)

**Steps**:
1. Log out (or start fresh)
2. As a guest, add items to the cart
3. Navigate to the sign-in screen
4. Enter the customer credentials from Scenario 2
5. Submit
6. Verify: customer navigation shown, cart items intact

**Expected**: Authenticated and routed to customer experience with cart preserved.

---

### Scenario 4: Driver Login (User Story 3)

**Prerequisites**: Create a driver account via Supabase dashboard:
1. Create user in Auth → Users
2. Insert a `profiles` row with `role = 'driver'` and a `full_name`

**Steps**:
1. Launch the app (no session)
2. Navigate to sign-in
3. Enter the driver credentials
4. Submit
5. Verify: driver navigation shown (Available Orders, History tabs)
6. Verify: any guest cart data is NOT visible (no cart in driver UI)

**Expected**: Authenticated and routed to driver experience.

---

### Scenario 5: Protected Action Gating (User Story 4)

**Steps** (for each protected action):
1. As a guest (unauthenticated):
   - Tap "Proceed to Checkout" → verify auth screen appears
   - Try to favorite a restaurant/product → verify auth screen appears
   - Try to view Order History → verify auth screen appears
   - Try to open Profile → verify auth screen appears
2. Complete authentication (sign up or sign in)
3. Verify: you land on the role-appropriate home screen with cart intact

**Expected**: All protected actions gate behind auth. Post-auth landing is the home screen.

---

### Scenario 6: Session Persistence (User Story 5)

**Steps**:
1. Log in as a customer
2. Force-close the app (remove from app switcher)
3. Reopen the app
4. Verify: still logged in, customer navigation shown, no login prompt
5. Tap Log Out
6. Verify: returned to guest browsing state, can browse restaurants and build a cart

**Expected**: Session survives app restart. Logout returns to guest browsing.

---

### Scenario 7: Error Handling (User Story 6)

**Steps**:
1. **Invalid credentials**: On the login screen, enter a valid email with a wrong password → verify clear error message (no hint about which field)
2. **Duplicate email**: On the register screen, enter an already-registered email → verify "email already registered" error
3. **Weak password**: On the register screen, enter a password under 6 characters → verify password requirements error
4. **Empty full name**: On the register screen, leave the name field empty → verify inline error about name being required
5. **Network failure**: Enable airplane mode, then try to sign in → verify network error message

**Expected**: All error cases produce clear, actionable feedback.

---

### Scenario 8: Profile Not Found (Edge Case)

**Steps** (requires manual DB intervention):
1. Create a user in Supabase Auth (directly, without the trigger firing, or delete the profile row after signup)
2. Log in with that user's credentials
3. Verify: a clear error state is shown (not a blank/frozen screen)
4. Verify: "Retry" and "Sign Out" options are available
5. Tap "Sign Out" → verify return to guest browsing

**Expected**: Profile-not-found error state with actionable options.

---

### Scenario 9: Cross-Account Login (Edge Case)

**Steps**:
1. Log in as a customer
2. Log out
3. Log in as a driver
4. Verify: driver navigation shown, no stale customer data visible
5. Log out
6. Verify: guest browsing state restored

**Expected**: Clean session transitions between different accounts and roles.
