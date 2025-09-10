package com.liargame.controller;

import com.liargame.service.GamePlayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms/{roomCode}")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GamePlayController {
    
    private final GamePlayService gamePlayService;
    
    @PostMapping("/desc")
    public ResponseEntity<Map<String, String>> submitDescription(
        @PathVariable String roomCode,
        @RequestParam String playerId,
        @RequestParam String text
    ) {
        try {
            gamePlayService.submitDescription(roomCode, Long.valueOf(playerId), text);
            return ResponseEntity.ok(Map.of("message", "설명이 제출되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/vote")
    public ResponseEntity<Map<String, String>> submitVote(
            @PathVariable String roomCode,
            @RequestParam String voterId,
            @RequestParam String targetId,
            @RequestParam(defaultValue = "false") boolean isFinalVote) {
        try {
            gamePlayService.submitVote(roomCode, Long.valueOf(voterId), Long.valueOf(targetId), isFinalVote);
            return ResponseEntity.ok(Map.of("message", "투표가 완료되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/final-defense")
    public ResponseEntity<Map<String, String>> submitFinalDefense(
            @PathVariable String roomCode,
            @RequestParam Long playerId,
            @RequestBody Map<String, String> request) {
        try {
            String defense = request.get("text");
            gamePlayService.submitFinalDefense(roomCode, playerId, defense);
            return ResponseEntity.ok(Map.of("message", "최후진술이 제출되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}