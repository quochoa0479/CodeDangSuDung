package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.ApiResponse;
import com.cd1.rfmanalytics.dto.CsvPreviewDto;
import com.cd1.rfmanalytics.dto.ImportMappingRequestDto;
import com.cd1.rfmanalytics.dto.ImportRequestDto;
import com.cd1.rfmanalytics.entity.ImportLog;
import com.cd1.rfmanalytics.entity.ImportMapping;
import com.cd1.rfmanalytics.service.CsvImportService;
import com.cd1.rfmanalytics.service.ImportMappingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/import")
@RequiredArgsConstructor
public class ImportController {

    private final CsvImportService csvImportService;
    private final ImportMappingService importMappingService;

    @PostMapping("/preview")
    public ApiResponse<CsvPreviewDto> previewCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "targetTable", defaultValue = "customers") String targetTable) {
        try {
            CsvPreviewDto preview = csvImportService.previewCsv(file, targetTable);
            return ApiResponse.ok("Preview generated successfully", preview);
        } catch (Exception e) {
            return ApiResponse.error("Failed to read file: " + e.getMessage());
        }
    }

    @PostMapping("/execute")
    public ApiResponse<ImportLog> executeImport(@Valid @RequestBody ImportRequestDto request) {
        try {
            ImportLog result = csvImportService.processImport(request);
            return ApiResponse.ok("Import completed successfully", result);
        } catch (Exception e) {
            return ApiResponse.error("Import failed: " + e.getMessage());
        }
    }

    @PostMapping("/generate")
    public ApiResponse<Map<String, Object>> generateSampleData(
            @RequestParam(defaultValue = "50") int customerCount) {
        try {
            Map<String, Object> result = csvImportService.generateSampleData(customerCount);
            return ApiResponse.ok("Sinh dữ liệu mẫu thành công", result);
        } catch (Exception e) {
            return ApiResponse.error("Sinh dữ liệu thất bại: " + e.getMessage());
        }
    }

    @GetMapping("/mappings")
    public ApiResponse<List<ImportMapping>> getMappings(@RequestParam(required = false) String targetTable) {
        return ApiResponse.ok(importMappingService.getMappings(targetTable));
    }

    @GetMapping("/mappings/{id}")
    public ApiResponse<ImportMapping> getMappingById(@PathVariable Long id) {
        return ApiResponse.ok(importMappingService.getMappingById(id));
    }

    @PostMapping("/mappings")
    public ApiResponse<ImportMapping> createMapping(@Valid @RequestBody ImportMappingRequestDto request) {
        return ApiResponse.ok("Lưu cấu hình mapping thành công", importMappingService.saveMapping(request));
    }

    @DeleteMapping("/mappings/{id}")
    public ApiResponse<String> deleteMapping(@PathVariable Long id) {
        importMappingService.deleteMapping(id);
        return ApiResponse.ok("Xóa cấu hình mapping thành công", "DELETED");
    }

    @GetMapping("/history")
    public ApiResponse<Page<ImportLog>> getImportHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(csvImportService.getImportHistory(PageRequest.of(page, size)));
    }
}
