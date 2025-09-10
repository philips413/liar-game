package com.liargame.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "vote", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"round_id", "voter_pid", "is_final_vote"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vote_id")
    private Long voteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", nullable = false)
    private Round round;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voter_pid", nullable = false)
    private Player voter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_pid", nullable = false)
    private Player target;

    @Column(name = "is_final_vote")
    @Builder.Default
    private Boolean isFinalVote = false;

    @Column(name = "decision", length = 20)
    private String decision; // SURVIVE, ELIMINATE (최후 투표에서만 사용)

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}