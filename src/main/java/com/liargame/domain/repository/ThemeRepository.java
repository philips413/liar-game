package com.liargame.domain.repository;

import com.liargame.domain.entity.Theme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Long> {
    
    List<Theme> findByActiveTrue();
    
    List<Theme> findByThemeGroupAndActiveTrue(String themeGroup);
    
    List<Theme> findByDifficultyAndActiveTrue(Integer difficulty);
    
    @Query("SELECT t FROM Theme t WHERE t.active = true ORDER BY RAND() LIMIT 1")
    Optional<Theme> findRandomActiveTheme();
    
    @Query("SELECT t FROM Theme t WHERE t.themeGroup = :themeGroup AND t.active = true ORDER BY RAND() LIMIT 1")
    Optional<Theme> findRandomActiveThemeByGroup(@Param("themeGroup") String themeGroup);
    
    @Query("SELECT DISTINCT t.themeGroup FROM Theme t WHERE t.active = true")
    List<String> findDistinctActiveThemeGroups();
}