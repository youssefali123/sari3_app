Implement server-triggered push notifications for order lifecycle
events, completing the existing NotificationService domain interface
that has had no infrastructure implementation since Phase 1.

1. When authenticated, the app registers a push notification token
   with the server, associated with the signed-in user's account. A
   user may have the token registered from more than one device at a
   time (e.g. phone and tablet) — all of them should receive
   notifications meant for that user.

2. On sign-out, the current device's push token registration must be
   removed or deactivated for that user, so a subsequent different
   user signing in on the same device never receives notifications
   meant for the previous account. This is a required extension of
   the existing sign-out sequence from auth-and-onboarding (which
   already clears cached query data) — token cleanup must happen in
   the same sequence, not as an afterthought.

3. Driver notification: when a new order becomes available in the
   pending pool, every driver who is currently role=driver AND
   currently toggled Available (not Offline) receives a push
   notification. A driver who is Offline must receive nothing for
   this event — this directly extends the existing offline-enforcement
   guarantee (FR-002 from driver-fulfillment) to the notification
   channel, not just to pool visibility.

4. Customer notifications: the customer receives a push notification
   when their order transitions to each of: accepted (a driver claimed
   it), preparing, out_for_delivery, and delivered. Each notification
   is distinct and human-readable (not a generic "order updated").

5. Tapping a notification opens the app directly to the relevant
   screen: a driver's "new order available" notification opens the
   available-orders pool; a customer's order-status notification opens
   that specific order's detail screen.

6. If the app is already open and in the foreground when a
   notification event fires, the user must not see a redundant or
   confusing experience — the existing realtime-driven UI update
   (already built) is the primary mechanism while the app is open. The
   exact foreground behavior (suppress the OS banner entirely / still
   show a lightweight in-app toast) is left open here and MUST be
   resolved in /speckit-clarify, since it affects whether a
   distinction between "foregrounded" and "backgrounded" must be
   tracked client-side.

7. Notification permission is requested from the user at an
   appropriate, contextual moment — not immediately on app launch
   while still browsing as a guest. If permission is denied, the app
   must continue to function fully via existing in-app/realtime
   mechanisms; push is an enhancement, never a requirement for any
   existing feature to work.

8. Notification delivery must originate from the server (a database-
   driven trigger reacting to actual state changes), never from the
   client optimistically declaring "I just did X, so notify the other
   party." This follows the same principle already applied to
   driver_pool_signals: the client's local action is not the source of
   truth for whether a notification is warranted.

Out of scope: rich/interactive notification actions (accept/decline
directly from the notification), a notification preferences screen,
an in-app notification history/inbox, SMS or email notifications.Implement server-triggered push notifications for order lifecycle
events, completing the existing NotificationService domain interface
that has had no infrastructure implementation since Phase 1.

1. When authenticated, the app registers a push notification token
   with the server, associated with the signed-in user's account. A
   user may have the token registered from more than one device at a
   time (e.g. phone and tablet) — all of them should receive
   notifications meant for that user.

2. On sign-out, the current device's push token registration must be
   removed or deactivated for that user, so a subsequent different
   user signing in on the same device never receives notifications
   meant for the previous account. This is a required extension of
   the existing sign-out sequence from auth-and-onboarding (which
   already clears cached query data) — token cleanup must happen in
   the same sequence, not as an afterthought.

3. Driver notification: when a new order becomes available in the
   pending pool, every driver who is currently role=driver AND
   currently toggled Available (not Offline) receives a push
   notification. A driver who is Offline must receive nothing for
   this event — this directly extends the existing offline-enforcement
   guarantee (FR-002 from driver-fulfillment) to the notification
   channel, not just to pool visibility.

4. Customer notifications: the customer receives a push notification
   when their order transitions to each of: accepted (a driver claimed
   it), preparing, out_for_delivery, and delivered. Each notification
   is distinct and human-readable (not a generic "order updated").

5. Tapping a notification opens the app directly to the relevant
   screen: a driver's "new order available" notification opens the
   available-orders pool; a customer's order-status notification opens
   that specific order's detail screen.

6. If the app is already open and in the foreground when a
   notification event fires, the user must not see a redundant or
   confusing experience — the existing realtime-driven UI update
   (already built) is the primary mechanism while the app is open. The
   exact foreground behavior (suppress the OS banner entirely / still
   show a lightweight in-app toast) is left open here and MUST be
   resolved in /speckit-clarify, since it affects whether a
   distinction between "foregrounded" and "backgrounded" must be
   tracked client-side.

7. Notification permission is requested from the user at an
   appropriate, contextual moment — not immediately on app launch
   while still browsing as a guest. If permission is denied, the app
   must continue to function fully via existing in-app/realtime
   mechanisms; push is an enhancement, never a requirement for any
   existing feature to work.

8. Notification delivery must originate from the server (a database-
   driven trigger reacting to actual state changes), never from the
   client optimistically declaring "I just did X, so notify the other
   party." This follows the same principle already applied to
   driver_pool_signals: the client's local action is not the source of
   truth for whether a notification is warranted.

Out of scope: rich/interactive notification actions (accept/decline
directly from the notification), a notification preferences screen,
an in-app notification history/inbox, SMS or email notifications.Implement server-triggered push notifications for order lifecycle
events, completing the existing NotificationService domain interface
that has had no infrastructure implementation since Phase 1.

1. When authenticated, the app registers a push notification token
   with the server, associated with the signed-in user's account. A
   user may have the token registered from more than one device at a
   time (e.g. phone and tablet) — all of them should receive
   notifications meant for that user.

2. On sign-out, the current device's push token registration must be
   removed or deactivated for that user, so a subsequent different
   user signing in on the same device never receives notifications
   meant for the previous account. This is a required extension of
   the existing sign-out sequence from auth-and-onboarding (which
   already clears cached query data) — token cleanup must happen in
   the same sequence, not as an afterthought.

3. Driver notification: when a new order becomes available in the
   pending pool, every driver who is currently role=driver AND
   currently toggled Available (not Offline) receives a push
   notification. A driver who is Offline must receive nothing for
   this event — this directly extends the existing offline-enforcement
   guarantee (FR-002 from driver-fulfillment) to the notification
   channel, not just to pool visibility.

4. Customer notifications: the customer receives a push notification
   when their order transitions to each of: accepted (a driver claimed
   it), preparing, out_for_delivery, and delivered. Each notification
   is distinct and human-readable (not a generic "order updated").

5. Tapping a notification opens the app directly to the relevant
   screen: a driver's "new order available" notification opens the
   available-orders pool; a customer's order-status notification opens
   that specific order's detail screen.

6. If the app is already open and in the foreground when a
   notification event fires, the user must not see a redundant or
   confusing experience — the existing realtime-driven UI update
   (already built) is the primary mechanism while the app is open. The
   exact foreground behavior (suppress the OS banner entirely / still
   show a lightweight in-app toast) is left open here and MUST be
   resolved in /speckit-clarify, since it affects whether a
   distinction between "foregrounded" and "backgrounded" must be
   tracked client-side.

7. Notification permission is requested from the user at an
   appropriate, contextual moment — not immediately on app launch
   while still browsing as a guest. If permission is denied, the app
   must continue to function fully via existing in-app/realtime
   mechanisms; push is an enhancement, never a requirement for any
   existing feature to work.

8. Notification delivery must originate from the server (a database-
   driven trigger reacting to actual state changes), never from the
   client optimistically declaring "I just did X, so notify the other
   party." This follows the same principle already applied to
   driver_pool_signals: the client's local action is not the source of
   truth for whether a notification is warranted.

Out of scope: rich/interactive notification actions (accept/decline
directly from the notification), a notification preferences screen,
an in-app notification history/inbox, SMS or email notifications.
