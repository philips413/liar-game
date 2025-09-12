package com.liargame.constant;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum GameStatus {

  GAME_STARTED("GAME_STARTED", "개임시작"),
  VOTE("VOTE", "라이어 투표"),
  FINAL_DEFENSE_COMPLETE("FINAL_DEFENSE_COMPLETE", "최후진술"),
  FINAL_VOTE("FINAL_VOTE", "생존/사망 투표"),
  PROCEED_NEXT_ROUND("PROCEED_NEXT_ROUND", "다음라운드");

  private final String code;

  private final String description;


}
