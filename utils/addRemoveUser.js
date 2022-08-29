import { auth_users } from "../data/auth_users.js";
import { users } from "../data/users.js";
import { getIxAuthUser, getIxUser } from "./getIndex.js";

//
export const addUser = (username = "", password = "") => {
  const ix_auth_user = auth_users.findIndex(
    (item) => item.username === username && item.password === password
  );
  if (ix_auth_user < 0) {
    return;
  }

  const auth_user = auth_users[ix_auth_user];
  if (users.find((item) => item.id === auth_user.id)) {
    return;
  }

  const user = {
    id: auth_user.id,
    name: auth_user.name,
    score: auth_user.score,
  };
  users.push(user);

  return user;
};

export const removeUser = (id_user = 0) => {
  const ix_auth_user = getIxAuthUser(id_user);
  const auth_user = auth_users[ix_auth_user];
  auth_user.online = false;

  const ix_user = getIxUser(id_user);
  const user = users.splice(ix_user, 1)[0];

  return user;
};
