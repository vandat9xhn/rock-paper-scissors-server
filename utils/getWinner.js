//
const SCISSORS = "scissors";
const PAPER = "paper";
const ROCK = "rock";
const LIZARD = "lizard";
const SPOCK = "spock";

//
const ICONS3_BEAT = {
  scissors: new Set([PAPER]),
  paper: new Set([ROCK]),
  rock: new Set([SCISSORS]),
};

const ICONS5_BEAT = {
  scissors: new Set([PAPER, LIZARD]),
  paper: new Set([ROCK, SPOCK]),
  rock: new Set([SCISSORS, LIZARD]),
  lizard: new Set([PAPER, SPOCK]),
  spock: new Set([ROCK, SCISSORS]),
};

//
export const getWinner = (player1_icon, player2_icon, is_bonus = true) => {
  if (!player1_icon && !player2_icon) {
    return "no_winner";
  }

  if (!player1_icon) {
    return "player2";
  }

  if (!player2_icon) {
    return "player1";
  }

  const icons_beat = is_bonus ? ICONS5_BEAT : ICONS3_BEAT;
  const obj1 = icons_beat[player1_icon];
  const is_player1_win = obj1.has(player2_icon);
  if (is_player1_win) {
    return "player1";
  }

  const obj2 = icons_beat[player2_icon];
  const is_player2_win = obj2.has(player1_icon);
  if (is_player2_win) {
    return "player2";
  }

  return "";
};

export const getArrIsWinner = (player1_icon, player2_icon, is_bonus = true) => {
  const winner = getWinner(player1_icon, player2_icon, is_bonus);

  if (winner === "no_winner") {
    return [false, false];
  }

  if (winner === "") {
    return [];
  }

  return [winner === "player1", winner === "player2"];
};
