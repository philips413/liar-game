package com.liargame.service;

import com.liargame.domain.dto.*;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GameRoomService {
    
    private final GameRoomRepository gameRoomRepository;
    private final PlayerRepository playerRepository;
    private final ThemeRepository themeRepository;
    private final RoundRepository roundRepository;
    private final VoteRepository voteRepository;
    private final MessageLogRepository messageLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    
    public String createRoom(RoomCreateRequest request) {
        String roomCode = generateRoomCode();
        
        Theme theme = null;
        if (request.getThemeGroup() != null) {
            theme = themeRepository.findRandomActiveThemeByGroup(request.getThemeGroup())
                    .orElse(null);
        }
        if (theme == null) {
            theme = themeRepository.findRandomActiveTheme()
                    .orElseThrow(() -> new RuntimeException("사용 가능한 테마가 없습니다"));
        }
        
        GameRoom room = GameRoom.builder()
                .code(roomCode)
                .maxPlayers(request.getMaxPlayers())
                .roundLimit(request.getRoundLimit())
                .state(GameRoom.RoomState.LOBBY)
                .theme(theme)
                .build();
        
        gameRoomRepository.save(room);
        
        logAudit(room.getRoomId(), null, "ROOM_CREATED", 
                String.format("maxPlayers: %d, roundLimit: %d, theme: %s", 
                        request.getMaxPlayers(), request.getRoundLimit(), theme.getThemeGroup()));
        
        return roomCode;
    }
    
    public Player joinRoom(String roomCode, JoinRoomRequest request) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        log.info("Room {} join attempt: room state = {}", roomCode, room.getState());
        
        if (room.getState() != GameRoom.RoomState.LOBBY) {
            log.warn("Room {} is not in LOBBY state: {}", roomCode, room.getState());
            throw new RuntimeException("게임이 이미 시작되었습니다");
        }
        
        List<Player> activePlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(roomCode);
        log.info("Room {} join attempt: active players = {}, max players = {}", 
                roomCode, activePlayers.size(), room.getMaxPlayers());
        
        if (activePlayers.size() >= room.getMaxPlayers()) {
            log.warn("Room {} is full: {} players (max: {})", 
                    roomCode, activePlayers.size(), room.getMaxPlayers());
            throw new RuntimeException("방이 가득 찼습니다");
        }
        
        if (playerRepository.existsByRoomCodeAndNicknameAndLeftAtIsNull(roomCode, request.getNickname())) {
            throw new RuntimeException("이미 사용 중인 닉네임입니다");
        }
        
        boolean isHost = activePlayers.isEmpty();
        
        Player player = Player.builder()
                .room(room)
                .nickname(request.getNickname())
                .isHost(isHost)
                .role(Player.PlayerRole.CITIZEN)
                .build();
        
        playerRepository.save(player);
        
        logAudit(room.getRoomId(), player.getPlayerId(), "PLAYER_JOINED", 
                String.format("nickname: %s, isHost: %b", request.getNickname(), isHost));
        
        // 웹소켓으로 플레이어 참가 알림
        broadcastPlayerJoined(roomCode, player);
        
        // 모든 플레이어에게 업데이트된 방 상태 브로드캐스트
        broadcastRoomStateUpdate(roomCode);
        
        return player;
    }
    
    public void startGame(String roomCode, Long hostPlayerId) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        Player host = playerRepository.findById(hostPlayerId)
                .orElseThrow(() -> new RuntimeException("플레이어를 찾을 수 없습니다"));
        
        if (!host.getIsHost()) {
            throw new RuntimeException("호스트만 게임을 시작할 수 있습니다");
        }
        
        List<Player> activePlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(roomCode);
        if (activePlayers.size() < 3) {
            throw new RuntimeException("최소 3명 이상의 플레이어가 필요합니다");
        }
        
        room.setState(GameRoom.RoomState.ROUND);
        room.setCurrentRound(1);
        gameRoomRepository.save(room);
        
        startNewRound(room, 1);
        
        logAudit(room.getRoomId(), hostPlayerId, "GAME_STARTED", 
                String.format("players: %d", activePlayers.size()));
        
        // 웹소켓으로 게임 시작 알림
        broadcastGameStarted(roomCode);
    }
    
    private void startNewRound(GameRoom room, Integer roundIdx) {
        // 라운드 중복 생성 방지 - 이미 해당 라운드가 존재하는지 확인
        Optional<Round> existingRound = roundRepository.findByRoomAndIdx(room, roundIdx);
        if (existingRound.isPresent()) {
            // 이미 해당 라운드가 존재하면 생성하지 않고 로그만 기록
            logAudit(room.getRoomId(), null, "ROUND_ALREADY_EXISTS", 
                    String.format("round: %d already exists, skipping creation", roundIdx));
            return;
        }
        
        List<Player> activePlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(room.getCode());
        List<Player> alivePlayers = activePlayers.stream()
                .filter(Player::getIsAlive)
                .collect(Collectors.toList());
        
        if (alivePlayers.size() < 3) {
            endGame(room, "insufficient_players");
            return;
        }
        
        assignRoles(alivePlayers, room.getTheme());
        assignSpeakingOrder(alivePlayers);
        
        Round round = Round.builder()
                .room(room)
                .idx(roundIdx)
                .state(Round.RoundState.DESC)
                .startedAt(LocalDateTime.now())
                .build();
        
        roundRepository.save(round);
        
        // 설명 단계 시작 알림
        GameMessage message = GameMessage.of("DESCRIPTION_PHASE_STARTED", room.getCode(), 
                Map.of("message", "설명 단계가 시작되었습니다", "roundIdx", roundIdx));
        messagingTemplate.convertAndSend("/topic/rooms/" + room.getCode(), message);
        
        logAudit(room.getRoomId(), null, "ROUND_STARTED", 
                String.format("round: %d, alivePlayers: %d", roundIdx, alivePlayers.size()));
    }
    
    private void assignRoles(List<Player> players, Theme theme) {
        Collections.shuffle(players);
        
        String wordA = theme.getWordA();
        String wordB = theme.getWordB();
        String citizenWord = Math.random() > 0.5 ? wordA : wordB;
        
        Player liar = players.get(0);
        liar.setRole(Player.PlayerRole.LIAR);
        liar.setCardWord(null);
        
        for (int i = 1; i < players.size(); i++) {
            Player citizen = players.get(i);
            citizen.setRole(Player.PlayerRole.CITIZEN);
            citizen.setCardWord(citizenWord);
        }
        
        playerRepository.saveAll(players);
    }
    
    private void assignSpeakingOrder(List<Player> players) {
        Collections.shuffle(players);
        for (int i = 0; i < players.size(); i++) {
            players.get(i).setOrderNo(i + 1);
        }
        playerRepository.saveAll(players);
    }
    
    public GameStateResponse getRoomState(String roomCode) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new RuntimeException("방을 찾을 수 없습니다"));
        
        List<Player> players = playerRepository.findByRoomCodeAndLeftAtIsNull(roomCode);
        
        GameStateResponse.GameStateResponseBuilder builder = GameStateResponse.builder()
                .roomCode(roomCode)
                .roomState(room.getState())
                .maxPlayers(room.getMaxPlayers())
                .roundLimit(room.getRoundLimit())
                .currentRound(room.getCurrentRound())
                .themeGroup(room.getTheme() != null ? room.getTheme().getThemeGroup() : null)
                .createdAt(room.getCreatedAt())
                .players(players.stream().map(this::mapToPlayerInfo).collect(Collectors.toList()));
        
        if (room.getState() == GameRoom.RoomState.ROUND) {
            Optional<Round> currentRound = roundRepository.findByRoomCodeAndIdx(roomCode, room.getCurrentRound());
            if (currentRound.isPresent()) {
                Round round = currentRound.get();
                builder.roundState(round.getState())
                        .roundStartedAt(round.getStartedAt())
                        .accusedPlayerId(round.getAccusedPlayerId());
                
                List<Vote> votes = voteRepository.findByRoundRoundIdAndIsFinalVote(
                        round.getRoundId(), round.getState() == Round.RoundState.FINAL_DEFENSE);
                builder.votes(mapToVoteInfos(votes));
                
                List<MessageLog> messages = messageLogRepository.findByRoundRoundIdOrderByCreatedAtAsc(round.getRoundId());
                builder.messages(messages.stream().map(this::mapToMessageInfo).collect(Collectors.toList()));
            }
        }
        
        return builder.build();
    }
    
    private GameStateResponse.PlayerInfo mapToPlayerInfo(Player player) {
        return GameStateResponse.PlayerInfo.builder()
                .playerId(player.getPlayerId())
                .nickname(player.getNickname())
                .isHost(player.getIsHost())
                .isAlive(player.getIsAlive())
                .orderNo(player.getOrderNo())
                .cardWord(player.getCardWord())
                .isCurrentTurn(false)
                .build();
    }
    
    private List<GameStateResponse.VoteInfo> mapToVoteInfos(List<Vote> votes) {
        Map<Long, Long> voteCounts = votes.stream()
                .collect(Collectors.groupingBy(vote -> vote.getTarget().getPlayerId(), 
                        Collectors.counting()));
        
        return voteCounts.entrySet().stream()
                .map(entry -> {
                    Player target = playerRepository.findById(entry.getKey()).orElse(null);
                    return GameStateResponse.VoteInfo.builder()
                            .targetPlayerId(entry.getKey())
                            .targetNickname(target != null ? target.getNickname() : "Unknown")
                            .voteCount(entry.getValue().intValue())
                            .isFinalVote(!votes.isEmpty() && votes.get(0).getIsFinalVote())
                            .build();
                })
                .collect(Collectors.toList());
    }
    
    private GameStateResponse.MessageInfo mapToMessageInfo(MessageLog message) {
        return GameStateResponse.MessageInfo.builder()
                .playerId(message.getPlayer() != null ? message.getPlayer().getPlayerId() : null)
                .nickname(message.getPlayer() != null ? message.getPlayer().getNickname() : null)
                .text(message.getText())
                .summary(message.getSummary())
                .type(message.getType() != null ? message.getType().name() : null)
                .createdAt(message.getCreatedAt())
                .build();
    }
    
    private void endGame(GameRoom room, String reason) {
        room.setState(GameRoom.RoomState.END);
        room.setEndedAt(LocalDateTime.now());
        gameRoomRepository.save(room);
        
        logAudit(room.getRoomId(), null, "GAME_ENDED", 
                String.format("reason: %s", reason));
    }
    
    private String generateRoomCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        Random random = new Random();
        
        do {
            code.setLength(0);
            for (int i = 0; i < 8; i++) {
                code.append(chars.charAt(random.nextInt(chars.length())));
            }
        } while (gameRoomRepository.existsByCode(code.toString()));
        
        return code.toString();
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
    private void broadcastPlayerJoined(String roomCode, Player player) {
        Map<String, Object> playerData = Map.of(
                "playerId", player.getPlayerId(),
                "nickname", player.getNickname(),
                "isHost", player.getIsHost(),
                "isAlive", player.getIsAlive(),
                "orderNo", player.getOrderNo() != null ? player.getOrderNo() : 0
        );
        GameMessage message = GameMessage.of("PLAYER_JOINED", roomCode, Map.of("player", playerData));
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    private void broadcastGameStarted(String roomCode) {
        // 현재 방 상태와 플레이어 정보를 함께 전송
        GameStateResponse roomState = getRoomState(roomCode);
        
        Map<String, Object> gameStartData = Map.of(
                "message", "게임이 시작되었습니다",
                "gameState", roomState,
                "players", roomState.getPlayers() != null ? roomState.getPlayers() : List.of(),
                "roomState", roomState.getRoomState(),
                "currentRound", roomState.getCurrentRound() != null ? roomState.getCurrentRound() : 1
        );
        
        GameMessage message = GameMessage.of("GAME_STARTED", roomCode, gameStartData);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
    
    public void broadcastRoomStateUpdate(String roomCode) {
        GameStateResponse roomState = getRoomState(roomCode);
        GameMessage message = GameMessage.of("ROOM_STATE_UPDATE", roomCode, roomState);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
    }
}