import { auth_users } from "../data/auth_users.js";
import { users } from "../data/users.js";

//
export const addAuthUser = (
  username = "",
  password = "",
  name = "",
  handleRegisterFail = (reason = "") => {}
) => {
  const new_id = auth_users.length === 0 ? 1 : auth_users.slice(-1)[0].id + 1;

  if (auth_users.find((item) => item.username === username)) {
    handleRegisterFail("username");
    return;
  }
  if (auth_users.find((item) => item.name === name)) {
    handleRegisterFail("name");
    return;
  }

  const user = {
    id: new_id,
    name: name,
    score: 0,
  };
  const auth_user = {
    ...user,
    username: username,
    password: password,
    online: true,
  };
  users.push(user);
  auth_users.push(auth_user);

  return { user, auth_user };
};
