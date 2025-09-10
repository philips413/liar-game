package com.liargame.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "player")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "player_id")
    private Long playerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private GameRoom room;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "nickname", length = 20, nullable = false)
    private String nickname;

    @Column(name = "is_host")
    @Builder.Default
    private Boolean isHost = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 10, nullable = false)
    private PlayerRole role;

    @Column(name = "is_alive")
    @Builder.Default
    private Boolean isAlive = true;

    @Column(name = "order_no")
    private Integer orderNo;

    @Column(name = "card_word", length = 100)
    private String cardWord;

    @Column(name = "joined_at")
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    public enum PlayerRole {
        LIAR, CITIZEN
    }
}