package com.cd1.rfmanalytics.repository;

import com.cd1.rfmanalytics.entity.ImportMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportMappingRepository extends JpaRepository<ImportMapping, Long> {
    List<ImportMapping> findByTableTarget(String tableTarget);
    Optional<ImportMapping> findByName(String name);
}
