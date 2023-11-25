import { v4 } from "uuid";
import { random } from "lodash";
import { create } from "zustand";

/**
 * Keeps track of details of a connected user, such as their name and color.
 */
export interface LiveUser {
  /**
   * Unique identifier for this user.
   */
  id: string;

  /**
   * User inputted name of this user.
   */
  name: string;

  /**
   * Whether or not this user is the host of the room they are connected to.
   */
  isHost: boolean;

  /**
   * The hexadecimal color of this user.
   */
  color: string;

  /**
   * The hexadecimal light color of this user.
   */
  lightColor: string;

  /**
   * The group that this user belongs to.
   */
  group: number;
}

export interface UserState {
  user: LiveUser;
  updateUser: (changes: Partial<Omit<LiveUser, "id">>) => void;
}

/**
 * This is a unique identifier representing the current client.
 * It is unique on a per-session basis, e.g. opening a new browser tab will yield a different id.
 */
const clientId = v4();

export const useUserState = create<UserState>((set, get) => {
  return {
    user: {
      id: clientId,
      name: "",
      isHost: true,
      color: "#000000",
      lightColor: "#000000",
      group: 0,
    },
    
    updateUser(changes) {
      set({ user: { ...get().user, ...changes }});
    },
  };
});
