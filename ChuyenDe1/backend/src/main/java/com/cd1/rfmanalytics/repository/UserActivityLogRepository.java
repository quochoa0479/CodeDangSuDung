package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    List<UserActivityLog> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Page<UserActivityLog> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    long countByCustomerId(Long customerId);
}
