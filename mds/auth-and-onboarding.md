Add authentication and guest access to the Sari3 delivery app.

1. Unauthenticated visitors can browse the app freely: view restaurants
   and markets, view categories and products, view product details and
   add-ons, and build a cart — all without signing in.

2. Attempting a protected action while unauthenticated (proceeding to
   checkout, favoriting a restaurant/product, viewing order history,
   opening the profile screen) redirects the visitor to a combined
   sign-in/sign-up screen. After successful authentication, the visitor
   returns to a usable state (cart contents built as a guest are not
   lost).

3. Self-service registration is customer-only. There is no role choice
   anywhere in the registration flow — every account created through
   the app's sign-up form is a customer by default. Upon successful
   registration, a profile record is automatically created for the new
   user with the customer role, before any other app screen depends on
   that profile existing.

4. There is a single, shared login screen for every account regardless
   of role. Login never asks the user to select a role. After a
   successful login, the app looks up the authenticated user's stored
   role and navigates accordingly: customers land in customer
   navigation, drivers land in driver navigation.

5. Driver accounts are NOT created through this app's registration
   flow. They are provisioned out-of-band (outside this feature's
   scope) with the driver role already assigned before the driver ever
   logs in. The login and role-based routing behavior in requirement 4
   must work correctly for such accounts on first login, with no
   additional in-app setup step required.

6. A logged-in user stays logged in across app restarts until they
   explicitly log out. Logging out returns the user to the
   unauthenticated browsing state described in requirement 1, not to a
   dead end.

7. Basic authentication error cases must be handled with clear
   feedback: invalid credentials, duplicate email at registration,
   weak password, and network failure during authentication.
Edge Cases:

8. If an authenticated user's profile record cannot be found (role
  lookup fails after a successful login), the app must not hang on an
  indefinite loading screen or silently misroute the user. It must
  show a clear, distinct error state explaining that account setup is
  incomplete, with an option to retry or sign out — never a blank or
  frozen screen.

Out of scope for this feature: driver self-registration UI, admin
role, password reset flows, social login, phone/OTP login.
