package com.liargame.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "game_room")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "code", length = 8, unique = true, nullable = false)
    private String code;

    @Column(name = "max_players", nullable = false)
    private Integer maxPlayers;

    @Column(name = "round_limit", nullable = false)
    @Builder.Default
    private Integer roundLimit = 3;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", length = 20, nullable = false)
    private RoomState state;

    @Column(name = "current_round")
    @Builder.Default
    private Integer currentRound = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "theme_id")
    private Theme theme;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Player> players = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Round> rounds = new ArrayList<>();

    public enum RoomState {
        LOBBY, ROUND, END
    }
}