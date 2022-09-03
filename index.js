import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

import { PLAYING_TIME, RESTARTING_TIME } from "./constants.js";
import { PLAYING_STATE } from "./data/playing_state.js";
import {
  rooms,
  rooms_interval,
  rooms_pick,
  rooms_restart_timeout,
} from "./data/rooms.js";
import { SOCKET_EVENTS } from "./data/socket_events.js";
import { users } from "./data/users.js";

import { addAuthUser } from "./utils/addAuthUser.js";
import { addUser, removeUser } from "./utils/addRemoveUser.js";
import {
  addUserToRoom,
  removePlayer,
  removeUserFromRoom,
  removeViewer,
} from "./utils/addRemoveUserInRoom.js";
import {
  handleGamingPlayerOff,
  handleGamingViewerOff,
} from "./utils/gaming_user_online.js";
import { getIxRoom } from "./utils/getIndex.js";

import { playerToViewer, viewerToPlayer } from "./utils/player_viewer.js";
import {
  checkIsPickDone,
  handlePickDone,
  handlePlayingDisconnect,
  pickIconName,
  startPlaying,
} from "./utils/playing.js";

import { predictWinner } from "./utils/predict_winner.js";
import { restartGame } from "./utils/restart.js";
import { auth_users } from "./data/auth_users.js";

// ----

dotenv.config();
const port = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use((req, res) => res.send("ok"));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.ORIGIN],
    methods: ["GET", "POST"],
    // allowedHeaders: ["my-custom-header"],
    // credentials: true
  },
});

server.listen(port);

//
class MySocket {
  constructor(socket = new Socket()) {
    this.room = rooms[0];
    this.user = users[0];

    this.socket = socket;
    this.user = null;
    this.room = null;
    this.is_player = false;

    this.sendUsersNotLogin();
    this.onLogin();
    this.onLogout();
    this.onDisconnect();
  }

  //

  sendUsersNotLogin = () => {
    this.socket.on(SOCKET_EVENTS.USERS_NOT_LOG, () => {
      const setIdUser = new Set();
      users.forEach((item) => {
        setIdUser.add(item.id);
      });
      const arr_id_user_not_log = auth_users
        .filter((item) => !setIdUser.has(item.id))
        .map((item) => item.id);
      io.emit(SOCKET_EVENTS.USERS_NOT_LOG, arr_id_user_not_log);
    });
  };

  // ------ Log

  handleRegisterFail = (reason = "") => {
    io.to(`${this.socket.id}`).emit(SOCKET_EVENTS.REGISTER_FAIL, reason);
  };

  handleAfterLogin = () => {
    io.to(`${this.socket.id}`).emit(
      SOCKET_EVENTS.LOGIN,
      this.user,
      users,
      rooms
    );
    this.socket.broadcast.emit(SOCKET_EVENTS.USER_LOGIN, this.user);

    this.onJoinRoom();
    this.onOutRoom();
  };

  //

  onRegister = () => {
    this.socket.on(
      SOCKET_EVENTS.REGISTER,
      (username = "", password = "", name = "") => {
        const data_user = addAuthUser(
          username,
          password,
          name,
          this.handleRegisterFail
        );
        if (!data_user) {
          return;
        }

        this.user = data_user.user;
        this.handleAfterLogin();
      }
    );
  };

  onLoginSavedAccount = () => {
    this.socket.on(
      SOCKET_EVENTS.LOGIN_SAVED_ACCOUNT,
      (username = "", password = "", name = "") => {
        const new_user = addUser(username, password, name);
        if (!new_user) {
          // io.to(`${this.socket.id}`).emit("login_saved_account_fail");
          return;
        }

        this.user = new_user;
        this.handleAfterLogin();
      }
    );
  };

  onLogin = () => {
    this.socket.on(
      SOCKET_EVENTS.LOGIN,
      (username = "", password = "", name = "") => {
        const new_user = addUser(username, password, name);
        const reason = typeof new_user === "string" ? new_user : "";

        if (reason) {
          io.to(`${this.socket.id}`).emit(SOCKET_EVENTS.LOGIN_FAIL, reason);
          return;
        }

        this.user = new_user;
        this.handleAfterLogin();
      }
    );
  };

  // ------ ROOM

  handleAfterJoinRoom = () => {
    this.onBecomePlayer();
    this.onBecomeViewer();
    this.onChangeIsBonus();

    this.onPlayGame();
    this.onVote();
    this.onPick();
    this.onRestart();
  };

  //

  onJoinRoom = () => {
    this.socket.on(SOCKET_EVENTS.JOIN_ROOM, (id_room = 0) => {
      this.room = rooms[getIxRoom(id_room)];
      addUserToRoom(this.room, this.user.id);
      this.socket.join(id_room);
      // To other users that you join a room
      this.socket.broadcast.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        id_room,
        this.user.id
      );
      // To you when joining a room
      io.to(`${this.socket.id}`).emit(SOCKET_EVENTS.USER_JOIN_ROOM, this.room);
    });

    this.handleAfterJoinRoom();
  };

  onOutRoom = () => {
    this.socket.on(SOCKET_EVENTS.OUT_ROOM, () => {
      removeUserFromRoom(this.room, this.user.id);
      io.emit(SOCKET_EVENTS.OUT_ROOM, this.room.id, this.user.id);
      this.room = null;
      this.is_player = false;
    });
  };

  onBecomePlayer = () => {
    this.socket.on(SOCKET_EVENTS.BECOME_PLAYER, () => {
      viewerToPlayer(this.room, this.user.id);
      this.is_player = true;
      io.emit(SOCKET_EVENTS.BECOME_PLAYER, this.room.id, this.user.id);
    });
  };

  onBecomeViewer = () => {
    this.socket.on(SOCKET_EVENTS.BECOME_VIEWER, () => {
      playerToViewer(this.room, this.user.id);
      this.is_player = false;
      io.emit(SOCKET_EVENTS.BECOME_VIEWER, this.room.id, this.user.id);
    });
  };

  onChangeIsBonus = () => {
    this.socket.on(SOCKET_EVENTS.CHANGE_IS_BONUS, (is_bonus = true) => {
      if (this.room.players[0].id !== this.user.id) {
        return;
      }
      this.room.is_bonus = is_bonus;
      io.in(this.room.id).emit(SOCKET_EVENTS.CHANGE_IS_BONUS, is_bonus);
    });
  };

  // ----- PLAY

  makeIntervalPlayingTime = () => {
    rooms_interval[this.room.id] = setInterval(() => {
      this.room.playing_time -= 1;
      if (this.room.playing_time === 0) {
        this.handlePlayerPickDone();
      }
    }, 1000);
  };

  makeTimeoutRestart = () => {
    rooms_restart_timeout[this.room.id] = setTimeout(() => {
      restartGame(this.room);
      io.in(this.room.id).emit(
        SOCKET_EVENTS.RESTART,
        this.room.id,
        PLAYING_TIME
      );
    }, RESTARTING_TIME * 1000);
  };

  handleAfterPlayGame = () => {
    this.makeIntervalPlayingTime();
  };

  handlePlayerPickDone = () => {
    clearInterval(rooms_interval[this.room.id]);
    rooms_interval[this.room.id] = null;

    const { arr_is_winner, obj_id_score } = handlePickDone(this.room);
    this.makeTimeoutRestart();

    io.emit(
      SOCKET_EVENTS.PICK_DONE,
      this.room.id,
      rooms_pick[this.room.id],
      arr_is_winner,
      obj_id_score
    );
  };

  //

  onPlayGame = () => {
    this.socket.on(SOCKET_EVENTS.PLAY_GAME, () => {
      startPlaying(this.room);
      io.emit(SOCKET_EVENTS.PLAY_GAME, this.room.id);

      this.handleAfterPlayGame();
    });
  };

  onVote = () => {
    this.socket.on(SOCKET_EVENTS.VOTE, (id_be_winner = 0) => {
      // if (!this.room || this.room.playing_state !== "playing") {
      //   return;
      // }

      predictWinner({
        room: this.room,
        id_viewer: this.user.id,
        id_be_winner: id_be_winner,
      });

      io.in(this.room.id).emit(
        SOCKET_EVENTS.VOTE,
        this.room.id,
        this.user.id,
        id_be_winner
      );
    });
  };

  onPick = () => {
    this.socket.on(SOCKET_EVENTS.PICK, (icon_name = "") => {
      pickIconName(this.room, this.user.id, icon_name);
      const is_pick_done = checkIsPickDone(this.room.id);

      if (is_pick_done) {
        this.handlePlayerPickDone();
      } else {
        io.in(this.room.id).emit("pick", this.room.id, this.user.id);
      }
    });
  };

  onRestart = () => {
    this.socket.on(SOCKET_EVENTS.RESTART, () => {
      if (
        this.room.playing_state !== "ending" ||
        this.user.id !== this.room.players[0].id
      ) {
        return;
      }
      clearTimeout(rooms_restart_timeout[this.room.id]);
      rooms_restart_timeout[this.room.id] = null;
      restartGame(this.room);
      io.in(this.room.id).emit(
        SOCKET_EVENTS.RESTART,
        this.room.id,
        PLAYING_TIME
      );
    });
  };

  onDisconnect = () => {
    this.socket.on("disconnect", () => {
      if (!this.user) {
        return;
      }
      if (!this.room) {
        this.onUserDisconnect();
        return;
      }

      if (this.room.playing_state === PLAYING_STATE.WAITING) {
        if (!this.is_player) {
          this.onViewerDisconnect();
        } else {
          this.onPlayerDisconnect();
        }
        return;
      }

      if (this.is_player) {
        this.onGamingPlayerDisconnect();
      } else {
        this.onGamingViewerDisconnect();
      }
    });
  };

  onUserDisconnect = () => {
    removeUser(this.user.id);
    io.emit(SOCKET_EVENTS.USER_DISCONNECT, this.user.id);
  };

  onPlayerDisconnect = () => {
    removePlayer(this.room, this.user.id);
    removeUser(this.user.id);
    io.emit(SOCKET_EVENTS.PLAYER_DISCONNECT, this.room.id, this.user.id);
  };

  onViewerDisconnect = () => {
    removeViewer(this.room, this.user.id);
    removeUser(this.user.id);
    io.emit(SOCKET_EVENTS.VIEWER_DISCONNECT, this.room.id, this.user.id);
  };

  onGamingViewerDisconnect = () => {
    handleGamingViewerOff(this.room, this.user.id);
    removeUser(this.user.id);
    io.emit(SOCKET_EVENTS.GAMING_VIEWER_DISCONNECT, this.room.id, this.user.id);
  };

  onGamingPlayerDisconnect = () => {
    this.makeTimeoutRestart();
    const { arr_is_winner, obj_id_score } = handlePlayingDisconnect(
      this.room,
      this.user.id
    );

    clearInterval(rooms_interval[this.room.id]);
    rooms_interval[this.room.id] = null;
    handleGamingPlayerOff(this.room, this.user.id);
    removeUser(this.user.id);
    io.emit(
      SOCKET_EVENTS.GAMING_PLAYER_DISCONNECT,
      this.room.id,
      rooms_pick[this.room.id],
      this.user.id,
      arr_is_winner,
      obj_id_score
    );
  };

  //

  onLogout = () => {
    this.socket.on(SOCKET_EVENTS.LOGOUT, () => {
      if (this.room && this.room.playing_state === "playing") {
        return;
      }

      if (this.room) {
        removeUserFromRoom(this.room, this.user.id);
        io.emit(SOCKET_EVENTS.ROOMER_LOGOUT, this.room.id, this.user.id);
        return;
      }

      removeUser(this.user.id);
      io.emit(SOCKET_EVENTS.LOGOUT, this.user.id);
    });
  };
}

// -----

io.on("connection", (socket) => {
  new MySocket(socket);
});
