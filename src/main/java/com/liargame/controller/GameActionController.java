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
public class GameActionController extends BaseController {
    
    private final GamePlayService gamePlayService;

    @PostMapping("/allow-more-descriptions")
    public ResponseEntity<Map<String, String>> allowMoreDescriptions(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        return handleVoidRequest(
            () -> gamePlayService.allowMoreDescriptions(roomCode, hostId),
            "추가 설명이 허용되었습니다"
        );
    }

    @PostMapping("/start-voting")
    public ResponseEntity<Map<String, String>> startVoting(@PathVariable String roomCode) {
        return handleVoidRequest(
            () -> gamePlayService.startVoting(roomCode),
            "투표가 시작되었습니다"
        );
    }
    
    @PostMapping("/start-final-voting")
    public ResponseEntity<Map<String, String>> startFinalVoting(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        return handleVoidRequest(
            () -> gamePlayService.startFinalVoting(roomCode, hostId),
            "재투표가 시작되었습니다"
        );
    }
    
    @PostMapping("/final-vote")
    public ResponseEntity<Map<String, String>> submitFinalVote(
            @PathVariable String roomCode,
            @RequestParam String playerId,
            @RequestParam String decision
    ) {
        return handleVoidRequest(
            () -> gamePlayService.submitFinalVote(roomCode, Long.valueOf(playerId), decision),
            "생존/사망 투표가 제출되었습니다"
        );
    }
    
    @PostMapping("/proceed-next-round")
    public ResponseEntity<Map<String, String>> proceedNextRound(
            @PathVariable String roomCode,
            @RequestParam Long hostId) {
        return handleVoidRequest(
            () -> gamePlayService.proceedNextRound(roomCode, hostId),
            "다음 라운드가 시작됩니다"
        );
    }
}