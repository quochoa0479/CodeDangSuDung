package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.SegmentHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SegmentHistoryRepository extends JpaRepository<SegmentHistory, Long> {
    List<SegmentHistory> findByCustomerIdOrderByChangedAtDesc(Long customerId);
    Page<SegmentHistory> findAllByOrderByChangedAtDesc(Pageable pageable);
}
