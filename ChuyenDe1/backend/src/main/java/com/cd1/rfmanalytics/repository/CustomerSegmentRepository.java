package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.CustomerSegment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface CustomerSegmentRepository extends JpaRepository<CustomerSegment, Long> {

    Optional<CustomerSegment> findByCustomerId(Long customerId);

    Page<CustomerSegment> findBySegment(String segment, Pageable pageable);

    @Query("SELECT cs FROM CustomerSegment cs WHERE " +
           "(:segment IS NULL OR :segment = '' OR :segment = 'ALL' OR cs.segment = :segment) AND " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           "LOWER(cs.customer.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(cs.customer.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(cs.customer.customerCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "cs.customer.phone LIKE CONCAT('%', :keyword, '%'))")
    Page<CustomerSegment> findBySegmentAndKeyword(
            @org.springframework.data.repository.query.Param("segment") String segment,
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            Pageable pageable);

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

    @Query("SELECT cs.rScore AS rScore, cs.fScore AS fScore, COUNT(cs) AS count " +
           "FROM CustomerSegment cs WHERE cs.rScore IS NOT NULL AND cs.fScore IS NOT NULL " +
           "GROUP BY cs.rScore, cs.fScore")
    List<Map<String, Object>> getRfmMatrix();

    @Query("SELECT cs.rScore AS score, COUNT(cs) AS count FROM CustomerSegment cs WHERE cs.rScore IS NOT NULL GROUP BY cs.rScore ORDER BY cs.rScore")
    List<Map<String, Object>> getRDistribution();

    @Query("SELECT cs.fScore AS score, COUNT(cs) AS count FROM CustomerSegment cs WHERE cs.fScore IS NOT NULL GROUP BY cs.fScore ORDER BY cs.fScore")
    List<Map<String, Object>> getFDistribution();

    @Query("SELECT cs.mScore AS score, COUNT(cs) AS count FROM CustomerSegment cs WHERE cs.mScore IS NOT NULL GROUP BY cs.mScore ORDER BY cs.mScore")
    List<Map<String, Object>> getMDistribution();

    @Query(value = "SELECT * FROM v_rfm_summary ORDER BY total_customers DESC", nativeQuery = true)
    List<Map<String, Object>> getVrfmSummary();

    @Query(value = "CALL sp_calculate_rfm()", nativeQuery = true)
    void executeRfmCalculation();
}
