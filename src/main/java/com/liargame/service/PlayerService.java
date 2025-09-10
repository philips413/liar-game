package com.liargame.service;

import com.liargame.domain.entity.Player;
import com.liargame.domain.repository.PlayerRepository;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import com.liargame.websocket.GameMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PlayerService {
    
    private final PlayerRepository playerRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    public void leaveRoom(String roomCode, Long playerId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        if (!player.getRoom().getCode().equals(roomCode)) {
            throw new RuntimeException("잘못된 방 코드입니다");
        }
        
        player.setLeftAt(LocalDateTime.now());
        playerRepository.save(player);
        
        // 웹소켓으로 플레이어 퇴장 알림
        broadcastPlayerLeft(roomCode, player);
        
        // 방 상태 업데이트 브로드캐스트
        try {
            GameRoomService gameRoomService = applicationContext.getBean(GameRoomService.class);
            gameRoomService.broadcastRoomStateUpdate(roomCode);
        } catch (Exception e) {
            log.warn("Failed to broadcast room state update after player left: {}", e.getMessage());
        }
        
        log.info("Player {} left room {}", player.getNickname(), roomCode);
    }
    
    private void broadcastPlayerLeft(String roomCode, Player player) {
        Map<String, Object> playerData = Map.of(
                "playerId", player.getPlayerId(),
                "nickname", player.getNickname(),
                "isHost", player.getIsHost(),
                "isAlive", player.getIsAlive(),
                "orderNo", player.getOrderNo() != null ? player.getOrderNo() : 0
        );
        GameMessage message = GameMessage.of("PLAYER_LEFT", roomCode, Map.of("player", playerData));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
}