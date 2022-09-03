import { FAIL, HAS_LOGIN, HAS_NAME } from "../constants.js";
import { auth_users } from "../data/auth_users.js";
import { users } from "../data/users.js";
import { getIxUser } from "./getIndex.js";

//
export const addUser = (username = "", password = "", name = "") => {
  const ix_auth_user = auth_users.findIndex(
    (item) => item.username === username && item.password === password
  );
  if (ix_auth_user < 0) {
    return FAIL;
  }

  const auth_user = auth_users[ix_auth_user];
  if (users.find((item) => item.id === auth_user.id)) {
    return HAS_LOGIN;
  }

  const new_name = name.trim() || auth_user.name;

  if (users.find((item) => item.name === new_name)) {
    return HAS_NAME;
  }

  auth_user.name = new_name;

  const user = {
    id: auth_user.id,
    name: new_name,
    score: auth_user.score,
  };
  users.push(user);

  return user;
};

export const removeUser = (id_user = 0) => {
  const ix_user = getIxUser(id_user);
  const user = users.splice(ix_user, 1)[0];

  return user;
};
