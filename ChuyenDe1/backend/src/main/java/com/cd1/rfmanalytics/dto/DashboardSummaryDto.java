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
public class DashboardSummaryDto {
    private Long totalCustomers;
    private Long totalOrders;
    private BigDecimal totalRevenue;
    private BigDecimal avgSpendPerCustomer;
    private Long churnRiskCount;
    private List<Map<String, Object>> segmentDistribution;
    private List<Map<String, Object>> vrfmSummary;
    private List<MonthlyRevenueDto> monthlyTrends;
    private List<CategoryPreferenceDto> topCategoryPreferences;
}
