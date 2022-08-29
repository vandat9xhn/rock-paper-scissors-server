import { rooms } from "../data/rooms.js";
import { getIxPlayer, getIxViewer } from "./getIndex.js";

//
export const predictWinner = ({
  room = rooms[0],
  id_viewer = 0,
  id_be_winner = 0,
}) => {
  // console.log(id_viewer, room.viewers);

  const ix_viewer = getIxViewer(room, id_viewer);
  const ix_player = getIxPlayer(room, id_be_winner);
  room.viewers[ix_viewer].id_be_winner = id_be_winner;
  room.players[ix_player].count_predict_winner += 1;
};
