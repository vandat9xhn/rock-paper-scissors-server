import { createServer } from "http";
import { Server, Socket } from "socket.io";

import { PLAYING_TIME, RESTARTING_TIME } from "./constants.js";
import { rooms, rooms_interval, rooms_pick } from "./data/rooms.js";
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

// ----

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:8000",
    methods: ["GET", "POST"],
    // allowedHeaders: ["my-custom-header"],
    // credentials: true
  },
});

//
class MySocket {
  constructor(socket = new Socket()) {
    this.room = rooms[0];
    this.user = users[0];

    this.socket = socket;
    this.user = null;
    this.room = null;

    this.is_player = false;
    this.timeout_restart = null;

    this.onLogin();
    this.onLogout();
    this.onDisconnect();
  }

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
      (username = "", password = "") => {
        const new_user = addUser(username, password);
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
    this.socket.on(SOCKET_EVENTS.LOGIN, (username = "", password = "") => {
      // console.log(username, password);
      const new_user = addUser(username, password);
      if (!new_user) {
        io.to(`${this.socket.id}`).emit(SOCKET_EVENTS.LOGIN_FAIL);
        return;
      }

      this.user = new_user;
      this.handleAfterLogin();
    });
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
    this.socket.on(SOCKET_EVENTS.JOIN_ROOM, (room_id = 0) => {
      const data_room = addUserToRoom(room_id, this.user.id);
      if (!data_room) {
        return;
      }

      this.room = data_room.room;
      this.socket.join(room_id);
      // To other users that you join a room
      this.socket.broadcast.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        room_id,
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
    this.timeout_restart = setTimeout(() => {
      restartGame(this.room);
      io.in(this.room.id).emit(SOCKET_EVENTS.RESTART, this.room.id);
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
      if (!this.room || this.room.playing_state !== "playing") {
        return;
      }

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
      clearTimeout(this.timeout_restart);
      restartGame(this.room);
      io.in(this.room.id).emit(SOCKET_EVENTS.RESTART, this.room.id);
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

      if (this.is_player) {
        if (this.room.playing_state === "playing") {
          this.onPlayingDisconnect();
        } else {
          this.onPlayerDisconnect();
        }
      }
      this.onViewerDisconnect();
    });
  };

  onPlayingDisconnect = () => {
    const { arr_is_winner, obj_id_score } = handlePlayingDisconnect(
      this.room,
      this.user.id
    );
    clearInterval(rooms_interval[this.room.id]);
    rooms_interval[this.room.id] = null
    removePlayer(this.room, this.user.id);
    removeUser(this.user.id);
    io.emit(
      SOCKET_EVENTS.PLAYING_DISCONNECT,
      this.room.id,
      rooms_pick[this.room.id],
      this.user.id,
      arr_is_winner,
      obj_id_score
    );
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

  onUserDisconnect = () => {
    removeUser(this.user.id);
    io.emit(SOCKET_EVENTS.USER_DISCONNECT, this.user.id);
  };

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

httpServer.listen(4000);
