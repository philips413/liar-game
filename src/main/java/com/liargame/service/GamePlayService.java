package com.liargame.service;

import com.liargame.domain.entity.*;
import com.liargame.domain.repository.*;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import com.liargame.websocket.GameMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GamePlayService {
    
    private final GameRoomRepository gameRoomRepository;
    private final PlayerRepository playerRepository;
    private final RoundRepository roundRepository;
    private final VoteRepository voteRepository;
    private final MessageLogRepository messageLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    
    public void startDescriptionPhase(String roomCode, Long hostId) {
        // 호스트 권한 확인
        Player host = playerRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        if (!host.getIsHost()) {
            throw new RuntimeException("호스트만 설명 단계를 시작할 수 있습니다");
        }
        
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        if (room.getState() != GameRoom.RoomState.ROUND) {
            throw new RuntimeException("게임이 진행 중이 아닙니다");
        }
        
        // 현재 라운드 확인
        Optional<Round> currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound());
        if (currentRound.isEmpty()) {
            throw new RuntimeException("현재 라운드를 찾을 수 없습니다");
        }
        
        Round round = currentRound.get();
        round.setState(Round.RoundState.DESC);
        roundRepository.save(round);
        
        // 모든 플레이어에게 설명 단계 시작 알림
        GameMessage message = GameMessage.of("DESCRIPTION_PHASE_STARTED", roomCode, 
                Map.of("message", "설명 단계가 시작되었습니다", "roundIdx", room.getCurrentRound()));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
        
        logAudit(room.getRoomId(), hostId, "DESCRIPTION_PHASE_STARTED", 
                String.format("round: %d", room.getCurrentRound()));
    }
    
    public void submitDescription(String roomCode, Long playerId, String description) {
        System.out.println("=== submitDescription 시작 ===");
        System.out.println("roomCode: " + roomCode);
        System.out.println("playerId: " + playerId);
        System.out.println("description: " + description);
        
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        System.out.println("방 찾음: " + room.getRoomId() + ", 상태: " + room.getState() + ", 현재라운드: " + room.getCurrentRound());
        
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        System.out.println("플레이어 찾음: " + player.getNickname() + ", 생존: " + player.getIsAlive());
        
        if (!player.getIsAlive()) {
            throw new RuntimeException("사망한 플레이어는 발언할 수 없습니다");
        }
        
        System.out.println("라운드 조회 시도: roomCode=" + roomCode + ", idx=" + room.getCurrentRound());
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        System.out.println("라운드 찾음: " + currentRound.getRoundId() + ", 상태: " + currentRound.getState());
        
        if (currentRound.getState() != Round.RoundState.DESC) {
            throw new RuntimeException("설명 단계가 아닙니다. 현재 상태: " + currentRound.getState());
        }
        
        MessageLog message = MessageLog.builder()
                .roomId(room.getRoomId())
                .round(currentRound)
                .player(player)
                .type(MessageLog.MessageType.DESC)
                .text(description)
                .summary(generateSummary(description))
                .build();
        
        messageLogRepository.save(message);
        
        logAudit(room.getRoomId(), playerId, "DESC_SUBMIT", description);
        
        checkIfAllDescriptionsSubmitted(room, currentRound);
    }
    
    public void submitVote(String roomCode, Long voterId, Long targetId, boolean isFinalVote) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player voter = playerRepository.findById(voterId)
                .orElseThrow(() -> new RuntimeException("투표자를 찾을 수 없습니다"));
        
        Player target = playerRepository.findById(targetId)
                .orElseThrow(() -> new RuntimeException("대상을 찾을 수 없습니다"));
        
        if (!voter.getIsAlive()) {
            throw new RuntimeException("사망한 플레이어는 투표할 수 없습니다");
        }
        
        if (voterId.equals(targetId)) {
            throw new RuntimeException("자기 자신에게는 투표할 수 없습니다");
        }
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        validateVoteState(currentRound, isFinalVote);
        
        if (voteRepository.existsByRoundRoundIdAndVoterPlayerIdAndIsFinalVote(
                currentRound.getRoundId(), voterId, isFinalVote)) {
            throw new RuntimeException("이미 투표하셨습니다");
        }
        
        Vote vote = Vote.builder()
                .round(currentRound)
                .voter(voter)
                .target(target)
                .isFinalVote(isFinalVote)
                .build();
        
        voteRepository.save(vote);
        
        logAudit(room.getRoomId(), voterId, isFinalVote ? "FINAL_VOTE" : "VOTE", 
                String.format("target: %s", target.getNickname()));
        
        checkVoteCompletion(room, currentRound, isFinalVote);
    }
    
    public void submitFinalDefense(String roomCode, Long playerId, String defense) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        if (currentRound.getState() != Round.RoundState.FINAL_DEFENSE) {
            throw new RuntimeException("최후진술 단계가 아닙니다");
        }
        
        if (!playerId.equals(currentRound.getAccusedPlayerId())) {
            throw new RuntimeException("지목된 플레이어만 최후진술을 할 수 있습니다");
        }
        
        MessageLog message = MessageLog.builder()
                .roomId(room.getRoomId())
                .round(currentRound)
                .player(player)
                .type(MessageLog.MessageType.FINAL_DEFENSE)
                .text(defense)
                .summary(generateSummary(defense))
                .build();
        
        messageLogRepository.save(message);
        
        logAudit(room.getRoomId(), playerId, "FINAL_DEFENSE", defense);
        
        // 최후진술 완료 상태로 전환
        currentRound.setState(Round.RoundState.FINAL_DEFENSE_COMPLETE);
        roundRepository.save(currentRound);
        
        // 브로드캐스트 - 최후진술 완료
        broadcastRoundStateChange(roomCode, "FINAL_DEFENSE_COMPLETE", Map.of(
            "accusedPlayer", Map.of(
                "playerId", player.getPlayerId(),
                "nickname", player.getNickname()
            )
        ));
    }
    
    public void startFinalVoting(String roomCode, Long hostId) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player host = playerRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        if (!host.getIsHost()) {
            throw new RuntimeException("호스트만 재투표를 시작할 수 있습니다");
        }
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        if (currentRound.getState() != Round.RoundState.FINAL_DEFENSE_COMPLETE) {
            throw new RuntimeException("최후진술 완료 상태가 아닙니다");
        }
        
        // 재투표 상태로 전환
        currentRound.setState(Round.RoundState.FINAL_VOTING);
        roundRepository.save(currentRound);
        
        // 브로드캐스트 - 재투표 시작
        Player accused = playerRepository.findById(currentRound.getAccusedPlayerId())
                .orElse(null);
        
        broadcastRoundStateChange(roomCode, "FINAL_VOTING", Map.of(
            "accusedPlayer", Map.of(
                "playerId", accused.getPlayerId(),
                "nickname", accused.getNickname()
            )
        ));
        
        logAudit(room.getRoomId(), hostId, "FINAL_VOTING_START", "Host started final voting");
    }
    
    public void submitFinalVote(String roomCode, Long voterId, String decision) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player voter = playerRepository.findById(voterId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        if (currentRound.getState() != Round.RoundState.FINAL_VOTING) {
            throw new RuntimeException("재투표 단계가 아닙니다");
        }
        
        if (!voter.getIsAlive()) {
            throw new RuntimeException("사망한 플레이어는 투표할 수 없습니다");
        }
        
        // 지목당한 플레이어는 투표할 수 없음
        if (voter.getPlayerId().equals(currentRound.getAccusedPlayerId())) {
            throw new RuntimeException("지목당한 플레이어는 투표할 수 없습니다");
        }
        
        // 중복 투표 검사
        boolean alreadyVoted = voteRepository.findByRoundAndVoterAndIsFinalVote(
            currentRound, voter, true).isPresent();
        
        if (alreadyVoted) {
            throw new RuntimeException("이미 투표하셨습니다");
        }
        
        Player accused = playerRepository.findById(currentRound.getAccusedPlayerId())
                .orElseThrow(() -> new RuntimeException("지목된 플레이어를 찾을 수 없습니다"));
        
        // 투표 저장 (accused를 target으로, decision 필드에 SURVIVE/ELIMINATE 저장)
        Vote vote = Vote.builder()
                .round(currentRound)
                .voter(voter)
                .target(accused) 
                .isFinalVote(true)
                .decision(decision) // SURVIVE 또는 ELIMINATE
                .build();
        
        voteRepository.save(vote);
        
        logAudit(room.getRoomId(), voterId, "FINAL_VOTE", 
                String.format("decision: %s, target: %s", decision, accused.getNickname()));
        
        // 투표할 수 있는 플레이어 수 확인 (생존자 - 지목당한 플레이어)
        List<Player> alivePlayers = playerRepository.findByRoomAndIsAlive(room, true);
        long eligibleVoters = alivePlayers.stream()
                .filter(p -> !p.getPlayerId().equals(currentRound.getAccusedPlayerId()))
                .count();
        long totalVotes = voteRepository.countByRoundAndIsFinalVote(currentRound, true);
        
        if (totalVotes >= eligibleVoters) {
            processFinalVoteResults(room, currentRound);
        }
    }
    
    private void processFinalVoteResults(GameRoom room, Round currentRound) {
        List<Vote> finalVotes = voteRepository.findByRoundAndIsFinalVote(currentRound, true);
        
        long eliminateVotes = finalVotes.stream()
                .filter(vote -> "ELIMINATE".equals(vote.getDecision()))
                .count();
        long surviveVotes = finalVotes.stream()
                .filter(vote -> "SURVIVE".equals(vote.getDecision()))
                .count();
        
        Player accused = playerRepository.findById(currentRound.getAccusedPlayerId())
                .orElseThrow(() -> new RuntimeException("지목된 플레이어를 찾을 수 없습니다"));
        
        Map<String, Object> finalVoteResult = new HashMap<>();
        finalVoteResult.put("eliminateVotes", eliminateVotes);
        finalVoteResult.put("surviveVotes", surviveVotes);
        finalVoteResult.put("accusedId", accused.getPlayerId());
        finalVoteResult.put("accusedName", accused.getNickname());
        
        if (eliminateVotes > surviveVotes) {
            // 사망 결정
            accused.setIsAlive(false);
            playerRepository.save(accused);
            
            finalVoteResult.put("outcome", "eliminated");
            finalVoteResult.put("message", String.format("%s님이 처형되었습니다.", accused.getNickname()));
            
            logAudit(room.getRoomId(), accused.getPlayerId(), "PLAYER_ELIMINATED", 
                    String.format("role: %s", accused.getRole()));
            
            // 게임 종료 조건 확인
            if (accused.getRole() == Player.PlayerRole.LIAR) {
                // 라이어가 처형되면 시민 승리
                endGameWithResult(room, "CITIZENS", accused);
                return;
            }
        } else {
            // 생존 결정
            finalVoteResult.put("outcome", "survived");
            finalVoteResult.put("message", String.format("%s님이 생존했습니다.", accused.getNickname()));
            
            logAudit(room.getRoomId(), accused.getPlayerId(), "PLAYER_SURVIVED", 
                    String.format("role: %s", accused.getRole()));
        }
        
        // 재투표 결과 브로드캐스트
        broadcastVoteResult(room.getCode(), finalVoteResult);
        
        // 라운드 종료 처리
        completeCurrentRound(room, currentRound);
    }
    
    private void completeCurrentRound(GameRoom room, Round currentRound) {
        currentRound.setState(Round.RoundState.END);
        currentRound.setEndedAt(LocalDateTime.now());
        roundRepository.save(currentRound);
        
        // 다음 라운드 시작 또는 게임 종료
        if (room.getCurrentRound() < room.getRoundLimit()) {
            proceedToNextRound(room);
        } else {
            // 모든 라운드 완료 - 라이어가 끝까지 생존
            Player liar = playerRepository.findByRoomAndRole(room, Player.PlayerRole.LIAR)
                    .orElse(null);
            endGameWithResult(room, "LIAR", liar);
        }
    }
    
    private void validateVoteState(Round round, boolean isFinalVote) {
        if (isFinalVote && round.getState() != Round.RoundState.VOTE) {
            throw new RuntimeException("재투표 단계가 아닙니다");
        } else if (!isFinalVote && round.getState() != Round.RoundState.VOTE) {
            throw new RuntimeException("투표 단계가 아닙니다");
        }
    }
    
    private void checkIfAllDescriptionsSubmitted(GameRoom room, Round round) {
        List<Player> alivePlayers = playerRepository.findAlivePlayersByRoomCode(room.getCode());
        Integer submittedCount = messageLogRepository.countDescriptionMessagesByRoundId(round.getRoundId());
        
        if (submittedCount >= alivePlayers.size()) {
            // 모든 설명이 완료되었음을 알림
            broadcastAllDescriptionsComplete(room.getCode());
            // 잠시 후 투표 단계로 전환하지 않고 대기 상태로 설정
            round.setState(Round.RoundState.DESC_COMPLETE);
            roundRepository.save(round);
            
            broadcastRoundStateChange(room.getCode(), "DESC_COMPLETE", 
                Map.of("message", "모든 설명이 완료되었습니다. 투표를 시작하세요."));
        }
    }
    
    public void startVoting(String roomCode) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        if (currentRound.getState() != Round.RoundState.DESC_COMPLETE) {
            throw new RuntimeException("아직 모든 설명이 완료되지 않았습니다");
        }
        
        transitionToVote(currentRound);
        broadcastRoundStateChange(roomCode, "VOTE", 
            Map.of("message", "투표가 시작되었습니다"));
    }
    
    private void checkVoteCompletion(GameRoom room, Round round, boolean isFinalVote) {
        List<Player> alivePlayers = playerRepository.findAlivePlayersByRoomCode(room.getCode());
        Integer voteCount = voteRepository.countVotesByRoundIdAndIsFinalVote(round.getRoundId(), isFinalVote);
        
        if (voteCount >= alivePlayers.size()) {
            if (isFinalVote) {
                processJudgment(room, round);
            } else {
                processInitialVoteResult(room, round);
            }
        }
    }
    
    private void processInitialVoteResult(GameRoom room, Round round) {
        List<Object[]> voteCounts = voteRepository.countVotesByTargetAndRoundId(round.getRoundId(), false);
        
        // 투표 결과를 모든 플레이어에게 표시
        Map<String, Object> voteResult = new HashMap<>();
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (Object[] voteCount : voteCounts) {
            Long targetId = (Long) voteCount[0];
            Long count = (Long) voteCount[1];
            Player target = playerRepository.findById(targetId).orElse(null);
            
            if (target != null) {
                Map<String, Object> result = new HashMap<>();
                result.put("playerId", targetId);
                result.put("playerName", target.getNickname());
                result.put("voteCount", count.intValue());
                results.add(result);
            }
        }
        
        voteResult.put("results", results);
        
        if (voteCounts.isEmpty()) {
            voteResult.put("outcome", "no_votes");
            voteResult.put("message", "투표가 없어 다음 라운드로 진행합니다.");
            broadcastVoteResult(room.getCode(), voteResult);
            proceedToNextRound(room);
            return;
        }
        
        List<Player> alivePlayers = playerRepository.findAlivePlayersByRoomCode(room.getCode());
        int requiredVotes = (alivePlayers.size() / 2) + 1;
        
        Optional<Object[]> majorityVote = voteCounts.stream()
                .filter(vote -> ((Long) vote[1]).intValue() >= requiredVotes)
                .findFirst();
        
        if (majorityVote.isPresent()) {
            Long accusedPlayerId = (Long) majorityVote.get()[0];
            Player accusedPlayer = playerRepository.findById(accusedPlayerId).orElse(null);
            
            voteResult.put("outcome", "accused");
            voteResult.put("accusedId", accusedPlayerId);
            voteResult.put("accusedName", accusedPlayer != null ? accusedPlayer.getNickname() : "Unknown");
            voteResult.put("message", String.format("%s님이 지목되었습니다. 최후진술을 기다립니다.", 
                    accusedPlayer != null ? accusedPlayer.getNickname() : "Unknown"));
            
            round.setAccusedPlayerId(accusedPlayerId);
            round.setState(Round.RoundState.FINAL_DEFENSE);
            roundRepository.save(round);
            
            logAudit(room.getRoomId(), null, "PLAYER_ACCUSED", 
                    String.format("accused: %d, votes: %d", accusedPlayerId, majorityVote.get()[1]));
        } else {
            voteResult.put("outcome", "no_majority");
            voteResult.put("message", "과반수 득표자가 없어 다음 라운드로 진행합니다.");
            proceedToNextRound(room);
        }
        
        broadcastVoteResult(room.getCode(), voteResult);
    }
    
    private void processJudgment(GameRoom room, Round round) {
        List<Object[]> voteCounts = voteRepository.countVotesByTargetAndRoundId(round.getRoundId(), true);
        
        // 최후진술 후 재투표 결과를 모든 플레이어에게 표시
        Map<String, Object> finalVoteResult = new HashMap<>();
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (Object[] voteCount : voteCounts) {
            Long targetId = (Long) voteCount[0];
            Long count = (Long) voteCount[1];
            Player target = playerRepository.findById(targetId).orElse(null);
            
            if (target != null) {
                Map<String, Object> result = new HashMap<>();
                result.put("playerId", targetId);
                result.put("playerName", target.getNickname());
                result.put("voteCount", count.intValue());
                results.add(result);
            }
        }
        
        finalVoteResult.put("results", results);
        finalVoteResult.put("isFinalVote", true);
        
        if (voteCounts.isEmpty()) {
            finalVoteResult.put("outcome", "no_votes");
            finalVoteResult.put("message", "투표가 없어 플레이어가 생존했습니다.");
            broadcastVoteResult(room.getCode(), finalVoteResult);
            proceedToNextRound(room);
            return;
        }
        
        List<Player> alivePlayers = playerRepository.findAlivePlayersByRoomCode(room.getCode());
        int requiredVotes = (alivePlayers.size() / 2) + 1;
        
        Optional<Object[]> majorityVote = voteCounts.stream()
                .filter(vote -> ((Long) vote[1]).intValue() >= requiredVotes)
                .findFirst();
        
        if (majorityVote.isPresent() && majorityVote.get()[0].equals(round.getAccusedPlayerId())) {
            Player accused = playerRepository.findById(round.getAccusedPlayerId())
                    .orElseThrow(() -> new RuntimeException("지목된 플레이어를 찾을 수 없습니다"));
            
            accused.setIsAlive(false);
            playerRepository.save(accused);
            
            finalVoteResult.put("outcome", "eliminated");
            finalVoteResult.put("eliminatedId", accused.getPlayerId());
            finalVoteResult.put("eliminatedName", accused.getNickname());
            finalVoteResult.put("eliminatedRole", accused.getRole().name());
            finalVoteResult.put("message", String.format("%s님이 처형되었습니다.", accused.getNickname()));
            
            logAudit(room.getRoomId(), accused.getPlayerId(), "PLAYER_ELIMINATED", 
                    String.format("role: %s", accused.getRole()));
            
            broadcastVoteResult(room.getCode(), finalVoteResult);
            
            // 게임 종료 조건 확인
            if (accused.getRole() == Player.PlayerRole.LIAR) {
                // 라이어가 처형되면 시민 승리
                endGameWithResult(room, "CITIZENS", accused);
                return;
            } else {
                // 시민이 처형된 경우 게임 계속
                checkRemainingPlayersAndProceed(room);
                return;
            }
        } else {
            // 재투표에서 과반수를 얻지 못하거나 다른 사람이 지목됨
            finalVoteResult.put("outcome", "survived");
            finalVoteResult.put("message", "재투표 결과 플레이어가 생존했습니다.");
            broadcastVoteResult(room.getCode(), finalVoteResult);
            proceedToNextRound(room);
        }
        
        round.setState(Round.RoundState.END);
        round.setEndedAt(LocalDateTime.now());
        roundRepository.save(round);
    }
    
    private void checkRemainingPlayersAndProceed(GameRoom room) {
        List<Player> alivePlayers = playerRepository.findAlivePlayersByRoomCode(room.getCode());
        if (alivePlayers.size() < 3) {
            // 생존 플레이어가 3명 미만이면 라이어 승리
            Player liar = alivePlayers.stream()
                    .filter(p -> p.getRole() == Player.PlayerRole.LIAR)
                    .findFirst()
                    .orElse(null);
            endGameWithResult(room, "LIAR", liar);
        } else {
            proceedToNextRound(room);
        }
    }
    
    private void proceedToNextRound(GameRoom room) {
        if (room.getCurrentRound() >= room.getRoundLimit()) {
            // 모든 라운드 완료 - 라이어 승리
            List<Player> allPlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(room.getCode());
            Player liar = allPlayers.stream()
                    .filter(p -> p.getRole() == Player.PlayerRole.LIAR)
                    .findFirst()
                    .orElse(null);
            endGameWithResult(room, "LIAR", liar);
        } else {
            // 다음 라운드 시작
            room.setCurrentRound(room.getCurrentRound() + 1);
            gameRoomRepository.save(room);
            
            // 3초 후 다음 라운드 시작 알림
            broadcastRoundTransition(room.getCode(), room.getCurrentRound());
            
            // 실제 라운드 시작은 약간의 지연 후 (클라이언트에서 처리)
            try {
                Thread.sleep(3000); // 3초 대기
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            startNewRound(room, room.getCurrentRound());
        }
    }
    
    private void startNewRound(GameRoom room, Integer roundIdx) {
        // 라운드 중복 생성 방지 - 이미 해당 라운드가 존재하는지 확인
        Optional<Round> existingRound = roundRepository.findByRoomAndIdx(room, roundIdx);
        if (existingRound.isPresent()) {
            // 이미 해당 라운드가 존재하면 생성하지 않고 기존 라운드 사용
            logAudit(room.getRoomId(), null, "ROUND_ALREADY_EXISTS", 
                    String.format("round: %d already exists, skipping creation", roundIdx));
            return;
        }
        
        // 새 라운드를 위해 역할과 단어 재배정
        List<Player> alivePlayers = playerRepository.findAlivePlayersByRoomCode(room.getCode());
        reassignRolesAndWords(alivePlayers, room.getTheme());
        
        Round round = Round.builder()
                .room(room)
                .idx(roundIdx)
                .state(Round.RoundState.DESC)
                .startedAt(LocalDateTime.now())
                .build();
        
        roundRepository.save(round);
        
        logAudit(room.getRoomId(), null, "ROUND_STARTED", 
                String.format("round: %d", roundIdx));
        
        // 새 라운드 시작 알림
        broadcastRoundStateChange(room.getCode(), "DESC", 
                Map.of("message", String.format("%d라운드가 시작되었습니다!", roundIdx)));
    }
    
    private void reassignRolesAndWords(List<Player> players, Theme theme) {
        // 역할 재배정
        Collections.shuffle(players);
        
        String wordA = theme.getWordA();
        String wordB = theme.getWordB();
        String citizenWord = Math.random() > 0.5 ? wordA : wordB;
        
        // 모든 플레이어를 시민으로 초기화
        players.forEach(p -> {
            p.setRole(Player.PlayerRole.CITIZEN);
            p.setCardWord(citizenWord);
        });
        
        // 첫 번째 플레이어를 라이어로 설정
        if (!players.isEmpty()) {
            Player liar = players.get(0);
            liar.setRole(Player.PlayerRole.LIAR);
            liar.setCardWord(null);
        }
        
        // 말하기 순서 재배정
        Collections.shuffle(players);
        for (int i = 0; i < players.size(); i++) {
            players.get(i).setOrderNo(i + 1);
        }
        
        playerRepository.saveAll(players);
    }
    
    private void transitionToVote(Round round) {
        round.setState(Round.RoundState.VOTE);
        roundRepository.save(round);
    }
    
    private void endGameWithResult(GameRoom room, String winnerType, Player keyPlayer) {
        room.setState(GameRoom.RoomState.END);
        room.setEndedAt(LocalDateTime.now());
        gameRoomRepository.save(room);
        
        // 모든 플레이어 정보 수집
        List<Player> allPlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(room.getCode());
        Player liar = allPlayers.stream()
                .filter(p -> p.getRole() == Player.PlayerRole.LIAR)
                .findFirst()
                .orElse(keyPlayer);
        
        Map<String, Object> gameEndData = new HashMap<>();
        gameEndData.put("winner", winnerType);
        gameEndData.put("liarId", liar != null ? liar.getPlayerId() : null);
        gameEndData.put("liarName", liar != null ? liar.getNickname() : "Unknown");
        gameEndData.put("totalRounds", room.getCurrentRound());
        gameEndData.put("maxRounds", room.getRoundLimit());
        
        if ("CITIZENS".equals(winnerType)) {
            gameEndData.put("reason", "liar_eliminated");
            gameEndData.put("message", String.format("🎉 시민팀 승리!\n라이어 %s님이 발각되었습니다.", liar != null ? liar.getNickname() : ""));
        } else if ("LIAR".equals(winnerType)) {
            if (room.getCurrentRound() >= room.getRoundLimit()) {
                gameEndData.put("reason", "round_limit_reached");
                gameEndData.put("message", String.format("🎭 라이어 승리!\n%s님이 끝까지 정체를 숨겼습니다.", liar != null ? liar.getNickname() : ""));
            } else {
                gameEndData.put("reason", "insufficient_players");
                gameEndData.put("message", String.format("🎭 라이어 승리!\n시민이 부족해 %s님이 승리했습니다.", liar != null ? liar.getNickname() : ""));
            }
        }
        
        broadcastGameEnd(room.getCode(), gameEndData);
        
        logAudit(room.getRoomId(), null, "GAME_ENDED", 
                String.format("winner: %s, liar: %s", winnerType, liar != null ? liar.getNickname() : "Unknown"));
    }
    
    private String generateSummary(String text) {
        if (text.length() <= 50) {
            return text;
        }
        return text.substring(0, 47) + "...";
    }
    
    private void logAudit(Long roomId, Long playerId, String action, String payload) {
        AuditLog auditLog = AuditLog.builder()
                .roomId(roomId)
                .playerId(playerId)
                .action(action)
                .payload(payload)
                .build();
        auditLogRepository.save(auditLog);
    }
    
    // WebSocket 브로드캐스트 메소드들
    private void broadcastAllDescriptionsComplete(String roomCode) {
        GameMessage message = GameMessage.of("ALL_DESCRIPTIONS_COMPLETE", roomCode, 
                Map.of("message", "모든 설명이 완료되었습니다"));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    private void broadcastRoundStateChange(String roomCode, String state, Object data) {
        GameMessage message = GameMessage.of("ROUND_STATE", roomCode, 
                Map.of("state", state, "data", data));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    private void broadcastVoteResult(String roomCode, Map<String, Object> voteResult) {
        GameMessage message = GameMessage.of("VOTE_RESULT", roomCode, voteResult);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    private void broadcastRoundTransition(String roomCode, int nextRound) {
        GameMessage message = GameMessage.of("ROUND_TRANSITION", roomCode, 
                Map.of("nextRound", nextRound, "message", String.format("잠시 후 %d라운드가 시작됩니다...", nextRound)));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    private void broadcastGameEnd(String roomCode, Map<String, Object> gameEndData) {
        GameMessage message = GameMessage.of("GAME_END", roomCode, gameEndData);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    public void continueDescription(String roomCode, Long hostId) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player host = playerRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        if (!host.getIsHost()) {
            throw new RuntimeException("호스트만 설명 단계를 계속할 수 있습니다");
        }
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        if (currentRound.getState() != Round.RoundState.DESC_COMPLETE) {
            throw new RuntimeException("설명 단계 완료 상태가 아닙니다");
        }
        
        // 설명 단계로 다시 전환
        currentRound.setState(Round.RoundState.DESC);
        roundRepository.save(currentRound);
        
        // 모든 플레이어에게 설명 단계 재시작 알림
        broadcastRoundStateChange(roomCode, "DESC", 
            Map.of("message", "호스트가 설명 단계를 계속하기로 했습니다. 추가 설명을 작성해주세요."));
        
        logAudit(room.getRoomId(), hostId, "CONTINUE_DESCRIPTION", "Host decided to continue description phase");
    }
    
    public void proceedNextRound(String roomCode, Long hostId) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player host = playerRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        if (!host.getIsHost()) {
            throw new RuntimeException("호스트만 다음 라운드를 진행할 수 있습니다");
        }
        
        Round currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound())
                .orElseThrow(() -> new RuntimeException("현재 라운드를 찾을 수 없습니다"));
        
        if (currentRound.getState() != Round.RoundState.END) {
            throw new RuntimeException("라운드가 완료되지 않았습니다");
        }
        
        proceedToNextRound(room);
        
        logAudit(room.getRoomId(), hostId, "PROCEED_NEXT_ROUND", "Host proceeded to next round");
    }
}