package com.liargame.domain.dto;

import lombok.Data;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Data
public class RoomCreateRequest {
    
    @Min(value = 3, message = "최소 3명 이상 필요합니다")
    @Max(value = 12, message = "최대 12명까지 가능합니다")
    private Integer maxPlayers;
    
    @Min(value = 1, message = "최소 1라운드 이상 필요합니다")
    @Max(value = 5, message = "최대 5라운드까지 가능합니다")
    private Integer roundLimit = 3;
    
    private String themeGroup;
    
    private Integer difficulty;
}