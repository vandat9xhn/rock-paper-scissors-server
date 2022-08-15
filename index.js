import { createServer } from 'http';
import { Server } from 'socket.io';

//
const MAX_PLAYERS = 2;

// ---- DATA
// const users = []
const users = [{ id: 0, name: '' }];
users.splice(0, 1);

const addUser = (name = '') => {
  const new_user = {
    id: users.length === 0 ? 1 : users.slice(-1)[0].id + 1,
    name: name,
  };
  users.push(new_user);
  return new_user;
};

const removeUser = (user_id = 0) => {
  const user_ix = users.findIndex((item) => item.id === user_id);
  if (user_ix >= 0) {
    users.splice(user_ix, 1);
  }
};

// ----- ROOMS
// const rooms = []
const rooms = [
  { id: 1, name: 'Room ', users: [{ id: 0, name: '' }], id_players: [1] },
];
rooms.splice(0, 1);
for (let i = 1; i <= 10; i++) {
  rooms.push({ id: i, name: `Room ${i}`, users: [], id_players: [] });
}

//
const getRoomUserIx = (room_id = 0, user_id = 0) => {
  const room = rooms.find((item) => item.id === room_id);
  if (!room) {
    return;
  }

  const user_ix = users.findIndex((item) => item.id === user_id);
  if (user_ix < 0) {
    return;
  }

  return { room: room, user_ix: user_ix };
};

// JOIN OUT
const addOrRemoveUserInRoom = (room_id = 0, user_id = 0, is_add = true) => {
  //
  const data_room = getRoomUserIx(room_id, user_id);
  if (!data_room) {
    return;
  }

  //
  const { room, user_ix } = data_room;

  if (is_add) {
    room.users.push(users[user_ix]);
  } else {
    // Remove user from users and players of room
    const id_player_ix = room.id_players.findIndex(user_id);
    if (id_player_ix >= 0) {
      room.id_players.splice(user_ix, 1);
    }
    room.users.splice(user_ix, 1);
  }

  return { room: room, user_ix: user_ix };
};

const addUserToRoom = (room_id = 0, user_id = 0) => {
  return addOrRemoveUserInRoom(room_id, user_id, true);
};

const removeUserFromRoom = (room_id = 0, user_id = 0) => {
  return addOrRemoveUserInRoom(room_id, user_id, false);
};

// PLAY VIEW
const becomePlayer = (room_id = 0, user_id = 0) => {
  //
  const data_room = getRoomUserIx(room_id, user_id);
  if (!data_room) {
    return;
  }

  //
  const { room, user_ix } = data_room;

  if (room.id_players.length >= MAX_PLAYERS) {
    return;
  }

  if (room.id_players.includes(user_id)) {
    return;
  }

  room.id_players.push(user_id);

  return user_id;
};

const becomeViewer = (room_id = 0, user_id = 0) => {
  //
  const data_room = getRoomUserIx(room_id, user_id);
  if (!data_room) {
    return;
  }

  //
  const { room, user_ix } = data_room;

  const id_player_ix = room.id_players.findIndex(user_id);
  if (id_player_ix >= 0) {
    room.id_players.splice(user_ix, 1);

    return user_id;
  }
};

// ---- SERVER
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:8000',
    methods: ['GET', 'POST'],
    // allowedHeaders: ["my-custom-header"],
    // credentials: true
  },
});

// ----- SOCKET
io.on('connection', (socket) => {
  socket.on('login', (name = '') => {
    const new_user = addUser(name);
    const user_id = new_user.id;

    const socket_id = socket.id;
    io.to(`${socket_id}`).emit('login', new_user, users, rooms);
    socket.broadcast.emit('user_login', new_user);

    socket.on('join_room', (room_id = 0) => {
      const data_room = addUserToRoom(room_id, user_id);
      if (!data_room) {
        return;
      }

      //  JOIN OUT
      socket.join(room_id);

      // socket.to(`${socket_id}`).emit('join_room', { room: data_room.room });
      socket.to(room_id).emit('join_room', users[data_room.user_ix].id);

      socket.on('out_room', () => {
        removeUserFromRoom(room_id, user_id);
        socket.broadcast.to(room_id).emit('out_room', user_id);
      });

      // PLAY VIEW
      socket.on('become_player', () => {
        const _user_id = becomePlayer(room_id, user_id);
        if (_user_id) {
          socket.to(room_id).emit('become_player', user_id);
        }
      });

      socket.on('become_viewer', () => {
        const _user_id = becomeViewer(room_id, user_id);
        if (_user_id) {
          socket.to(room_id).emit('become_viewer', user_id);
        }
      });
    });

    socket.on('disconnect', () => {
      removeUser(user_id);
    });
  });
});

// ----
httpServer.listen(4000);
