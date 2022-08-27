import { rooms } from "../data/rooms.js";
import { getIxPlayer, getIxViewer } from "./getIndex.js";

//
export const viewerToPlayer = (room = rooms[0], id_user = 0) => {
  const ix_viewer = getIxViewer(room, id_user);
  const viewer = room.viewers.splice(ix_viewer, 1)[0];
  const player = {
    id: viewer.id,
    name: viewer.name,
    has_pick: false,
    icon_name: "",
    is_winner: false,
  };
  room.players.push(player);

  return { viewer, player };
};

export const playerToViewer = (room = rooms[0], id_user = 0) => {
  const ix_player = getIxPlayer(room, id_user);
  const player = room.players.splice(ix_player, 1)[0];
  const viewer = {
    id: player.id,
    name: player.name,
    id_be_winner: -1,
  };
  room.viewers.push(viewer);

  return { player, viewer };
};

//
export const checkIsPlayer = (room = rooms[0], id_user = 0) => {
  return !!room.players.find((item) => item.id === id_user);
};

export const checkIsPlayer1 = (room = rooms[0], id_user = 0) => {
  return room.players[0].id === id_user;
};
