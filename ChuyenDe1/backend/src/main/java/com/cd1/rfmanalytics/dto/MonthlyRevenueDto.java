package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyRevenueDto {
    private String orderMonth;
    private Long activeCustomers;
    private Long totalOrders;
    private BigDecimal monthlyRevenue;
    private BigDecimal avgOrderValue;
}
