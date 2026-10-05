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

        @org.springframework.data.jpa.repository.Query("SELECT c FROM Customer c WHERE " +
                        "(:keyword IS NULL OR :keyword = '' OR " +
                        "LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "c.phone LIKE CONCAT('%', :keyword, '%'))")
        org.springframework.data.domain.Page<Customer> searchCustomers(
                        @org.springframework.data.repository.query.Param("keyword") String keyword,
                        org.springframework.data.domain.Pageable pageable);
}
