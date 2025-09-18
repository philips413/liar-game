package com.liargame.domain.repository;

import com.liargame.domain.entity.Player;
import com.liargame.domain.entity.GameRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    
    @Query("SELECT p FROM Player p WHERE p.room.code = :roomCode AND p.leftAt IS NULL")
    List<Player> findByRoomCodeAndLeftAtIsNull(@Param("roomCode") String roomCode);
    
    @Query("SELECT p FROM Player p WHERE p.room.code = :roomCode AND p.isAlive = true AND p.leftAt IS NULL")
    List<Player> findAlivePlayersByRoomCode(@Param("roomCode") String roomCode);
    
    @Query("SELECT COUNT(p) > 0 FROM Player p WHERE p.room.code = :roomCode AND p.nickname = :nickname AND p.leftAt IS NULL")
    boolean existsByRoomCodeAndNicknameAndLeftAtIsNull(@Param("roomCode") String roomCode, @Param("nickname") String nickname);

    @Query("SELECT p FROM Player p WHERE p.room.code = :roomCode AND p.leftAt IS NULL AND p.isAlive = true")
    List<Player> findByRoomCodeAndLeftAtIsNullAndIsAliveTrue(@Param("roomCode") String roomCode);

    // GamePlayService에서 필요한 메소드들 추가
    List<Player> findByRoomAndIsAlive(GameRoom room, boolean isAlive);
    
    Optional<Player> findByRoomAndRole(GameRoom room, Player.PlayerRole role);
    
    // 방 삭제를 위한 메소드 추가
    void deleteByRoomRoomId(Long roomId);
    
}