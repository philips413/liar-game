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
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.time.LocalDateTime;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    // 세션 ID와 플레이어 정보를 매핑하는 맵
    private final ConcurrentHashMap<String, SessionPlayerInfo> sessionPlayerMap = new ConcurrentHashMap<>();

    // 타임아웃 처리를 위한 스케줄러
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    // 세션 상태 열거형
    public enum SessionStatus {
        CONNECTED, DISCONNECTED, GRACE_PERIOD, REMOVED
    }

    // 세션별 플레이어 정보 저장용 클래스
    private static class SessionPlayerInfo {
        String roomCode;
        Long playerId;
        SessionStatus status;
        LocalDateTime disconnectedAt;
        String lastSessionId;

        SessionPlayerInfo(String roomCode, Long playerId) {
            this.roomCode = roomCode;
            this.playerId = playerId;
            this.status = SessionStatus.CONNECTED;
            this.lastSessionId = null;
        }

        public void markDisconnected(String sessionId) {
            this.status = SessionStatus.GRACE_PERIOD;
            this.disconnectedAt = LocalDateTime.now();
            this.lastSessionId = sessionId;
        }

        public void markReconnected() {
            this.status = SessionStatus.CONNECTED;
            this.disconnectedAt = null;
        }

        public boolean isInGracePeriod() {
            return status == SessionStatus.GRACE_PERIOD &&
                   disconnectedAt != null &&
                   disconnectedAt.plusMinutes(1).isAfter(LocalDateTime.now());
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
            log.info("WebSocket 연결 해제 - 60초 유예 기간 시작: 방 {}, 플레이어 ID {}",
                    playerInfo.roomCode, playerInfo.playerId);

            // 즉시 퇴장하지 않고 유예 기간 설정
            playerInfo.markDisconnected(sessionId);

            // 60초 후 실제 퇴장 처리하는 스케줄 등록
            scheduler.schedule(() -> {
                try {
                    SessionPlayerInfo currentInfo = sessionPlayerMap.get(sessionId);
                    if (currentInfo != null && currentInfo.status == SessionStatus.GRACE_PERIOD) {
                        log.info("유예 기간 만료 - 플레이어 퇴장 처리: 방 {}, 플레이어 ID {}",
                                currentInfo.roomCode, currentInfo.playerId);

                        // 실제 퇴장 이벤트 발행
                        PlayerDisconnectEvent disconnectEvent = new PlayerDisconnectEvent(this,
                            currentInfo.roomCode, currentInfo.playerId, sessionId);
                        eventPublisher.publishEvent(disconnectEvent);

                        // 세션 정보 정리
                        sessionPlayerMap.remove(sessionId);
                    }
                } catch (Exception e) {
                    log.error("유예 기간 만료 후 플레이어 퇴장 처리 중 오류: 세션 {}, 오류: {}",
                            sessionId, e.getMessage());
                    sessionPlayerMap.remove(sessionId);
                }
            }, 60, TimeUnit.SECONDS);

        } else {
            log.info("WebSocket 연결 해제: 세션 {}에 연결된 플레이어 정보 없음", sessionId);
        }
    }
    
    // 세션에 플레이어 정보 등록 (외부에서 호출)
    public void registerSessionPlayer(String sessionId, String roomCode, Long playerId) {
        // 기존에 같은 플레이어가 있는지 확인 (재연결 케이스)
        SessionPlayerInfo existingInfo = findPlayerInfo(roomCode, playerId);

        if (existingInfo != null && existingInfo.isInGracePeriod()) {
            // 재연결: 기존 정보 업데이트
            log.info("플레이어 재연결 감지: 방 {}, 플레이어 ID {}, 새 세션 {}", roomCode, playerId, sessionId);

            // 이전 세션 정보 제거
            if (existingInfo.lastSessionId != null) {
                sessionPlayerMap.remove(existingInfo.lastSessionId);
            }

            // 새 세션으로 등록하고 연결 상태로 변경
            existingInfo.markReconnected();
            sessionPlayerMap.put(sessionId, existingInfo);

            log.info("플레이어 재연결 완료: 세션 {}, 방 {}, 플레이어 ID {}", sessionId, roomCode, playerId);
        } else {
            // 새로운 연결
            sessionPlayerMap.put(sessionId, new SessionPlayerInfo(roomCode, playerId));
            log.info("세션 플레이어 정보 등록: 세션 {}, 방 {}, 플레이어 ID {}", sessionId, roomCode, playerId);
        }
    }

    // 특정 플레이어의 세션 정보 찾기
    private SessionPlayerInfo findPlayerInfo(String roomCode, Long playerId) {
        return sessionPlayerMap.values().stream()
                .filter(info -> info.roomCode.equals(roomCode) && info.playerId.equals(playerId))
                .findFirst()
                .orElse(null);
    }

    // 플레이어가 재연결 가능한 상태인지 확인
    public boolean canPlayerReconnect(String roomCode, Long playerId) {
        SessionPlayerInfo playerInfo = findPlayerInfo(roomCode, playerId);
        return playerInfo != null && playerInfo.isInGracePeriod();
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