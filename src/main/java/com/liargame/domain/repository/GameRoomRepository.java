package com.liargame.domain.repository;

import com.liargame.domain.entity.GameRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GameRoomRepository extends JpaRepository<GameRoom, Long> {
    
    Optional<GameRoom> findByCode(String code);
    
    List<GameRoom> findByState(GameRoom.RoomState state);
    
    @Query("SELECT r FROM GameRoom r WHERE r.state = :state AND r.createdAt < :expiredBefore")
    List<GameRoom> findExpiredRooms(@Param("state") GameRoom.RoomState state, 
                                   @Param("expiredBefore") LocalDateTime expiredBefore);
    
    @Query("SELECT COUNT(p) FROM Player p WHERE p.room.code = :roomCode AND p.leftAt IS NULL")
    Integer countActivePlayersByRoomCode(@Param("roomCode") String roomCode);
    
    boolean existsByCode(String code);
}