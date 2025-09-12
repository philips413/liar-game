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
public class GamePlayController extends BaseController {
    
    private final GamePlayService gamePlayService;
    
    @PostMapping("/desc")
    public ResponseEntity<Map<String, String>> submitDescription(
        @PathVariable String roomCode,
        @RequestParam String playerId,
        @RequestParam String text
    ) {
        return handleVoidRequest(
            () -> gamePlayService.submitDescription(roomCode, Long.valueOf(playerId), text),
            "설명이 제출되었습니다"
        );
    }
    
    @PostMapping("/vote")
    public ResponseEntity<Map<String, String>> submitVote(
            @PathVariable String roomCode,
            @RequestParam String voterId,
            @RequestParam String targetId,
            @RequestParam(defaultValue = "false") boolean isFinalVote) {
        return handleVoidRequest(
            () -> gamePlayService.submitVote(roomCode, Long.valueOf(voterId), Long.valueOf(targetId), isFinalVote),
            "투표가 완료되었습니다"
        );
    }
    
    @PostMapping("/final-defense")
    public ResponseEntity<Map<String, String>> submitFinalDefense(
            @PathVariable String roomCode,
            @RequestParam String playerId,
            @RequestParam String text) {
        return handleVoidRequest(
            () -> gamePlayService.submitFinalDefense(roomCode, Long.valueOf(playerId), text),
            "최후진술이 제출되었습니다"
        );
    }
}