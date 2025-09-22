package com.liargame.controller;

import com.liargame.domain.dto.*;
import com.liargame.domain.entity.Player;
import com.liargame.service.GameRoomService;
import com.liargame.service.PlayerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GameRoomController {
    
    private final GameRoomService gameRoomService;
    private final PlayerService playerService;
    
    @PostMapping
    public ResponseEntity<Map<String, String>> createRoom(@Valid @RequestBody RoomCreateRequest request) {
        try {
            String roomCode = gameRoomService.createRoom(request);
            return ResponseEntity.ok(Map.of("roomCode", roomCode));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/{code}/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            @PathVariable String code,
            @Valid @RequestBody JoinRoomRequest request) {
        try {
            Player player = gameRoomService.joinRoom(code, request);
            return ResponseEntity.ok(Map.of(
                    "playerId", player.getPlayerId(),
                    "nickname", player.getNickname(),
                    "isHost", player.getIsHost()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/{code}/start")
    public ResponseEntity<Map<String, String>> startGame(
            @PathVariable String code,
            @RequestParam Long hostPlayerId) {
        try {
            gameRoomService.startGame(code, hostPlayerId);
            return ResponseEntity.ok(Map.of("message", "게임이 시작되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/{code}/state")
    public ResponseEntity<?> getRoomState(@PathVariable String code) {
        try {
            GameStateResponse state = gameRoomService.getRoomState(code);
            return ResponseEntity.ok(state);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{code}")
    public ResponseEntity<?> getRoomInfo(@PathVariable String code) {
        try {
            GameStateResponse state = gameRoomService.getRoomState(code);
            return ResponseEntity.ok(state);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{code}/reconnect")
    public ResponseEntity<?> checkReconnectable(
            @PathVariable String code,
            @RequestParam Long playerId) {
        try {
            boolean canReconnect = gameRoomService.canPlayerReconnect(code, playerId);
            if (canReconnect) {
                GameStateResponse state = gameRoomService.getRoomState(code);
                return ResponseEntity.ok(Map.of(
                    "canReconnect", true,
                    "roomState", state
                ));
            } else {
                return ResponseEntity.ok(Map.of("canReconnect", false));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/{code}/leave")
    public ResponseEntity<Map<String, String>> leaveRoom(
            @PathVariable String code,
            @RequestParam String playerId) {
        try {
            playerService.leaveRoom(code, Long.parseLong(playerId));
            return ResponseEntity.ok(Map.of("message", "방을 나갔습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}