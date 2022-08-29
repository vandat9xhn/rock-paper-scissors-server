import { rooms } from "../data/rooms.js";

//
export const handleGamingPlayerOff = (room = rooms[0], id_user = 0) => {
  room.players.find((item) => item.id === id_user).online = false;
};

export const handleGamingViewerOff = (room = rooms[0], id_user = 0) => {
  room.viewers.find((item) => item.id === id_user).online = false;
};
