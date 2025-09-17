package com.liargame.config;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class PlayerDisconnectEvent extends ApplicationEvent {
    private final String roomCode;
    private final Long playerId;
    private final String sessionId;

    public PlayerDisconnectEvent(Object source, String roomCode, Long playerId, String sessionId) {
        super(source);
        this.roomCode = roomCode;
        this.playerId = playerId;
        this.sessionId = sessionId;
    }

}