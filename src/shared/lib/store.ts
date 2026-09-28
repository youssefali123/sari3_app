import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { cartSlice } from '@/features/cart/application/cartSlice';
import { areaSlice } from '@/features/areas/application/areaSlice';

export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    area: areaSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Typed hooks for Redux — use these instead of plain useDispatch/useSelector.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
