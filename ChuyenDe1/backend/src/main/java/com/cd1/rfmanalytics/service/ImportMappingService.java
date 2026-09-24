package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.ImportMappingRequestDto;
import com.cd1.rfmanalytics.entity.ImportMapping;
import com.cd1.rfmanalytics.repository.ImportMappingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportMappingService {

    private final ImportMappingRepository mappingRepository;
    private final ObjectMapper objectMapper;

    public List<ImportMapping> getMappings(String targetTable) {
        if (targetTable != null && !targetTable.isBlank() && !targetTable.equalsIgnoreCase("ALL")) {
            return mappingRepository.findByTableTarget(targetTable);
        }
        return mappingRepository.findAll();
    }

    public ImportMapping getMappingById(Long id) {
        return mappingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cấu hình mapping với ID: " + id));
    }

    public ImportMapping saveMapping(ImportMappingRequestDto request) {
        try {
            String jsonConfig = objectMapper.writeValueAsString(request.getMappingConfig());
            ImportMapping mapping = mappingRepository.findByName(request.getName())
                    .orElse(ImportMapping.builder()
                            .name(request.getName())
                            .tableTarget(request.getTableTarget())
                            .createdAt(LocalDateTime.now())
                            .build());

            mapping.setTableTarget(request.getTableTarget());
            mapping.setMappingConfig(jsonConfig);
            mapping.setUpdatedAt(LocalDateTime.now());

            return mappingRepository.save(mapping);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi lưu cấu hình mapping: " + e.getMessage(), e);
        }
    }

    public void deleteMapping(Long id) {
        mappingRepository.deleteById(id);
    }
}
