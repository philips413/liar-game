package com.liargame.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

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
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        log.info("WebSocket 연결 해제 이벤트: {}", event.getSessionId());
        
        // SessionDisconnectEvent에서는 세션 속성을 직접 가져올 수 없으므로
        // 대신 WebSocket 연결 해제를 로깅만 하고, 실제 플레이어 퇴장은 
        // 클라이언트에서 명시적으로 /leave API를 호출하도록 합니다.
        log.info("WebSocket 세션 {} 연결 해제됨", event.getSessionId());
        
        // WebSocket 연결 해제만 로깅하고, 실제 게임 중단 로직은 
        // PlayerService.leaveRoom()에서 처리됩니다.
    }
}