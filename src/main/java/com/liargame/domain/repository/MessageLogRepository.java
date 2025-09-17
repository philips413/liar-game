package com.liargame.domain.repository;

import com.liargame.domain.entity.MessageLog;
import com.liargame.domain.entity.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageLogRepository extends JpaRepository<MessageLog, Long> {
    
    List<MessageLog> findByRoundRoundIdOrderByCreatedAtAsc(Long roundId);
    
    void deleteByRoundRoundId(Long roundId);

    void deleteByRoomId(Long roomId);

    List<MessageLog> findByRoomIdAndRoundAndType(Long roomId, Round round, MessageLog.MessageType messageType);
}