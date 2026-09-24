package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.CustomerSegmentDto;
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

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SegmentService {

    private final CustomerSegmentRepository segmentRepository;
    private final SegmentHistoryRepository historyRepository;
    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> getOverview() {
        return segmentRepository.getVrfmSummary();
    }

    public Page<CustomerSegmentDto> getCustomersBySegment(String segment, Pageable pageable) {
        Page<CustomerSegment> page = (segment != null && !segment.isBlank() && !segment.equalsIgnoreCase("ALL"))
                ? segmentRepository.findBySegment(segment, pageable)
                : segmentRepository.findAll(pageable);

        return page.map(this::mapToDto);
    }

    @Transactional
    public void recalculateSegments() {
        log.info("Executing procedure sp_calculate_rfm()...");
        jdbcTemplate.execute("CALL sp_calculate_rfm()");
        log.info("RFM segmentation calculation completed.");
    }

    public Page<SegmentHistory> getHistory(Pageable pageable) {
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
