import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Client-local area selection (feature 006 US2). Transient single source of
 * truth for the browsing area — retained for guests without login, synced to
 * the profile server-side for authenticated customers by useSelectedArea.
 */
export interface AreaState {
  selectedAreaId: string | null;
  selectedAreaName: string | null;
}

const initialState: AreaState = {
  selectedAreaId: null,
  selectedAreaName: null,
};

export const areaSlice = createSlice({
  name: 'area',
  initialState,
  reducers: {
    setArea(state, action: PayloadAction<{ id: string; name: string }>) {
      state.selectedAreaId = action.payload.id;
      state.selectedAreaName = action.payload.name;
    },
    clearArea(state) {
      state.selectedAreaId = null;
      state.selectedAreaName = null;
    },
  },
});

export const { setArea, clearArea } = areaSlice.actions;

export const selectArea = (state: { area: AreaState }) => state.area;
