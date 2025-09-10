package com.liargame.domain.repository;

import com.liargame.domain.entity.Vote;
import com.liargame.domain.entity.Round;
import com.liargame.domain.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {
    
    List<Vote> findByRoundRoundIdAndIsFinalVote(Long roundId, Boolean isFinalVote);
    
    @Query("SELECT v FROM Vote v WHERE v.round.roundId = :roundId AND v.isFinalVote = :isFinalVote")
    List<Vote> findByRoundIdAndIsFinalVote(@Param("roundId") Long roundId, @Param("isFinalVote") Boolean isFinalVote);
    
    @Query("SELECT v.target.playerId, COUNT(v) FROM Vote v WHERE v.round.roundId = :roundId AND v.isFinalVote = :isFinalVote GROUP BY v.target.playerId")
    List<Object[]> countVotesByTargetAndRoundId(@Param("roundId") Long roundId, @Param("isFinalVote") Boolean isFinalVote);
    
    Optional<Vote> findByRoundRoundIdAndVoterPlayerIdAndIsFinalVote(Long roundId, Long voterId, Boolean isFinalVote);
    
    boolean existsByRoundRoundIdAndVoterPlayerIdAndIsFinalVote(Long roundId, Long voterId, Boolean isFinalVote);
    
    @Query("SELECT COUNT(v) FROM Vote v WHERE v.round.roundId = :roundId AND v.isFinalVote = :isFinalVote")
    Integer countVotesByRoundIdAndIsFinalVote(@Param("roundId") Long roundId, @Param("isFinalVote") Boolean isFinalVote);
    
    // GamePlayService에서 필요한 메소드들 추가
    Optional<Vote> findByRoundAndVoterAndIsFinalVote(Round round, Player voter, boolean isFinalVote);
    
    List<Vote> findByRoundAndIsFinalVote(Round round, boolean isFinalVote);
    
    long countByRoundAndIsFinalVote(Round round, boolean isFinalVote);
}