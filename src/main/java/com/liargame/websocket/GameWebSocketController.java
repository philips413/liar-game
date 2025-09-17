package com.liargame.websocket;

import com.liargame.domain.entity.Player;
import com.liargame.domain.repository.PlayerRepository;
import com.liargame.service.GamePlayService;
import com.liargame.config.WebSocketConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class GameWebSocketController {
    
    private final GamePlayService gamePlayService;
    private final PlayerRepository playerRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    private final WebSocketConfig webSocketConfig;

    @MessageMapping("/rooms/{roomCode}/register")
    public void handleSessionRegister(@DestinationVariable String roomCode,
                                    @Payload Map<String, Object> message,
                                    SimpMessageHeaderAccessor headerAccessor) {
        try {
            Long playerId = Long.valueOf(message.get("playerId").toString());
            String sessionId = headerAccessor.getSessionId();

            if (sessionId != null) {
                webSocketConfig.registerSessionPlayer(sessionId, roomCode, playerId);
                log.info("세션 등록 성공: 방 {}, 플레이어 ID {}, 세션 {}", roomCode, playerId, sessionId);
            }

        } catch (Exception e) {
            log.error("세션 등록 실패: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/rooms/{roomCode}/desc")
    public void handleDescription(@DestinationVariable String roomCode, @Payload Map<String, Object> message) {
        try {
            Long playerId = Long.valueOf(message.get("playerId").toString());
            String text = message.get("text").toString();
            
            gamePlayService.submitDescription(roomCode, playerId, text);
            
            Player player = playerRepository.findById(playerId).orElse(null);
            String nickname = player != null ? player.getNickname() : "Unknown";
            
            GameMessage response = GameMessage.of("DESC_UPDATE", roomCode, playerId, nickname, 
                    Map.of("text", text, "remainSec", 0));
            
            messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, response);
            
        } catch (Exception e) {
            log.error("Error handling description: ", e);
            GameMessage errorResponse = GameMessage.of("ERROR", roomCode, 
                    Map.of("message", e.getMessage()));
            messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, errorResponse);
        }
    }
    
    @MessageMapping("/rooms/{roomCode}/vote")
    public void handleVote(@DestinationVariable String roomCode, @Payload Map<String, Object> message) {
        try {
            Long voterId = Long.valueOf(message.get("voterId").toString());
            Long targetId = Long.valueOf(message.get("targetId").toString());
            Boolean isFinalVote = Boolean.valueOf(message.getOrDefault("isFinalVote", false).toString());
            
            gamePlayService.submitVote(roomCode, voterId, targetId, isFinalVote);
            
            Player voter = playerRepository.findById(voterId).orElse(null);
            Player target = playerRepository.findById(targetId).orElse(null);
            
            GameMessage response = GameMessage.of("VOTE_UPDATE", roomCode, voterId, 
                    voter != null ? voter.getNickname() : "Unknown",
                    Map.of("targetId", targetId, 
                           "targetNickname", target != null ? target.getNickname() : "Unknown",
                           "isFinalVote", isFinalVote));
            
            messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, response);
            
        } catch (Exception e) {
            log.error("Error handling vote: ", e);
            GameMessage errorResponse = GameMessage.of("ERROR", roomCode, 
                    Map.of("message", e.getMessage()));
            messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, errorResponse);
        }
    }
    
    @MessageMapping("/rooms/{roomCode}/final-defense")
    public void handleFinalDefense(@DestinationVariable String roomCode, @Payload Map<String, Object> message) {
        try {
            Long playerId = Long.valueOf(message.get("playerId").toString());
            String text = message.get("text").toString();
            
            gamePlayService.submitFinalDefense(roomCode, playerId, text);
            
            Player player = playerRepository.findById(playerId).orElse(null);
            String nickname = player != null ? player.getNickname() : "Unknown";
            
            GameMessage response = GameMessage.of("FINAL_DEFENSE_UPDATE", roomCode, playerId, nickname,
                    Map.of("text", text));
            
            messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, response);
            
        } catch (Exception e) {
            log.error("Error handling final defense: ", e);
            GameMessage errorResponse = GameMessage.of("ERROR", roomCode, 
                    Map.of("message", e.getMessage()));
            messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, errorResponse);
        }
    }
    
    public void broadcastRoundStateChange(String roomCode, String state, Object data) {
        GameMessage message = GameMessage.of("ROUND_STATE", roomCode, 
                Map.of("state", state, "data", data));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    public void broadcastGameEnd(String roomCode, String winner, String reason) {
        GameMessage message = GameMessage.of("GAME_END", roomCode, 
                Map.of("winner", winner, "reason", reason));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
}