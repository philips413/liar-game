package com.liargame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisCacheService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    
    public void setRoomState(String roomCode, Object state) {
        try {
            String key = "room:" + roomCode + ":state";
            redisTemplate.opsForValue().set(key, state, 30, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.error("Error setting room state in Redis: ", e);
        }
    }
    
    public <T> T getRoomState(String roomCode, Class<T> clazz) {
        try {
            String key = "room:" + roomCode + ":state";
            Object value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return objectMapper.convertValue(value, clazz);
            }
        } catch (Exception e) {
            log.error("Error getting room state from Redis: ", e);
        }
        return null;
    }
    
    public void setRoundTimer(String roomCode, int roundIdx, int seconds) {
        try {
            String key = "round:" + roomCode + ":" + roundIdx + ":ttl";
            redisTemplate.opsForValue().set(key, "1", seconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Error setting round timer in Redis: ", e);
        }
    }
    
    public Long getRoundTimer(String roomCode, int roundIdx) {
        try {
            String key = "round:" + roomCode + ":" + roundIdx + ":ttl";
            return redisTemplate.getExpire(key, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Error getting round timer from Redis: ", e);
        }
        return -1L;
    }
    
    public void setSpeakingOrder(String roomCode, int roundIdx, Long[] playerIds) {
        try {
            String key = "order:" + roomCode + ":" + roundIdx;
            redisTemplate.delete(key);
            for (Long playerId : playerIds) {
                redisTemplate.opsForList().rightPush(key, playerId);
            }
            redisTemplate.expire(key, 30, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.error("Error setting speaking order in Redis: ", e);
        }
    }
    
    public Long getCurrentSpeaker(String roomCode, int roundIdx) {
        try {
            String key = "order:" + roomCode + ":" + roundIdx;
            Object value = redisTemplate.opsForList().index(key, 0);
            if (value != null) {
                return Long.valueOf(value.toString());
            }
        } catch (Exception e) {
            log.error("Error getting current speaker from Redis: ", e);
        }
        return null;
    }
    
    public void moveToNextSpeaker(String roomCode, int roundIdx) {
        try {
            String key = "order:" + roomCode + ":" + roundIdx;
            redisTemplate.opsForList().leftPop(key);
        } catch (Exception e) {
            log.error("Error moving to next speaker in Redis: ", e);
        }
    }
    
    public void publishRoomEvent(String roomCode, String event) {
        try {
            String channel = "pubsub:rooms:" + roomCode;
            redisTemplate.convertAndSend(channel, event);
        } catch (Exception e) {
            log.error("Error publishing room event to Redis: ", e);
        }
    }
    
    public void deleteRoomData(String roomCode) {
        try {
            String pattern = "*:" + roomCode + ":*";
            redisTemplate.delete(redisTemplate.keys(pattern));
        } catch (Exception e) {
            log.error("Error deleting room data from Redis: ", e);
        }
    }
}