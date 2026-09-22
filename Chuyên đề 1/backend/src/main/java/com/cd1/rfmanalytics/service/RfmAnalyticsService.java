package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.CustomerSegmentDto;
import com.cd1.rfmanalytics.dto.RfmSummaryDto;
import com.cd1.rfmanalytics.entity.CustomerSegment;
import com.cd1.rfmanalytics.entity.SegmentHistory;
import com.cd1.rfmanalytics.repository.CustomerSegmentRepository;
import com.cd1.rfmanalytics.repository.SegmentHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RfmAnalyticsService {

    private final CustomerSegmentRepository segmentRepository;
    private final SegmentHistoryRepository historyRepository;
    private final JdbcTemplate jdbcTemplate;

    public RfmSummaryDto getSummary() {
        Map<String, Object> summary = segmentRepository.getOverallSummary();
        List<Map<String, Object>> distribution = segmentRepository.countCustomersBySegment();

        long totalCustomers = summary.get("totalCustomers") != null ? ((Number) summary.get("totalCustomers")).longValue() : 0;
        long totalOrders = summary.get("totalOrders") != null ? ((Number) summary.get("totalOrders")).longValue() : 0;
        BigDecimal totalRevenue = summary.get("totalRevenue") != null ? new BigDecimal(summary.get("totalRevenue").toString()) : BigDecimal.ZERO;
        BigDecimal avgSpend = summary.get("avgSpendPerCustomer") != null ? new BigDecimal(summary.get("avgSpendPerCustomer").toString()) : BigDecimal.ZERO;

        return RfmSummaryDto.builder()
                .totalCustomers(totalCustomers)
                .totalOrders(totalOrders)
                .totalRevenue(totalRevenue)
                .avgSpendPerCustomer(avgSpend)
                .segmentDistribution(distribution)
                .build();
    }

    public Page<CustomerSegmentDto> getCustomersBySegment(String segment, Pageable pageable) {
        Page<CustomerSegment> page = (segment != null && !segment.isBlank() && !segment.equalsIgnoreCase("ALL"))
                ? segmentRepository.findBySegment(segment, pageable)
                : segmentRepository.findAll(pageable);

        return page.map(this::mapToDto);
    }

    @Transactional
    public void triggerRfmCalculation() {
        log.info("Triggering stored procedure sp_calculate_rfm()...");
        jdbcTemplate.execute("CALL sp_calculate_rfm()");
        log.info("RFM calculation completed successfully.");
    }

    public Page<SegmentHistory> getSegmentHistory(Pageable pageable) {
        return historyRepository.findAllByOrderByChangedAtDesc(pageable);
    }

    private CustomerSegmentDto mapToDto(CustomerSegment s) {
        return CustomerSegmentDto.builder()
                .id(s.getId())
                .customerId(s.getCustomer().getId())
                .customerCode(s.getCustomer().getCustomerCode())
                .fullName(s.getCustomer().getFullName())
                .email(s.getCustomer().getEmail())
                .phone(s.getCustomer().getPhone())
                .city(s.getCustomer().getCity())
                .recencyDays(s.getRecencyDays())
                .frequency(s.getFrequency())
                .monetary(s.getMonetary())
                .rScore(s.getRScore())
                .fScore(s.getFScore())
                .mScore(s.getMScore())
                .rfmTotal(s.getRfmTotal())
                .segment(s.getSegment())
                .totalViews(s.getTotalViews())
                .totalCartAdds(s.getTotalCartAdds())
                .totalPurchases(s.getTotalPurchases())
                .totalReviews(s.getTotalReviews())
                .avgOrderValue(s.getAvgOrderValue())
                .preferredCategory(s.getPreferredCategory())
                .lastPurchaseAt(s.getLastPurchaseAt())
                .calculatedAt(s.getCalculatedAt())
                .build();
    }
}
