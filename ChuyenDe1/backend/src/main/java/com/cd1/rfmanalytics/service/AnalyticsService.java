package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.*;
import com.cd1.rfmanalytics.repository.CustomerSegmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final CustomerSegmentRepository segmentRepository;
    private final JdbcTemplate jdbcTemplate;

    public DashboardSummaryDto getDashboard() {
        Map<String, Object> summary = segmentRepository.getOverallSummary();
        List<Map<String, Object>> distribution = segmentRepository.countCustomersBySegment();
        List<Map<String, Object>> vrfm = segmentRepository.getVrfmSummary();

        long totalCustomers = summary.get("totalCustomers") != null ? ((Number) summary.get("totalCustomers")).longValue() : 0;
        long totalOrders = summary.get("totalOrders") != null ? ((Number) summary.get("totalOrders")).longValue() : 0;
        BigDecimal totalRevenue = summary.get("totalRevenue") != null ? new BigDecimal(summary.get("totalRevenue").toString()) : BigDecimal.ZERO;
        BigDecimal avgSpend = summary.get("avgSpendPerCustomer") != null ? new BigDecimal(summary.get("avgSpendPerCustomer").toString()) : BigDecimal.ZERO;

        Long churnRiskCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM v_churn_risk_customers", Long.class);

        List<MonthlyRevenueDto> monthlyTrends = getMonthlyRevenueTrends();
        List<CategoryPreferenceDto> categoryPreferences = getCategoryPreferences();

        return DashboardSummaryDto.builder()
                .totalCustomers(totalCustomers)
                .totalOrders(totalOrders)
                .totalRevenue(totalRevenue)
                .avgSpendPerCustomer(avgSpend)
                .churnRiskCount(churnRiskCount != null ? churnRiskCount : 0L)
                .segmentDistribution(distribution)
                .vrfmSummary(vrfm)
                .monthlyTrends(monthlyTrends)
                .topCategoryPreferences(categoryPreferences)
                .build();
    }

    public RfmDistributionDto getRfmDistribution() {
        List<Map<String, Object>> rDist = segmentRepository.getRDistribution();
        List<Map<String, Object>> fDist = segmentRepository.getFDistribution();
        List<Map<String, Object>> mDist = segmentRepository.getMDistribution();
        List<Map<String, Object>> matrix = segmentRepository.getRfmMatrix();

        return RfmDistributionDto.builder()
                .rDistribution(rDist)
                .fDistribution(fDist)
                .mDistribution(mDist)
                .heatmapMatrix(matrix)
                .build();
    }

    public List<ChurnRiskCustomerDto> getChurnRiskCustomers() {
        String sql = "SELECT customer_id, customer_code, full_name, email, phone, segment, recency_days, frequency, monetary, last_purchase_at " +
                     "FROM v_churn_risk_customers ORDER BY monetary DESC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Timestamp ts = rs.getTimestamp("last_purchase_at");
            LocalDateTime ldt = ts != null ? ts.toLocalDateTime() : null;
            return ChurnRiskCustomerDto.builder()
                    .customerId(rs.getLong("customer_id"))
                    .customerCode(rs.getString("customer_code"))
                    .fullName(rs.getString("full_name"))
                    .email(rs.getString("email"))
                    .phone(rs.getString("phone"))
                    .segment(rs.getString("segment"))
                    .recencyDays(rs.getInt("recency_days"))
                    .frequency(rs.getInt("frequency"))
                    .monetary(rs.getBigDecimal("monetary"))
                    .lastPurchaseAt(ldt)
                    .build();
        });
    }

    public List<CategoryPreferenceDto> getCategoryPreferences() {
        String sql = "SELECT segment, category_name, total_items_sold, category_revenue " +
                     "FROM v_category_preference ORDER BY category_revenue DESC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> CategoryPreferenceDto.builder()
                .segment(rs.getString("segment"))
                .categoryName(rs.getString("category_name"))
                .totalItemsSold(rs.getLong("total_items_sold"))
                .categoryRevenue(rs.getBigDecimal("category_revenue"))
                .build());
    }

    public List<MonthlyRevenueDto> getMonthlyRevenueTrends() {
        String sql = "SELECT order_month, active_customers, total_orders, monthly_revenue, avg_order_value " +
                     "FROM v_monthly_revenue_cohort ORDER BY order_month ASC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> MonthlyRevenueDto.builder()
                .orderMonth(rs.getString("order_month"))
                .activeCustomers(rs.getLong("active_customers"))
                .totalOrders(rs.getLong("total_orders"))
                .monthlyRevenue(rs.getBigDecimal("monthly_revenue"))
                .avgOrderValue(rs.getBigDecimal("avg_order_value"))
                .build());
    }
}
