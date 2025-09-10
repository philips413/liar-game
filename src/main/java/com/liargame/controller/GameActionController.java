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
            @RequestBody Map<String, Object> payload) {
        try {
            Long voterId = Long.valueOf(payload.get("voterId").toString());
            String decision = payload.get("decision").toString();
            
            gamePlayService.submitFinalVote(roomCode, voterId, decision);
            return ResponseEntity.ok(Map.of("message", "재투표가 제출되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/continue-description")
    public ResponseEntity<Map<String, String>> continueDescription(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        try {
            gamePlayService.continueDescription(roomCode, hostId);
            return ResponseEntity.ok(Map.of("message", "설명 단계가 계속됩니다"));
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