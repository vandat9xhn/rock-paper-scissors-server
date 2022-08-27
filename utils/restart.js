import { PLAYING_TIME } from "../constants.js";
import { rooms, rooms_pick } from "../data/rooms.js";

//
export const restartGame = (room = rooms[0]) => {
  room.playing_state = "waiting";
  room.playing_time = PLAYING_TIME;
  rooms_pick[room.id] = ["", ""];

  room.players.forEach((item) => {
    item.count_predict_winner = 0;
    item.icon_name = undefined;
    item.is_winner = false;
    item.has_pick = false;
  });
  room.viewers.forEach((item) => {
    item.id_be_winner = 0;
  });
};
