package com.liargame.controller;

import com.liargame.service.GamePlayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms/{roomCode}/actions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GameActionController {
    
    private final GamePlayService gamePlayService;

    @PostMapping("/allow-more-descriptions")
    public ResponseEntity<Map<String, String>> allowMoreDescriptions(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        try {
            gamePlayService.allowMoreDescriptions(roomCode, hostId);
            return ResponseEntity.ok(Map.of("message", "추가 설명이 허용되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/start-voting")
    public ResponseEntity<Map<String, String>> startVoting(@PathVariable String roomCode) {
        try {
            gamePlayService.startVoting(roomCode);
            return ResponseEntity.ok(Map.of("message", "투표가 시작되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/start-final-voting")
    public ResponseEntity<Map<String, String>> startFinalVoting(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        try {
            gamePlayService.startFinalVoting(roomCode, hostId);
            return ResponseEntity.ok(Map.of("message", "재투표가 시작되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/final-vote")
    public ResponseEntity<Map<String, String>> submitFinalVote(
            @PathVariable String roomCode,
            @RequestParam String playerId,
            @RequestParam String decision
    ) {
        try {
            gamePlayService.submitFinalVote(roomCode, Long.valueOf(playerId), decision);
            return ResponseEntity.ok(Map.of("message", "재투표가 제출되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/proceed-next-round")
    public ResponseEntity<Map<String, String>> proceedNextRound(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        try {
            gamePlayService.proceedNextRound(roomCode, hostId);
            return ResponseEntity.ok(Map.of("message", "다음 라운드가 시작됩니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}