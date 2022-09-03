//
export const auth_users = Array.from({ length: 20 }, (v, k) => k + 1).map(
  (item) => ({
    id: item,
    username: `${item}`,
    password: `${item}`,
    name: `User ${item}`,
    score: 0,
  })
);
