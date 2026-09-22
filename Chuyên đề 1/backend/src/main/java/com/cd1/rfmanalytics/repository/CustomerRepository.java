package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByCustomerCode(String customerCode);
    Optional<Customer> findByEmail(String email);
    boolean existsByCustomerCode(String customerCode);
}
