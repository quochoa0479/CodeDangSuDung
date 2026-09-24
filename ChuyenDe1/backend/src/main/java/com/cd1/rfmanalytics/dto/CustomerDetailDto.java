package com.cd1.rfmanalytics.dto;

import com.cd1.rfmanalytics.entity.SegmentHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDetailDto {
    // Basic Customer Information
    private Long id;
    private String customerCode;
    private String fullName;
    private String email;
    private String phone;
    private String gender;
    private String city;
    private LocalDateTime createdAt;

    // RFM & Segmentation
    private String segment;
    private Integer rScore;
    private Integer fScore;
    private Integer mScore;
    private BigDecimal rfmTotal;
    private Integer recencyDays;
    private Integer frequency;
    private BigDecimal monetary;
    private BigDecimal avgOrderValue;
    private String preferredCategory;
    private LocalDateTime lastPurchaseAt;
    private LocalDateTime lastActiveAt;
    private LocalDateTime calculatedAt;

    // Behavioral Counters
    private Integer totalViews;
    private Integer totalCartAdds;
    private Integer totalPurchases;
    private Integer totalReviews;

    // Linked Records
    private List<OrderDto> recentOrders;
    private List<UserActivityLogDto> recentActivities;
    private List<SegmentHistory> segmentHistory;
}
