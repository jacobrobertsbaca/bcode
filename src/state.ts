import { create } from "zustand";

interface RoomState {
  view: "name" | "code";
  name: string;
  setName: (name: string) => void;
  join: () => void;
};

export const useRoomState = create<RoomState>((set) => ({
  name: "",
  view: "name",
  setName: (name: string) => set({ name }),
  join: () => set({ view: "code" })
}));
