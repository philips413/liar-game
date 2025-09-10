package com.liargame.domain.repository;

import com.liargame.domain.entity.MessageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageLogRepository extends JpaRepository<MessageLog, Long> {
    
    List<MessageLog> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    
    List<MessageLog> findByRoundRoundIdOrderByCreatedAtAsc(Long roundId);
    
    @Query("SELECT m FROM MessageLog m WHERE m.roomId = :roomId AND m.type = :type ORDER BY m.createdAt ASC")
    List<MessageLog> findByRoomIdAndTypeOrderByCreatedAtAsc(@Param("roomId") Long roomId, @Param("type") MessageLog.MessageType type);
    
    @Query("SELECT m FROM MessageLog m WHERE m.round.roundId = :roundId AND m.type = :type ORDER BY m.createdAt ASC")
    List<MessageLog> findByRoundIdAndTypeOrderByCreatedAtAsc(@Param("roundId") Long roundId, @Param("type") MessageLog.MessageType type);
    
    @Query("SELECT COUNT(m) FROM MessageLog m WHERE m.round.roundId = :roundId AND m.type = 'DESC'")
    Integer countDescriptionMessagesByRoundId(@Param("roundId") Long roundId);
}