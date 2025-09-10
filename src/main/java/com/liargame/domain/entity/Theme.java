package com.liargame.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "theme")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Theme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "theme_id")
    private Long themeId;

    @Column(name = "theme_group", length = 50)
    private String themeGroup;

    @Column(name = "difficulty")
    @Builder.Default
    private Integer difficulty = 1;

    @Column(name = "locale", length = 10)
    @Builder.Default
    private String locale = "ko-KR";

    @Column(name = "age_group", length = 20)
    private String ageGroup;

    @Column(name = "word_a", length = 100, nullable = false)
    private String wordA;

    @Column(name = "word_b", length = 100, nullable = false)
    private String wordB;

    @Column(name = "hint_a", length = 120)
    private String hintA;

    @Column(name = "hint_b", length = 120)
    private String hintB;

    @Column(name = "active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}