package com.liargame.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ad_event")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ad_event_id")
    private Long adEventId;

    @Column(name = "user_or_pid")
    private Long userOrPid;

    @Column(name = "room_id")
    private Long roomId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ad_type", length = 20)
    private AdType adType;

    @Column(name = "placement", length = 40)
    private String placement;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private AdStatus status;

    @Column(name = "revenue_micros")
    private Long revenueMicros;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum AdType {
        REWARDED, INTERSTITIAL, NATIVE
    }

    public enum AdStatus {
        REQUESTED, FILLED, START, COMPLETE
    }
}