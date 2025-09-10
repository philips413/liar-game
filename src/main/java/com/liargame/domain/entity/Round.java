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
@Table(name = "round", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"room_id", "idx"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Round {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "round_id")
    private Long roundId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private GameRoom room;

    @Column(name = "idx", nullable = false)
    private Integer idx;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", length = 30, nullable = false)
    private RoundState state;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "accused_pid")
    private Long accusedPlayerId;

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Vote> votes = new ArrayList<>();

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MessageLog> messages = new ArrayList<>();

    public enum RoundState {
        READY, DESC, DESC_COMPLETE, VOTE, FINAL_DEFENSE, FINAL_DEFENSE_COMPLETE, FINAL_VOTING, JUDGE, END
    }
}