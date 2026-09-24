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
public class ChurnRiskCustomerDto {
    private Long customerId;
    private String customerCode;
    private String fullName;
    private String email;
    private String phone;
    private String segment;
    private Integer recencyDays;
    private Integer frequency;
    private BigDecimal monetary;
    private LocalDateTime lastPurchaseAt;
}
