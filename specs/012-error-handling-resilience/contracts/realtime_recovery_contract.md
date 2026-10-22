# Contract: Realtime Reconnection & State Recovery

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](../spec.md)

---

## 1. Scope & Intent
Specifies channel status tracking and authoritative state refetching when Supabase Realtime channels disconnect and reconnect (FR-012, FR-013, FR-014).

---

## 2. Channel Lifecycle Machine

```text
[ Init .subscribe() ]
          │
          ▼
   [ SUBSCRIBED ]  ◄────────────────────────────────┐
          │                                         │
     (Disconnect)                              (Reconnect)
          │                                         │
          ▼                                         │
 [ CHANNEL_ERROR / TIMED_OUT / CLOSED ] ────────────┘
          │
          └── Marks `needsRefetchOnReconnect = true`
```

---

## 3. Infrastructure Behavior

1. **Status Observation**:
   - Every Realtime channel passes a status callback to `.subscribe(status => ...)`:
     ```typescript
     let wasDisconnected = false;
     
     const channel = supabase
       .channel(`...`)
       .on(...)
       .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
           if (wasDisconnected) {
             wasDisconnected = false;
             // Trigger immediate authoritative cache invalidation
             void onReconnected();
           }
         } else if (
           status === 'CHANNEL_ERROR' ||
           status === 'TIMED_OUT' ||
           status === 'CLOSED'
         ) {
           wasDisconnected = true;
         }
       });
     ```
2. **Channel Teardown**:
   - The returned `Unsubscribe` function invokes `void supabase.removeChannel(channel)` immediately.
   - Channels are scoped per subscriber instance to avoid colliding with concurrent mounts.
3. **Decoupled Domain**:
   - Domain interfaces (`OrderRealtimeService`, `DriverRealtimeService`) remain free of Supabase channel statuses. Recovery is self-contained in the Infrastructure implementation.
