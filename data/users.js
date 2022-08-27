import { auth_users } from "./auth_users.js";

//
export const users = auth_users.map((item) => ({
  id: item.id,
  name: item.name,
  score: item.score,
}));

users.splice(0);
