package com.liargame.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameMessage {
    private String type;
    private String roomCode;
    private Long playerId;
    private String playerNickname;
    private Object data;
    private LocalDateTime timestamp;
    
    public static GameMessage of(String type, String roomCode, Object data) {
        return GameMessage.builder()
                .type(type)
                .roomCode(roomCode)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    public static GameMessage of(String type, String roomCode, Long playerId, String playerNickname, Object data) {
        return GameMessage.builder()
                .type(type)
                .roomCode(roomCode)
                .playerId(playerId)
                .playerNickname(playerNickname)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }
}