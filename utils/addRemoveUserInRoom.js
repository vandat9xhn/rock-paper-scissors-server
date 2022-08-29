import { rooms } from "../data/rooms.js";
import { users } from "../data/users.js";
import { getIxPlayer, getIxUser, getIxViewer } from "./getIndex.js";

//
const addNewViewer = (room = rooms[0], user = users[0]) => {
  room.viewers.push({
    id: user.id,
    name: user.name,
    id_be_winner: 0,
    online: true,
  });
};

//
export const addUserToRoom = (room = rooms[0], id_user = 0) => {
  const ix_user = getIxUser(id_user);
  const user = users[ix_user];

  // When Gaming: user logout then login again in the room
  const ix_viewer = getIxViewer(room, id_user);
  if (ix_viewer >= 0) {
    room.viewers[ix_viewer].online = true;
    return;
  }
  const ix_player = getIxPlayer(room, id_user);
  if (ix_player >= 0) {
    room.players[ix_player].online = true;
    return;
  }

  addNewViewer(room, user);
};

export const removeUserFromRoom = (room = rooms[0], id_user = 0) => {
  const ix_player = getIxPlayer(room, id_user);
  const ix_viewer = getIxViewer(room, id_user);

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
