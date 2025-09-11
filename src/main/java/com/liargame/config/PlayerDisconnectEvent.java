package com.liargame.config;

import org.springframework.context.ApplicationEvent;

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
    
    public String getRoomCode() {
        return roomCode;
    }
    
    public Long getPlayerId() {
        return playerId;
    }
    
    public String getSessionId() {
        return sessionId;
    }
}