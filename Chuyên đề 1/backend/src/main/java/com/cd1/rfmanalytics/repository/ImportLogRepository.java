package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.ImportLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImportLogRepository extends JpaRepository<ImportLog, Long> {
    Page<ImportLog> findAllByOrderByStartedAtDesc(Pageable pageable);
}
