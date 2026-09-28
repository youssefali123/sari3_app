# Contract: Application Client Contracts & State Interfaces

**Feature**: `006-regional-order-dispatch`

---

## 1. Domain Entities & Interfaces

### 1.1 `Area` Entity
```typescript
// src/features/areas/domain/entities/Area.ts
export interface Area {
  id: string;
  name: string;
  parentAreaId: string | null;
  createdAt: string;
}
```

### 1.2 `AreaRepository` Contract
```typescript
// src/features/areas/domain/repositories/AreaRepository.ts
export interface AreaRepository {
  /**
   * Fetches all operational areas.
   * Publicly accessible by anonymous and authenticated users.
   */
  getAreas(): Promise<Area[]>;
}
```

### 1.3 Updated `StoreRepository` Contract
```typescript
// src/features/restaurants/domain/repositories/StoreRepository.ts
export interface StoreRepository {
  /**
   * Fetches stores filtered optionally by store type and exact area ID.
   */
  getStores(type?: StoreType, areaId?: string): Promise<Store[]>;
  getStoreById(id: string): Promise<Store>;
  getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]>;
}
```

### 1.4 Updated `UserProfile` & `UpdateProfileInput`
```typescript
// src/features/profile/domain/entities/UserProfile.ts
export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  selectedAreaId: string | null;
  createdAt: string;
  updatedAt: string;
}

// src/features/profile/domain/repositories/ProfileRepository.ts
export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  selectedAreaId?: string | null;
}
```

---

## 2. Redux Toolkit Client State Contract

### `areaSlice`
```typescript
// src/features/areas/application/areaSlice.ts
export interface AreaState {
  selectedAreaId: string | null;
  selectedAreaName: string | null;
}

export const initialAreaState: AreaState = {
  selectedAreaId: null,
  selectedAreaName: null,
};
```

**Actions**:
- `setArea(payload: { id: string; name: string })`: Updates the active browsing area in client state.
- `clearArea()`: Clears active area.

**Store Mount**:
- Added to `RootState` under `state.area`.

---

## 3. Application Hooks Contracts

### 3.1 `useAreas`
```typescript
// src/features/areas/application/hooks/useAreas.ts
export function useAreas(): {
  areas: Area[];
  topLevelAreas: Area[];
  getChildAreas: (parentId: string) => Area[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};
```

### 3.2 `useSelectedArea`
```typescript
// src/features/areas/application/hooks/useSelectedArea.ts
export function useSelectedArea(): {
  selectedAreaId: string | null;
  selectedAreaName: string | null;
  setSelectedArea: (area: { id: string; name: string }) => Promise<void>;
  isLoading: boolean;
};
```
- For unauthenticated users: updates Redux state.
- For authenticated users: updates Redux state and triggers `profileRepository.updateProfile({ selectedAreaId: area.id })`.
- On authentication transition (guest login/signup): syncs Redux `selectedAreaId` to the newly loaded profile if profile currently has `selectedAreaId: null`.

---

## 4. UI Presentation Component Contracts

### 4.1 `AreaHeaderChip`
- Rendered in HomeScreen header.
- Displays current `selectedAreaName` (or "Select Area" if none selected) with a location pin icon.
- Tapping opens `AreaPickerModal`.

### 4.2 `AreaPickerModal`
- Drill-down selector:
  - Step 1: List top-level areas (`parentAreaId === null`).
  - Step 2: Upon clicking a parent area that has children:
    - Option A: Stay on parent only: `"[Parent Name] only"`.
    - Option B: Select child area from list.
  - Step 3: Selection dispatches `setSelectedArea` and closes modal.
