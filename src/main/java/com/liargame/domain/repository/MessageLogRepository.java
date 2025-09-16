package com.liargame.domain.repository;

import com.liargame.domain.entity.MessageLog;
import com.liargame.domain.entity.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageLogRepository extends JpaRepository<MessageLog, Long> {
    
    List<MessageLog> findByRoundRoundIdOrderByCreatedAtAsc(Long roundId);
    
    // 특정 방의 라운드에서 특정 타입의 메시지 개수 조회
    long countByRoomIdAndRoundAndType(Long roomId, Round round, MessageLog.MessageType type);
    
    // 방 삭제를 위한 메소드들 추가
    void deleteByRoundRoundId(Long roundId);
    void deleteByRoomId(Long roomId);

    // 특정 방의 모든 메시지 삭제 (게임 시작 시 채팅 초기화용)
    @Query("DELETE FROM MessageLog m WHERE m.roomId = :roomId")
    void deleteAllByRoomId(@Param("roomId") Long roomId);
}