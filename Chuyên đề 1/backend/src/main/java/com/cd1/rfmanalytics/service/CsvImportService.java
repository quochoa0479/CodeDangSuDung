package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.CsvPreviewDto;
import com.cd1.rfmanalytics.dto.ImportRequestDto;
import com.cd1.rfmanalytics.entity.Customer;
import com.cd1.rfmanalytics.entity.ImportLog;
import com.cd1.rfmanalytics.entity.ImportMapping;
import com.cd1.rfmanalytics.repository.CustomerRepository;
import com.cd1.rfmanalytics.repository.ImportLogRepository;
import com.cd1.rfmanalytics.repository.ImportMappingRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvImportService {

    private final CustomerRepository customerRepository;
    private final ImportLogRepository importLogRepository;
    private final ImportMappingRepository mappingRepository;
    private final ObjectMapper objectMapper;

    // Temporary in-memory cache for uploaded CSV files before mapping confirmation
    private final Map<String, Path> tempFileStorage = new ConcurrentHashMap<>();

    private static final Map<String, List<String>> TARGET_FIELDS = Map.of(
            "customers", List.of("customer_code", "full_name", "email", "phone", "gender", "city"),
            "orders", List.of("order_code", "customer_code", "total_amount", "order_status", "payment_method", "order_date"),
            "user_activity_logs", List.of("customer_code", "action_type", "product_id", "duration_seconds", "device_type", "created_at"),
            "reviews", List.of("customer_code", "product_id", "rating", "comment", "created_at")
    );

    public CsvPreviewDto previewCsv(MultipartFile file, String targetTable) throws IOException, CsvException {
        String fileId = UUID.randomUUID().toString();
        Path tempPath = Files.createTempFile("csv_import_" + fileId, ".csv");
        file.transferTo(tempPath.toFile());
        tempFileStorage.put(fileId, tempPath);

        try (CSVReader reader = new CSVReader(new FileReader(tempPath.toFile()))) {
            List<String[]> allRows = reader.readAll();
            if (allRows.isEmpty()) {
                throw new IllegalArgumentException("CSV file is empty");
            }

            String[] headerArray = allRows.get(0);
            List<String> headers = Arrays.asList(headerArray);

            List<Map<String, String>> sampleRows = new ArrayList<>();
            int maxSamples = Math.min(5, allRows.size() - 1);
            for (int i = 1; i <= maxSamples; i++) {
                String[] row = allRows.get(i);
                Map<String, String> rowMap = new LinkedHashMap<>();
                for (int j = 0; j < headers.size() && j < row.length; j++) {
                    rowMap.put(headers.get(j), row[j]);
                }
                sampleRows.add(rowMap);
            }

            List<String> targetFields = TARGET_FIELDS.getOrDefault(targetTable.toLowerCase(), Collections.emptyList());

            return CsvPreviewDto.builder()
                    .fileId(fileId)
                    .fileName(file.getOriginalFilename())
                    .totalRows(allRows.size() - 1)
                    .headers(headers)
                    .sampleRows(sampleRows)
                    .targetFields(targetFields)
                    .build();
        }
    }

    public ImportLog processImport(ImportRequestDto request) throws IOException, CsvException {
        Path filePath = tempFileStorage.get(request.getFileId());
        if (filePath == null || !Files.exists(filePath)) {
            throw new IllegalArgumentException("Uploaded file session expired or not found. Please re-upload.");
        }

        ImportLog logEntry = ImportLog.builder()
                .importType("FULL")
                .source("CSV")
                .tableName(request.getTargetTable())
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .recordsImported(0)
                .recordsUpdated(0)
                .recordsFailed(0)
                .build();
        logEntry = importLogRepository.save(logEntry);

        int imported = 0;
        int failed = 0;

        try (CSVReader reader = new CSVReader(new FileReader(filePath.toFile()))) {
            List<String[]> rows = reader.readAll();
            if (rows.size() > 1) {
                String[] headers = rows.get(0);
                Map<String, Integer> headerIndexMap = new HashMap<>();
                for (int i = 0; i < headers.length; i++) {
                    headerIndexMap.put(headers[i].trim(), i);
                }

                if ("customers".equalsIgnoreCase(request.getTargetTable())) {
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows.get(i);
                        try {
                            String code = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("customer_code"));
                            String name = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("full_name"));
                            String email = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("email"));
                            String phone = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("phone"));
                            String city = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("city"));
                            String gender = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("gender"));

                            if (name == null || name.isBlank()) {
                                name = "Customer " + (code != null ? code : i);
                            }

                            Customer customer = Customer.builder()
                                    .customerCode(code != null ? code : "CUST_" + System.currentTimeMillis() + "_" + i)
                                    .fullName(name)
                                    .email(email != null && !email.isBlank() ? email : "cust" + i + "@example.com")
                                    .phone(phone)
                                    .gender(gender)
                                    .city(city)
                                    .createdAt(LocalDateTime.now())
                                    .build();

                            customerRepository.save(customer);
                            imported++;
                        } catch (Exception ex) {
                            failed++;
                        }
                    }
                }
            }

            logEntry.setStatus("SUCCESS");
            logEntry.setRecordsImported(imported);
            logEntry.setRecordsFailed(failed);
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(logEntry);

            // Optionally save template
            if (request.isSaveAsTemplate() && request.getTemplateName() != null && !request.getTemplateName().isBlank()) {
                saveMapping(request.getTemplateName(), request.getTargetTable(), request.getColumnMapping());
            }

        } catch (Exception e) {
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(e.getMessage());
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(logEntry);
            throw e;
        } finally {
            try {
                Files.deleteIfExists(filePath);
                tempFileStorage.remove(request.getFileId());
            } catch (Exception ignored) {}
        }

        return logEntry;
    }

    public List<ImportMapping> getSavedMappings(String targetTable) {
        return mappingRepository.findByTableTarget(targetTable);
    }

    public ImportMapping saveMapping(String name, String targetTable, Map<String, String> mappingConfig) throws JsonProcessingException {
        ImportMapping mapping = ImportMapping.builder()
                .name(name)
                .tableTarget(targetTable)
                .mappingConfig(objectMapper.writeValueAsString(mappingConfig))
                .createdAt(LocalDateTime.now())
                .build();
        return mappingRepository.save(mapping);
    }

    public Page<ImportLog> getImportHistory(Pageable pageable) {
        return importLogRepository.findAllByOrderByStartedAtDesc(pageable);
    }

    private String getMappedValue(String[] row, Map<String, Integer> headerIndexMap, String csvColumnName) {
        if (csvColumnName == null || !headerIndexMap.containsKey(csvColumnName)) {
            return null;
        }
        int index = headerIndexMap.get(csvColumnName);
        return index < row.length ? row[index].trim() : null;
    }
}
