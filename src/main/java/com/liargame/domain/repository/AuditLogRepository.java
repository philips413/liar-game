package com.liargame.domain.repository;

import com.liargame.domain.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    List<AuditLog> findByRoomIdOrderByCreatedAtDesc(Long roomId);
    
    List<AuditLog> findByPlayerIdOrderByCreatedAtDesc(Long playerId);
    
    @Query("SELECT a FROM AuditLog a WHERE a.roomId = :roomId AND a.action = :action ORDER BY a.createdAt DESC")
    List<AuditLog> findByRoomIdAndActionOrderByCreatedAtDesc(@Param("roomId") Long roomId, @Param("action") String action);
    
    @Query("SELECT a FROM AuditLog a WHERE a.createdAt BETWEEN :startTime AND :endTime ORDER BY a.createdAt DESC")
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(@Param("startTime") LocalDateTime startTime, 
                                                            @Param("endTime") LocalDateTime endTime);
    
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.roomId = :roomId AND a.action = :action")
    Long countByRoomIdAndAction(@Param("roomId") Long roomId, @Param("action") String action);
    
    // 방 삭제를 위한 메소드 추가
    void deleteByRoomId(Long roomId);
}