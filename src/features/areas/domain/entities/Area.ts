/**
 * A geographical operational area in the hierarchical area tree
 * (e.g. governorate → city → district). Filtering is always an exact
 * match on the area id — no parent/child rollups.
 */
export interface Area {
  id: string;
  name: string;
  /** Parent area id, or null for a top-level area (e.g. governorate). */
  parentAreaId: string | null;
  createdAt: string;
}
