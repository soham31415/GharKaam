/**
 * Plain data shapes (DTOs) that services return and the UI renders.
 * Kept separate from DB rows so the frontend can be replaced without touching
 * the database layer.
 */

export type Profile = {
  id: string;
  name: string;
  avatar: string | null;
  isAdmin: boolean;
  digestEnabled: boolean;
  archived: boolean;
};
