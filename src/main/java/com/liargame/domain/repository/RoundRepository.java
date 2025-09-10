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
    
    List<Round> findByRoomRoomIdOrderByIdxAsc(Long roomId);
    
    @Query("SELECT r FROM Round r WHERE r.room.code = :roomCode ORDER BY r.idx ASC")
    List<Round> findByRoomCodeOrderByIdxAsc(@Param("roomCode") String roomCode);
    
    @Query("SELECT r FROM Round r WHERE r.room.code = :roomCode AND r.idx = :idx")
    Optional<Round> findByRoomCodeAndIdx(@Param("roomCode") String roomCode, @Param("idx") Integer idx);
    
    Optional<Round> findByRoomAndIdx(GameRoom room, Integer idx);
    
    @Query("SELECT r FROM Round r WHERE r.room.code = :roomCode AND r.state = :state")
    Optional<Round> findByRoomCodeAndState(@Param("roomCode") String roomCode, @Param("state") Round.RoundState state);
    
    @Query("SELECT r FROM Round r WHERE r.room.code = :roomCode ORDER BY r.idx DESC LIMIT 1")
    Optional<Round> findLatestRoundByRoomCode(@Param("roomCode") String roomCode);
    
    @Query("SELECT MAX(r.idx) FROM Round r WHERE r.room.code = :roomCode")
    Optional<Integer> findMaxRoundIdxByRoomCode(@Param("roomCode") String roomCode);
}