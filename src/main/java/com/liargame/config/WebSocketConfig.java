package com.liargame.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.ConcurrentHashMap;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    // 세션 ID와 플레이어 정보를 매핑하는 맵
    private final ConcurrentHashMap<String, SessionPlayerInfo> sessionPlayerMap = new ConcurrentHashMap<>();
    
    // 세션별 플레이어 정보 저장용 클래스
    private static class SessionPlayerInfo {
        String roomCode;
        Long playerId;
        
        SessionPlayerInfo(String roomCode, Long playerId) {
            this.roomCode = roomCode;
            this.playerId = playerId;
        }
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
    
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        String sessionId = event.getMessage().getHeaders().get("simpSessionId").toString();
        log.info("WebSocket 연결 생성: 세션 ID {}", sessionId);
    }
    
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.info("WebSocket 연결 해제 이벤트: 세션 ID {}", sessionId);
        
        // 세션에 연결된 플레이어 정보 조회
        SessionPlayerInfo playerInfo = sessionPlayerMap.get(sessionId);
        
        if (playerInfo != null) {
            log.info("WebSocket 연결 해제로 인한 플레이어 퇴장 처리: 방 {}, 플레이어 ID {}", 
                    playerInfo.roomCode, playerInfo.playerId);
            
            try {
                // 플레이어 퇴장 이벤트 발행 (호스트인 경우 방 삭제 포함)
                PlayerDisconnectEvent disconnectEvent = new PlayerDisconnectEvent(this, 
                    playerInfo.roomCode, playerInfo.playerId, sessionId);
                eventPublisher.publishEvent(disconnectEvent);
                
                // 세션 정보 정리
                sessionPlayerMap.remove(sessionId);
                
                log.info("WebSocket 연결 해제로 인한 플레이어 퇴장 이벤트 발행 완료: 세션 {}", sessionId);
                
            } catch (Exception e) {
                log.error("WebSocket 연결 해제 시 플레이어 퇴장 이벤트 발행 중 오류: 세션 {}, 오류: {}", 
                        sessionId, e.getMessage());
                // 오류가 발생해도 세션 정보는 정리
                sessionPlayerMap.remove(sessionId);
            }
        } else {
            log.info("WebSocket 연결 해제: 세션 {}에 연결된 플레이어 정보 없음", sessionId);
        }
    }
    
    // 세션에 플레이어 정보 등록 (외부에서 호출)
    public void registerSessionPlayer(String sessionId, String roomCode, Long playerId) {
        sessionPlayerMap.put(sessionId, new SessionPlayerInfo(roomCode, playerId));
        log.info("세션 플레이어 정보 등록: 세션 {}, 방 {}, 플레이어 ID {}", sessionId, roomCode, playerId);
    }
    
    // 세션에서 플레이어 정보 제거 (외부에서 호출)
    public void unregisterSessionPlayer(String sessionId) {
        SessionPlayerInfo removed = sessionPlayerMap.remove(sessionId);
        if (removed != null) {
            log.info("세션 플레이어 정보 제거: 세션 {}, 방 {}, 플레이어 ID {}", 
                    sessionId, removed.roomCode, removed.playerId);
        }
    }
}