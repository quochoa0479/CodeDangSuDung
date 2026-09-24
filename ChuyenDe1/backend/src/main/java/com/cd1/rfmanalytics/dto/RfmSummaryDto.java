package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RfmSummaryDto {
    private long totalCustomers;
    private long totalOrders;
    private BigDecimal totalRevenue;
    private BigDecimal avgSpendPerCustomer;
    private List<Map<String, Object>> segmentDistribution;
}
