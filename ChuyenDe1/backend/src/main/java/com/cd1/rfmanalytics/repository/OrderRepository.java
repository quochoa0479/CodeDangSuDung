package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerIdOrderByOrderDateDesc(Long customerId);
    Page<Order> findByCustomerIdOrderByOrderDateDesc(Long customerId, Pageable pageable);
    long countByCustomerId(Long customerId);
}
