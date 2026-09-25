# Payments Feature

This feature is reserved for future payment integration.

## Planned Boundary

The payments feature will provide:

- `domain/entities/Payment.ts` — Payment entity
- `domain/services/PaymentGateway.ts` — Abstract payment provider interface
- `domain/repositories/PaymentRepository.ts` — Payment data access
- `application/usecases/processPaymentUseCase.ts` — Payment orchestration
- `infrastructure/` — Concrete implementation (Stripe, etc.)
- `presentation/components/` — Payment UI (card input, etc.)

## Integration Point

The `createOrderUseCase` will be extended to call `PaymentGateway.createPaymentIntent()` 
as part of the order creation flow.

## Design Principle

`PaymentGateway` is an interface. Switching payment providers means writing a new 
infrastructure implementation — no domain or use case changes required.
