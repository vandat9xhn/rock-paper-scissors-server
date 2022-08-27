import { rooms } from "../data/rooms.js";
import { users } from "../data/users.js";
import { getIxPlayer, getIxRoom, getIxUser, getIxViewer } from "./getIndex.js";

//
export const addUserToRoom = (id_room = 0, id_user = 0) => {
  const ix_user = getIxUser(id_user);
  const ix_room = getIxRoom(id_room);

  const user = users[ix_user];
  const room = rooms[ix_room];
  room.viewers.push({ id: user.id, name: user.name });

  return { user, room };
};

export const removeUserFromRoom = (room = rooms[0], id_user = 0) => {
  const ix_player = getIxPlayer(room,id_user);
  const ix_viewer = getIxViewer(room,id_user);

  if (ix_viewer >= 0) {
    const user = room.viewers.splice(ix_viewer, 1)[0];
    return { user };
  }

  const user = room.players.splice(ix_player, 1)[0];
  return { user };
};

export const removePlayer = (room = rooms[0], id_user = 0) => {
  const ix_player = getIxPlayer(room, id_user);
  const player = room.players.splice(ix_player, 1)[0];
  return { player };
};

export const removeViewer = (room = rooms[0], id_user = 0) => {
  const ix_viewer = getIxViewer(room, id_user);
  const viewer = room.viewers.splice(ix_viewer, 1)[0];
  return { viewer };
};
