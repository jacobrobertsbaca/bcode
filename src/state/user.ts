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
  updateUser: (changes: Partial<LiveUser>) => void;
}

/**
 * This is a unique identifier representing the current client.
 * It is unique on a per-session basis, e.g. opening a new browser tab will yield a different id.
 */
const clientId = v4();

export const useUserState = create<UserState>((set, get) => {
  const colors = [
    { color: "#30bced", light: "#30bced33" },
    { color: "#6eeb83", light: "#6eeb8333" },
    { color: "#ffbc42", light: "#ffbc4233" },
    { color: "#ecd444", light: "#ecd44433" },
    { color: "#ee6352", light: "#ee635233" },
    { color: "#9ac2c9", light: "#9ac2c933" },
    { color: "#8acb88", light: "#8acb8833" },
    { color: "#1be7ff", light: "#1be7ff33" },
  ];

  const color = colors[random(0, colors.length - 1)];

  return {
    user: {
      id: clientId,
      name: "Host",
      isHost: true,
      color: color.color,
      lightColor: color.light,
      group: 0,
    },
    
    updateUser(changes) {
      set({ user: { ...get().user, ...changes }});
    },
  };
});
