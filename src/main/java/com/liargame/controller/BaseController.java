package com.liargame.controller;

import org.springframework.http.ResponseEntity;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.function.Supplier;

@Slf4j
public abstract class BaseController {
    
    /**
     * 공통 응답 처리 메서드
     * 예외 발생 시 자동으로 error 응답 반환
     */
    protected ResponseEntity<Map<String, String>> handleRequest(
            Supplier<String> operation, 
            String successMessage) {
        try {
            operation.get();
            return ResponseEntity.ok(Map.of("message", successMessage));
        } catch (Exception e) {
            log.error("Request failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * 실행 결과를 반환하지 않는 작업용
     */
    protected ResponseEntity<Map<String, String>> handleVoidRequest(
            Runnable operation, 
            String successMessage) {
        try {
            operation.run();
            return ResponseEntity.ok(Map.of("message", successMessage));
        } catch (Exception e) {
            log.error("Request failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}