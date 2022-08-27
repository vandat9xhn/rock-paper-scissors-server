import { auth_users } from "../data/auth_users.js";
import { rooms } from "../data/rooms.js";
import { users } from "../data/users.js";

//
export const getIxAuthUser = (id_user = 0) =>
  auth_users.findIndex((item) => item.id === id_user);

export const getIxUser = (id_user = 0) =>
  users.findIndex((item) => item.id === id_user);

export const getIxRoom = (id_room = 0) =>
  rooms.findIndex((item) => item.id === id_room);

export const getIxPlayer = (room = rooms[0], id_user = 0) =>
  room.players.findIndex((item) => item.id === id_user);

export const getIxViewer = (room = rooms[0], id_user = 0) =>
  room.viewers.findIndex((item) => item.id === id_user);
