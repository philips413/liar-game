package com.liargame.domain.repository;

import com.liargame.domain.entity.MessageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageLogRepository extends JpaRepository<MessageLog, Long> {
    
    List<MessageLog> findByRoundRoundIdOrderByCreatedAtAsc(Long roundId);
    
    // 방 삭제를 위한 메소드들 추가
    void deleteByRoundRoundId(Long roundId);
    void deleteByRoomId(Long roomId);
}