package com.liargame.domain.repository;

import com.liargame.domain.entity.GameRoom;
import com.liargame.domain.entity.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoundRepository extends JpaRepository<Round, Long> {

    @Query("SELECT r FROM Round r WHERE r.room.code = :roomCode ORDER BY r.idx ASC")
    List<Round> findByRoomCodeOrderByIdxAsc(@Param("roomCode") String roomCode);
    
    @Query("SELECT r FROM Round r WHERE r.room.code = :roomCode AND r.idx = :idx")
    Optional<Round> findByRoomCodeAndIdx(@Param("roomCode") String roomCode, @Param("idx") Integer idx);
    
    Optional<Round> findByRoomAndIdx(GameRoom room, Integer idx);
    
    // 방 삭제를 위한 메소드 추가
    void deleteByRoomRoomId(Long roomId);
}