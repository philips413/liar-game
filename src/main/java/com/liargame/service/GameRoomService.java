package com.liargame.service;

import com.liargame.domain.dto.*;
import com.liargame.domain.entity.*;
import com.liargame.domain.repository.*;
import com.liargame.config.WebSocketConfig;
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
                .state(Round.RoundState.READY) // 초기 상태는 READY로 설정, 호스트가 설명 단계 시작 시 DESC로 전환
                .startedAt(LocalDateTime.now())
                .build();
        
        roundRepository.save(round);
        
        // 게임 시작 시에는 설명 단계 시작 알림을 보내지 않음
        // 호스트가 명시적으로 설명 단계를 시작했을 때만 알림 전송
        
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
                .role(player.getRole() != null ? player.getRole().name() : null)
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

    // 게임 종료 후 새로운 방 생성 및 플레이어 이동
    public Map<String, Object> createNewRoomAfterGame(String oldRoomCode) {
        GameRoom oldRoom = gameRoomRepository.findByCode(oldRoomCode)
                .orElseThrow(() -> new RuntimeException("기존 방을 찾을 수 없습니다"));

        // 기존 방의 살아있는 플레이어들 조회
        List<Player> activePlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(oldRoomCode);
        if (activePlayers.isEmpty()) {
            log.warn("새 방 생성 시 활성 플레이어가 없습니다: {}", oldRoomCode);
            return null;
        }

        // 기존 호스트 찾기
        Player oldHost = activePlayers.stream()
                .filter(Player::getIsHost)
                .findFirst()
                .orElse(activePlayers.get(0)); // 호스트가 없으면 첫 번째 플레이어를 호스트로

        // 새로운 방 생성
        String newRoomCode = generateRoomCode();
        GameRoom newRoom = GameRoom.builder()
                .code(newRoomCode)
                .maxPlayers(oldRoom.getMaxPlayers())
                .roundLimit(oldRoom.getRoundLimit())
                .state(GameRoom.RoomState.LOBBY)
                .theme(oldRoom.getTheme()) // 같은 테마 유지
                .build();

        gameRoomRepository.save(newRoom);

        log.info("게임 종료 후 새 방 생성: {} -> {}", oldRoomCode, newRoomCode);

        // 기존 플레이어들을 새 방으로 이동
        Map<Long, Long> playerIdMapping = movePlayersToNewRoom(activePlayers, newRoom, oldHost);

        // 기존 방 정리
        cleanupOldRoom(oldRoom);

        logAudit(newRoom.getRoomId(), oldHost.getPlayerId(), "NEW_ROOM_CREATED_AFTER_GAME",
                String.format("oldRoom: %s, players: %d", oldRoomCode, activePlayers.size()));

        // 새 방 정보와 플레이어 ID 매핑 정보 반환
        Map<String, Object> result = new HashMap<>();
        result.put("newRoomCode", newRoomCode);
        result.put("playerIdMapping", playerIdMapping);

        return result;
    }

    private Map<Long, Long> movePlayersToNewRoom(List<Player> players, GameRoom newRoom, Player originalHost) {
        List<Player> newPlayers = new ArrayList<>();
        Map<Long, Long> playerIdMapping = new HashMap<>(); // oldId -> newId

        for (int i = 0; i < players.size(); i++) {
            Player oldPlayer = players.get(i);
            boolean isHost = oldPlayer.getPlayerId().equals(originalHost.getPlayerId());

            Player newPlayer = Player.builder()
                    .room(newRoom)
                    .nickname(oldPlayer.getNickname())
                    .isHost(isHost)
                    .role(Player.PlayerRole.CITIZEN)
                    .isAlive(true)
                    .build();

            newPlayers.add(newPlayer);
            log.info("플레이어 이동: {} -> {} (호스트: {})",
                    oldPlayer.getNickname(), newRoom.getCode(), isHost);
        }

        playerRepository.saveAll(newPlayers);

        // 저장 후 ID 매핑 생성 (저장된 후에야 새 ID를 알 수 있음)
        for (int i = 0; i < players.size(); i++) {
            Player oldPlayer = players.get(i);
            Player newPlayer = newPlayers.get(i);
            playerIdMapping.put(oldPlayer.getPlayerId(), newPlayer.getPlayerId());
            log.info("플레이어 ID 매핑: {} ({}) -> {} ({})",
                    oldPlayer.getPlayerId(), oldPlayer.getNickname(),
                    newPlayer.getPlayerId(), newPlayer.getNickname());
        }

        log.info("새 방 {}에 {} 명의 플레이어 이동 완료", newRoom.getCode(), newPlayers.size());
        return playerIdMapping;
    }

    private void cleanupOldRoom(GameRoom oldRoom) {
        String oldRoomCode = oldRoom.getCode();
        Long oldRoomId = oldRoom.getRoomId();

        log.info("기존 방 {} 정리 시작", oldRoomCode);

        try {
            // 기존 방의 모든 관련 데이터 삭제
            List<Round> rounds = roundRepository.findByRoomCodeOrderByIdxAsc(oldRoomCode);
            for (Round round : rounds) {
                voteRepository.deleteByRoundRoundId(round.getRoundId());
                messageLogRepository.deleteByRoundRoundId(round.getRoundId());
            }

            roundRepository.deleteByRoomRoomId(oldRoomId);
            messageLogRepository.deleteByRoomId(oldRoomId);
            auditLogRepository.deleteByRoomId(oldRoomId);
            playerRepository.deleteByRoomRoomId(oldRoomId);
            gameRoomRepository.delete(oldRoom);

            log.info("기존 방 {} 정리 완료", oldRoomCode);

        } catch (Exception e) {
            log.error("기존 방 {} 정리 중 오류 발생: {}", oldRoomCode, e.getMessage(), e);
        }
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
    
    public void handlePlayerDisconnection(String roomCode, Long playerId) {
        GameRoom room = gameRoomRepository.findByCode(roomCode)
                .orElse(null);
        
        if (room == null) {
            return;
        }
        
        Player player = playerRepository.findById(playerId)
                .orElse(null);
        
        if (player == null) {
            return;
        }
        
        log.info("플레이어 퇴장 처리 시작: 방 {}, 플레이어 {} (호스트: {}), 방 상태: {}", 
                roomCode, player.getNickname(), player.getIsHost(), room.getState());
        
        // 호스트가 나간 경우 방 전체 삭제 (대기실/게임 중 구분 없이)
        if (player.getIsHost()) {
            log.info("호스트가 퇴장하여 방 {} 즉시 삭제 시작 - 현재 상태: {}", roomCode, room.getState());
            deleteRoomCompletely(room, player);
            return;
        }
        
        // 플레이어 퇴장 처리
        player.setLeftAt(LocalDateTime.now());
        playerRepository.save(player);
        
        // 게임이 진행 중인 경우에만 게임 중단 처리
        if (room.getState() == GameRoom.RoomState.ROUND) {
            List<Player> activePlayers = playerRepository.findByRoomCodeAndLeftAtIsNull(roomCode);
            
            log.info("플레이어 퇴장으로 인한 게임 중단 확인: 방 {}, 남은 플레이어 {}", roomCode, activePlayers.size());
            
            // 진행 중인 라운드 데이터 정리
            cleanupCurrentRoundData(room);
            
            // 게임 중단하고 대기실로 이동
            room.setState(GameRoom.RoomState.LOBBY);
            room.setCurrentRound(null);
            gameRoomRepository.save(room);
            
            // 모든 플레이어 상태 초기화
            resetAllPlayersForLobby(activePlayers);
            
            // 게임 중단 알림 브로드캐스트
            broadcastGameInterrupted(roomCode, player);
            
            logAudit(room.getRoomId(), playerId, "GAME_INTERRUPTED", 
                    String.format("플레이어 %s 퇴장으로 인한 게임 중단", player.getNickname()));
        } else {
            // 대기실에서의 퇴장은 기존 로직 사용
            broadcastPlayerLeft(roomCode, player);
        }
        
        broadcastRoomStateUpdate(roomCode);
    }
    
    private void resetAllPlayersForLobby(List<Player> players) {
        log.info("플레이어 상태 대기실용으로 초기화: {} 명", players.size());
        
        for (Player player : players) {
            player.setRole(Player.PlayerRole.CITIZEN);
            player.setIsAlive(true);
            player.setCardWord(null);
            // orderNo는 null로 설정하지 않고 유지 (새로운 게임 시작 시 다시 설정됨)
        }
        playerRepository.saveAll(players);
        
        log.info("플레이어 상태 초기화 완료");
    }
    
    private void broadcastGameInterrupted(String roomCode, Player leftPlayer) {
        Map<String, Object> interruptData = Map.of(
                "message", "플레이어의 연결이 원활하지 않아 게임을 진행할수 없습니다. 메인화면으로 이동합니다.",
                "leftPlayer", Map.of(
                        "playerId", leftPlayer.getPlayerId(),
                        "nickname", leftPlayer.getNickname()
                )
        );
        GameMessage message = GameMessage.of("GAME_INTERRUPTED", roomCode, interruptData);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
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
    
    private void deleteRoomCompletely(GameRoom room, Player hostPlayer) {
        String roomCode = room.getCode();
        Long roomId = room.getRoomId();
        
        log.info("방 {} 완전 삭제 시작 - 호스트 {} 퇴장으로 인함 (상태: {})", 
                roomCode, hostPlayer.getNickname(), room.getState());
        
        try {
            // 1. 먼저 남은 플레이어들에게 방 삭제 알림 브로드캐스트
            broadcastRoomDeletion(roomCode, hostPlayer);
            
            // 2. 데이터베이스에서 관련 데이터 삭제 (외래키 순서 고려)
            // Vote 데이터 삭제 (Round 참조)
            List<Round> rounds = roundRepository.findByRoomCodeOrderByIdxAsc(roomCode);
            for (Round round : rounds) {
                voteRepository.deleteByRoundRoundId(round.getRoundId());
                messageLogRepository.deleteByRoundRoundId(round.getRoundId());
            }
            
            // Round 데이터 삭제
            roundRepository.deleteByRoomRoomId(roomId);
            
            // MessageLog 데이터 삭제 (Player 참조)
            messageLogRepository.deleteByRoomId(roomId);
            
            // AuditLog 데이터 삭제
            auditLogRepository.deleteByRoomId(roomId);
            
            // Player 데이터 삭제
            playerRepository.deleteByRoomRoomId(roomId);
            
            // GameRoom 데이터 삭제
            gameRoomRepository.delete(room);
            
            logAudit(roomId, hostPlayer.getPlayerId(), "ROOM_DELETED", 
                    String.format("호스트 %s 퇴장으로 인한 방 삭제", hostPlayer.getNickname()));
            
            log.info("방 {} 완전 삭제 완료", roomCode);
            
        } catch (Exception e) {
            log.error("방 {} 삭제 중 오류 발생: {}", roomCode, e.getMessage(), e);
        }
    }
    
    private void broadcastRoomDeletion(String roomCode, Player hostPlayer) {
        Map<String, Object> deletionData = Map.of(
                "message", String.format("호스트 %s님이 나가서 방이 삭제되었습니다. 메인화면으로 이동합니다.", hostPlayer.getNickname()),
                "reason", "HOST_LEFT",
                "hostPlayer", Map.of(
                        "playerId", hostPlayer.getPlayerId(),
                        "nickname", hostPlayer.getNickname()
                )
        );
        
        GameMessage message = GameMessage.of("ROOM_DELETED", roomCode, deletionData);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);
        
        log.info("방 {} 삭제 알림 브로드캐스트 완료", roomCode);
    }

    public boolean assignNewHost(String roomCode, Long leavingHostId) {
      try {
        // 떠나는 호스트를 제외한 생존자 중에서 새 호스트를 선택
        List<Player> alivePlayers = playerRepository.findByRoomCodeAndLeftAtIsNullAndIsAliveTrue(roomCode)
            .stream()
            .filter(player -> !player.getPlayerId().equals(leavingHostId))
            .collect(Collectors.toList());

        if (alivePlayers.isEmpty()) {
          log.warn("새 호스트로 임명할 생존자가 없음: 방 {}", roomCode);
          return false;
        }

        // 가장 먼저 참여한 생존자를 새 호스트로 선택 (playerId 기준)
        Player newHost = alivePlayers.stream()
            .min(Comparator.comparing(Player::getPlayerId))
            .orElse(null);

        if (newHost == null) {
          log.warn("새 호스트 선택 실패: 방 {}", roomCode);
          return false;
        }

        // 새 호스트 권한 부여
        newHost.setIsHost(true);
        playerRepository.save(newHost);

        log.info("새 호스트 임명 완료: 방 {}, 새 호스트 {}", roomCode, newHost.getNickname());

        // 새 호스트 임명 알림 브로드캐스트
        broadcastNewHostAssigned(roomCode, newHost);

        // 새 호스트에게 개인 알림 전송
        sendPersonalHostNotification(newHost);

        // 감사 로그 기록
        GameRoom room = gameRoomRepository.findByCode(roomCode).orElse(null);
        if (room != null) {
          logAudit(room.getRoomId(), newHost.getPlayerId(), "NEW_HOST_ASSIGNED",
              String.format("새 호스트 임명: %s", newHost.getNickname()));
        }

        return true;

      } catch (Exception e) {
        log.error("새 호스트 임명 중 오류 발생: 방 {}, 오류: {}", roomCode, e.getMessage(), e);
        return false;
      }
    }
  private void broadcastNewHostAssigned(String roomCode, Player newHost) {
    Map<String, Object> hostData = Map.of(
        "playerId", newHost.getPlayerId(),
        "nickname", newHost.getNickname(),
        "message", String.format("%s님이 새로운 호스트가 되었습니다.", newHost.getNickname())
    );
    GameMessage message = GameMessage.of("NEW_HOST_ASSIGNED", roomCode, hostData);
    messagingTemplate.convertAndSend("/topic/rooms/" + roomCode, message);

    log.info("새 호스트 임명 알림 브로드캐스트 완료: 방 {}, 새 호스트 {}", roomCode, newHost.getNickname());
  }

  private void sendPersonalHostNotification(Player newHost) {
    try {
      Map<String, Object> personalData = Map.of(
          "title", "🎯 새로운 호스트 임명",
          "message", "축하합니다! 이제 게임 진행을 담당하게 되었습니다.",
          "instructions", "아래 호스트 컨트롤 버튼을 사용하여 게임을 진행해주세요.",
          "isHost", true
      );

      GameMessage personalMessage = GameMessage.of("PERSONAL_HOST_NOTIFICATION",
          newHost.getRoom().getCode(), personalData);

      // 개인 큐로 메시지 전송
      messagingTemplate.convertAndSendToUser(
          newHost.getPlayerId().toString(),
          "/queue/player",
          personalMessage
      );

      log.info("새 호스트 개인 알림 전송 완료: 플레이어 ID {}, 닉네임 {}",
          newHost.getPlayerId(), newHost.getNickname());

    } catch (Exception e) {
      log.error("새 호스트 개인 알림 전송 실패: 플레이어 ID {}, 오류: {}",
          newHost.getPlayerId(), e.getMessage(), e);
    }
  }
    private void cleanupCurrentRoundData(GameRoom room) {
        String roomCode = room.getCode();
        Long roomId = room.getRoomId();
        
        log.info("게임 중단으로 인한 현재 라운드 데이터 정리 시작: 방 {}", roomCode);
        
        try {
            // 현재 라운드의 모든 관련 데이터 삭제
            List<Round> rounds = roundRepository.findByRoomCodeOrderByIdxAsc(roomCode);
            for (Round round : rounds) {
                // 투표 데이터 삭제
                voteRepository.deleteByRoundRoundId(round.getRoundId());
                // 메시지 로그 삭제
                messageLogRepository.deleteByRoundRoundId(round.getRoundId());
            }
            
            // 라운드 데이터 삭제
            roundRepository.deleteByRoomRoomId(roomId);
            
            log.info("라운드 데이터 정리 완료: 방 {}", roomCode);
            
        } catch (Exception e) {
            log.error("라운드 데이터 정리 중 오류 발생: 방 {}, 오류: {}", roomCode, e.getMessage(), e);
        }
    }
}