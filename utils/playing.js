import { PLAYING_TIME } from "../constants.js";
import { rooms, rooms_pick } from "../data/rooms.js";
import { users } from "../data/users.js";

import { getIxUser } from "./getIndex.js";
import { getArrIsWinner } from "./getWinner.js";

//
export const startPlaying = (room = rooms[0]) => {
  room.playing_state = "playing";
  room.playing_time = PLAYING_TIME;
};

export const pickIconName = (room = rooms[0], id_user = 0, icon_name = "") => {
  const ix_player = room.players[0].id === id_user ? 0 : 1;
  rooms_pick[room.id][ix_player] = icon_name;
  room.players[ix_player].has_pick = true;
};

export const checkIsPickDone = (room_id = 0) => {
  return !!rooms_pick[room_id][0] && !!rooms_pick[room_id][1];
};

export const handleUserScore = (
  room = rooms[0],
  arr_is_winner = [false, false]
) => {
  const obj_id_score_player = {};
  arr_is_winner.forEach((is_winner, ix) => {
    const player = room.players[ix];
    const ix_user = getIxUser(player.id);
    const user = users[ix_user];

    if (is_winner) {
      room.winner_name = player.name;
      user.score += 1;
    } else {
      user.score -= 1;
      room.defeater_name = player.name;
    }

    player.is_winner = is_winner;
    obj_id_score_player[user.id] = user.score;
  });

  return { obj_id_score_player };
};

export const handleViewerPredictDone = (
  room = rooms[0],
  arr_is_winner = [false, false]
) => {
  const obj_id_score_viewer = {};

  const id_winner =
    arr_is_winner.length === 0 ? 0 : room.players[arr_is_winner[0] ? 0 : 1].id;

  if (id_winner === 0) {
    return { obj_id_score_viewer };
  }

  room.viewers.forEach((item) => {
    if (item.id_be_winner) {
      if (item.id_be_winner <= 0) {
        return;
      }

      const ix_user = getIxUser(item.id);
      const user = users[ix_user];

      user.score += item.id_be_winner === id_winner ? 1 : -1;
      obj_id_score_viewer[user.id] = user.score;
    }
  });

  return { obj_id_score_viewer };
};

export const handlePlayingToEnding = (room = rooms[0]) => {
  room.playing_time = PLAYING_TIME;
  room.playing_state = "ending";
};

// no player out
export const handlePickDone = (room = rooms[0]) => {
  const arr_is_winner = getArrIsWinner(...rooms_pick[room.id], room.is_bonus);
  const { obj_id_score_player } = handleUserScore(room, arr_is_winner);
  const { obj_id_score_viewer } = handleViewerPredictDone(room, arr_is_winner);
  handlePlayingToEnding(room);

  return {
    arr_is_winner: arr_is_winner,
    obj_id_score: { ...obj_id_score_player, ...obj_id_score_viewer },
  };
};

// a player out
export const handlePlayingDisconnect = (room = rooms[0], id_user_out = 0) => {
  const arr_is_winner = room.players.map((item) => item.id !== id_user_out);
  const { obj_id_score_player } = handleUserScore(room, arr_is_winner);
  handlePlayingToEnding(room);

  return { arr_is_winner: arr_is_winner, obj_id_score: obj_id_score_player };
};
