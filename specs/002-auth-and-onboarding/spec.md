# Feature Specification: Authentication & Onboarding

**Feature Branch**: `002-auth-and-onboarding`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Add authentication and guest access to the Sari3 delivery app with role-based routing for customers and drivers."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Browsing (Priority: P1)

A visitor opens the Sari3 app without signing in and freely browses the catalog. They can view restaurants and markets, browse categories and products, see product details and add-ons, and build a shopping cart — all without creating an account.

**Why this priority**: Guest browsing is the entry point for all new users. If visitors must sign up before seeing any value, acquisition drops dramatically. Letting them explore freely maximizes engagement and cart-building before requiring commitment.

**Independent Test**: Can be fully tested by opening the app in a logged-out state, navigating through restaurants, products, and adding items to the cart. Delivers value by letting users evaluate the service before committing to registration.

**Acceptance Scenarios**:

1. **Given** the app is launched for the first time (no stored session), **When** the visitor opens the home screen, **Then** the full catalog of restaurants and markets is displayed without any sign-in prompt.
2. **Given** the visitor is unauthenticated, **When** they tap a restaurant, **Then** the restaurant's categories, products, details, and add-ons are all viewable.
3. **Given** the visitor is unauthenticated, **When** they add products (with or without add-ons) to the cart, **Then** the cart updates correctly and persists during the browsing session.

---

### User Story 2 - Customer Sign-Up & Automatic Profile Creation (Priority: P1)

A visitor who wants to complete a protected action (e.g., checkout) is redirected to a combined sign-in/sign-up screen. They choose to register as a new customer by providing their details. Upon successful registration, a customer profile is automatically created and the visitor is returned to the app with their guest cart intact.

**Why this priority**: Registration is the critical conversion event. Without it, guest users cannot become paying customers. Automatic profile creation eliminates a failure point where a registered user could exist without a usable profile.

**Independent Test**: Can be tested by building a cart as a guest, tapping "Proceed to Checkout," completing the sign-up form, and verifying the user lands in the customer experience with the cart intact and a profile record present.

**Acceptance Scenarios**:

1. **Given** the visitor is unauthenticated and has items in their cart, **When** they attempt to proceed to checkout, **Then** the combined sign-in/sign-up screen appears.
2. **Given** the visitor is on the sign-up form, **When** they submit valid registration details, **Then** a new account is created with the customer role and a corresponding profile record is automatically created before any post-registration screen loads.
3. **Given** the visitor just completed registration, **When** they are returned to the app, **Then** their guest cart contents are fully preserved and they land in the customer navigation.
4. **Given** a visitor attempts to register, **When** they provide an email that is already in use, **Then** a clear error message indicates the email is already registered.
5. **Given** a visitor attempts to register, **When** they provide a weak password, **Then** a clear error message explains the password requirements.

---

### User Story 3 - Existing User Login & Role-Based Routing (Priority: P1)

A returning user who is prompted to authenticate (or who navigates to sign-in voluntarily) enters their credentials on the shared login screen. The app authenticates them, looks up their stored role, and routes them to the appropriate experience — customer navigation for customers, driver navigation for drivers — without ever asking the user to select a role.

**Why this priority**: Login is how all returning users re-enter the app. Role-based routing is the mechanism that makes a single app work for both customers and drivers. Without it, users would land in the wrong experience.

**Independent Test**: Can be tested with two test accounts (one customer, one driver). Log in with each and verify the correct navigation root is shown. Also verify that a guest cart is preserved when a customer logs in.

**Acceptance Scenarios**:

1. **Given** a user with the customer role exists, **When** they enter valid credentials on the login screen, **Then** they are authenticated and land in the customer navigation.
2. **Given** a user with the driver role exists, **When** they enter valid credentials on the login screen, **Then** they are authenticated and land in the driver navigation.
3. **Given** a user enters invalid credentials, **When** they submit the login form, **Then** a clear error message is displayed (without revealing which field is wrong for security).
4. **Given** a guest user has items in their cart, **When** they log in as a customer, **Then** their guest cart contents are preserved.

---

### User Story 4 - Protected Action Gating with Return-to-Context (Priority: P2)

When an unauthenticated visitor attempts a protected action — proceeding to checkout, favoriting a restaurant or product, viewing order history, or opening the profile or addresses screen — they are redirected to the combined sign-in/sign-up screen with their attempted destination preserved (`returnTo`). After successful customer authentication, the app returns them directly to their attempted destination/screen with the guest cart intact. Drivers are always routed to the driver home navigation.

**Why this priority**: This is the mechanism that bridges guest browsing and authenticated features. It's critical for conversion, but depends on Stories 1–3 being functional first.

**Independent Test**: Can be tested by attempting each protected action while unauthenticated and verifying that authentication is required, and that after auth the user lands on the correct role home screen with their cart intact.

**Acceptance Scenarios**:

1. **Given** the visitor is unauthenticated, **When** they attempt to proceed to checkout, **Then** the sign-in/sign-up screen is displayed.
2. **Given** the visitor is unauthenticated, **When** they attempt to favorite a restaurant or product, **Then** the sign-in/sign-up screen is displayed.
3. **Given** the visitor is unauthenticated, **When** they attempt to view order history, **Then** the sign-in/sign-up screen is displayed.
4. **Given** the visitor is unauthenticated, **When** they attempt to open the profile screen, **Then** the sign-in/sign-up screen is displayed.
5. **Given** the visitor completes authentication after being redirected from a protected action, **When** auth succeeds as a customer, **Then** the visitor is returned to the attempted screen/context (e.g., checkout, favorites, orders, profile, addresses) with their guest cart intact. If authenticated as a driver, they are routed to the driver home regardless of return destination.

---

### User Story 5 - Session Persistence & Logout (Priority: P2)

A logged-in user closes the app and reopens it later. They remain logged in and land in the correct role-based navigation without re-entering credentials. When they explicitly choose to log out, they are returned to the unauthenticated guest browsing state and can continue browsing freely.

**Why this priority**: Session persistence is a fundamental UX expectation. Logout returning to guest browsing (not a dead end) is important for usability but depends on core auth being in place.

**Independent Test**: Can be tested by logging in, force-closing and relaunching the app (verify still logged in), then tapping Log Out and verifying the guest browsing state is restored.

**Acceptance Scenarios**:

1. **Given** a user is logged in as a customer, **When** they close and reopen the app, **Then** they are still logged in and land in the customer navigation.
2. **Given** a user is logged in as a driver, **When** they close and reopen the app, **Then** they are still logged in and land in the driver navigation.
3. **Given** a user is logged in, **When** they tap the Log Out action, **Then** the session is cleared and they are returned to the unauthenticated browsing state where they can browse restaurants, products, and build a cart.

---

### User Story 6 - Authentication Error Handling (Priority: P3)

When authentication operations fail due to predictable errors (invalid credentials, duplicate email, weak password) or infrastructure issues (network failure), the user receives clear, actionable feedback and is never left in an ambiguous state.

**Why this priority**: Error handling is not a happy-path feature, but it prevents user frustration and support tickets. It builds on all prior stories.

**Independent Test**: Can be tested by deliberately triggering each error condition (wrong password, duplicate email, weak password, airplane mode) and verifying the displayed message.

**Acceptance Scenarios**:

1. **Given** a user enters an incorrect password, **When** they submit the login form, **Then** a clear error message is shown without revealing whether the email or password was wrong.
2. **Given** a visitor enters an already-registered email, **When** they submit the registration form, **Then** a clear error message indicates the email is taken.
3. **Given** a visitor enters a password that does not meet strength requirements, **When** they submit the registration form, **Then** a clear error message explains the requirements.
4. **Given** the device has no network connectivity, **When** a user attempts to sign in or register, **Then** a clear error message indicates network unavailability and suggests retrying.

---

### Edge Cases

- What happens when a logged-in user's profile record cannot be found after successful authentication? → The app displays a clear, distinct error state explaining that account setup is incomplete, with options to retry the profile lookup or sign out. The app must never hang on a loading screen or silently misroute the user.
- What happens when a driver account logs in for the first time (provisioned out-of-band)? → The driver is authenticated and routed to the driver navigation immediately, with no additional in-app setup step required.
- What happens when a guest cart exists and the user logs in as a driver (who doesn't use cart functionality)? → The guest cart data is discarded or ignored, since driver navigation does not include a shopping experience.
- What happens when a user logs out and then logs in with a different account? → The previous session is fully cleared, and the new account's role-based routing applies with a fresh state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow unauthenticated visitors to browse all restaurants, markets, categories, products, product details, and add-ons without requiring sign-in.
- **FR-002**: The system MUST allow unauthenticated visitors to add products (with or without add-ons) to a cart without requiring sign-in.
- **FR-003**: The system MUST redirect unauthenticated visitors to a combined sign-in/sign-up screen when they attempt a protected action (checkout, favoriting, order history, profile).
- **FR-004**: The system MUST preserve guest cart contents through the authentication flow so that items are not lost when a guest signs up or logs in as a customer.
- **FR-005**: The system MUST create every self-service registration account with the customer role by default, with no role selection offered during registration.
- **FR-006**: The system MUST automatically create a profile record for newly registered users immediately upon successful registration, before any post-registration screen depends on that profile.
- **FR-007**: The system MUST provide a single shared login screen for all roles, with no role selection prompt.
- **FR-008**: The system MUST look up the authenticated user's stored role after login and route them to the correct navigation (customer or driver).
- **FR-009**: The system MUST support driver accounts that were provisioned out-of-band, routing them to the driver navigation on first login with no additional setup step.
- **FR-010**: The system MUST persist the authenticated session across app restarts until the user explicitly logs out.
- **FR-011**: The system MUST return the user to the unauthenticated guest browsing state upon logout, not to a dead-end screen.
- **FR-012**: The system MUST display clear error feedback for invalid credentials, duplicate email at registration, weak password, and network failure during authentication.
- **FR-013**: The system MUST display a clear, distinct error state when a successfully authenticated user's profile record cannot be found (role lookup failure), with options to retry or sign out — never a blank or frozen screen.
- **FR-014**: The self-service registration form MUST require exactly three fields: email address, password, and full name. No other fields are required at registration.
- **FR-015**: The system MUST validate that full name is non-empty before allowing registration to proceed; an empty or whitespace-only name MUST produce a clear inline error message.

### Key Entities

- **User Account**: Represents an authenticated identity. Key attributes: unique identifier, email, authentication credentials, full name (collected at registration). Created via self-service registration (customer) or out-of-band provisioning (driver).
- **User Profile**: Represents the user's role and app-specific data. Key attributes: full name, role (customer or driver), link to user account. Automatically created upon registration for customers with full name and customer role; pre-provisioned for drivers.
- **Guest Cart**: A temporary, session-scoped collection of selected products and add-ons. Exists before authentication and is transferred to the authenticated customer upon login/registration.
- **Session**: Represents an active authenticated session. Persists across app restarts until explicit logout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First-time visitors can browse the full catalog (restaurants, products, details, add-ons) and build a cart within 30 seconds of opening the app, without encountering any sign-in prompt.
- **SC-002**: 95% of new users complete registration and land in the customer experience with their guest cart intact in under 2 minutes.
- **SC-003**: Returning users are automatically re-authenticated and land in the correct role-based navigation within 3 seconds of app launch.
- **SC-004**: 100% of login attempts with valid credentials result in the user landing in the correct role-based navigation (customer or driver) without manual role selection.
- **SC-005**: All four defined authentication error cases (invalid credentials, duplicate email, weak password, network failure) display a user-understandable message within 5 seconds of the triggering action.
- **SC-006**: A user whose profile record is missing after login sees a clear error state (not a blank or frozen screen) within 5 seconds, with an actionable option to retry or sign out.
- **SC-007**: Session persistence works across app restarts — 100% of previously-authenticated users remain logged in when reopening the app.

## Assumptions

- Users have a working internet connection for authentication operations (sign-in, sign-up, logout). Offline browsing of cached catalog data is outside the scope of this feature.
- The existing Supabase Auth service is used for authentication. No additional authentication provider setup is required beyond what Supabase offers.
- Driver accounts are provisioned externally (e.g., via admin panel or direct database operations) with the driver role already assigned before the driver ever logs in through this app.
- Password strength requirements follow Supabase Auth defaults (minimum 6 characters) unless otherwise configured.
- The app supports two roles for this feature: customer and driver. Admin and other roles are out of scope.
- Guest cart data is stored locally on the device and does not require server-side persistence until the user authenticates and proceeds to checkout.
- Social login (Google, Apple, Facebook), phone/OTP login, password reset flows, and driver self-registration UI are explicitly out of scope for this feature.
- The authenticated session token is stored in general-purpose local storage (AsyncStorage) for MVP. This is an accepted tradeoff: token theft risk on non-rooted devices is low, and migration to OS-level secure storage (keychain/keystore) is a future hardening task that does not require rearchitecting this feature.

## Clarifications

### Session 2026-09-19

- Q: After a guest is redirected to the sign-in/sign-up screen because they tried a protected action, where exactly should the app take them once authentication succeeds? → A: Return the customer to the usable context/action they originally attempted (e.g., checkout, favorites, orders, profile, addresses) via `returnTo` navigation, without losing the guest cart. Driver accounts strictly route to driver home.
- Q: What fields must the user provide during self-service registration — beyond email and password — for a customer account to be considered complete? → A: Full name only (email + password + full name required; no other fields at registration).
- Q: When the app stores an active session between restarts, should that session data be kept in secure encrypted storage or general-purpose local storage? → A: General-purpose local storage (AsyncStorage) — accepted MVP tradeoff; upgrade to secure storage is deferred to a future hardening task.
