package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityLogDto {
    private Long id;
    private Long customerId;
    private String customerName;
    private String actionType;
    private Long productId;
    private String productName;
    private Long categoryId;
    private String categoryName;
    private String searchKeyword;
    private Integer durationSeconds;
    private String deviceType;
    private LocalDateTime createdAt;
}
