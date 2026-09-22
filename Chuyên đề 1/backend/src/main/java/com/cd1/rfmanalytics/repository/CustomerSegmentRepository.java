package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.CustomerSegment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.query.Procedure;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface CustomerSegmentRepository extends JpaRepository<CustomerSegment, Long> {

    Optional<CustomerSegment> findByCustomerId(Long customerId);

    Page<CustomerSegment> findBySegment(String segment, Pageable pageable);

    @Query("SELECT s.segment AS segment, COUNT(s) AS count, AVG(s.rfmTotal) AS avgScore " +
           "FROM CustomerSegment s GROUP BY s.segment")
    List<Map<String, Object>> countCustomersBySegment();

    @Query(value = "SELECT " +
            "COUNT(*) as totalCustomers, " +
            "SUM(total_purchases) as totalOrders, " +
            "SUM(monetary) as totalRevenue, " +
            "AVG(monetary) as avgSpendPerCustomer " +
            "FROM customer_segments", nativeQuery = true)
    Map<String, Object> getOverallSummary();

    @Query(value = "CALL sp_calculate_rfm()", nativeQuery = true)
    void executeRfmCalculation();
}
