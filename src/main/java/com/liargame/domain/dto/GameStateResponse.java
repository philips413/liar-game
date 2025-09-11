package com.liargame.domain.dto;

import com.liargame.domain.entity.GameRoom;
import com.liargame.domain.entity.Round;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GameStateResponse {
    private String roomCode;
    private GameRoom.RoomState roomState;
    private Integer maxPlayers;
    private Integer roundLimit;
    private Integer currentRound;
    private String themeGroup;
    private LocalDateTime createdAt;
    
    private Round.RoundState roundState;
    private LocalDateTime roundStartedAt;
    private Integer remainingSeconds;
    private Long accusedPlayerId;
    
    private List<PlayerInfo> players;
    private List<VoteInfo> votes;
    private List<MessageInfo> messages;
    
    @Data
    @Builder
    public static class PlayerInfo {
        private Long playerId;
        private String nickname;
        private Boolean isHost;
        private Boolean isAlive;
        private Integer orderNo;
        private String role;
        private String cardWord;
        private Boolean isCurrentTurn;
    }
    
    @Data
    @Builder
    public static class VoteInfo {
        private Long targetPlayerId;
        private String targetNickname;
        private Integer voteCount;
        private Boolean isFinalVote;
    }
    
    @Data
    @Builder
    public static class MessageInfo {
        private Long playerId;
        private String nickname;
        private String text;
        private String summary;
        private String type;
        private LocalDateTime createdAt;
    }
}