package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerSegmentDto {
    private Long id;
    private Long customerId;
    private String customerCode;
    private String fullName;
    private String email;
    private String phone;
    private String city;

    // RFM Metrics
    private Integer recencyDays;
    private Integer frequency;
    private BigDecimal monetary;

    // RFM Scores (1-5)
    private Integer rScore;
    private Integer fScore;
    private Integer mScore;
    private BigDecimal rfmTotal;
    private String segment;

    // Activity stats
    private Integer totalViews;
    private Integer totalCartAdds;
    private Integer totalPurchases;
    private Integer totalReviews;
    private BigDecimal avgOrderValue;
    private String preferredCategory;
    private LocalDateTime lastPurchaseAt;
    private LocalDateTime calculatedAt;
}
