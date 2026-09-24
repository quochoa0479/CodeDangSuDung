package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Review> findByProductId(Long productId);
}
