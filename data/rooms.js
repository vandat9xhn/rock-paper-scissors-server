import { PLAYING_TIME } from "../constants.js";

//
export const rooms = [
  {
    id: 1,
    name: "Room ",
    viewers: [{ id: 0, name: "", id_be_winner: -1 }],
    players: [
      {
        id: 0,
        name: "",
        has_pick: false,
        icon_name: "",
        is_winner: false,
        count_predict_winner: 0,
      },
    ],

    playing_state: "waiting" || "playing" || "ending",
    playing_time: PLAYING_TIME,
    is_bonus: true,
    winner_name: "",
    defeater_name: "",
  },
];
rooms.splice(0, 1);

export const rooms_pick = {};
export const rooms_interval = {};

for (let i = 1; i <= 10; i++) {
  rooms.push({
    id: i,
    name: `Room ${i}`,
    viewers: [],
    players: [],
    playing_state: "waiting" || "playing" || "ending",
    playing_time: PLAYING_TIME,
    is_bonus: true,
    winner_name: "",
    defeater_name: "",
  });

  rooms_pick[i] = ["", ""];
  rooms_interval[i] = null;
}
