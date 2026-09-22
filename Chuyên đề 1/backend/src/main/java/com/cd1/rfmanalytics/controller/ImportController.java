package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.ApiResponse;
import com.cd1.rfmanalytics.dto.CsvPreviewDto;
import com.cd1.rfmanalytics.dto.ImportRequestDto;
import com.cd1.rfmanalytics.entity.ImportLog;
import com.cd1.rfmanalytics.entity.ImportMapping;
import com.cd1.rfmanalytics.service.CsvImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/import")
@RequiredArgsConstructor
public class ImportController {

    private final CsvImportService csvImportService;

    @PostMapping("/preview")
    public ApiResponse<CsvPreviewDto> previewCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "targetTable", defaultValue = "customers") String targetTable) {
        try {
            CsvPreviewDto preview = csvImportService.previewCsv(file, targetTable);
            return ApiResponse.ok("Preview generated successfully", preview);
        } catch (Exception e) {
            return ApiResponse.error("Failed to read CSV file: " + e.getMessage());
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

    @GetMapping("/mappings")
    public ApiResponse<List<ImportMapping>> getMappings(@RequestParam(defaultValue = "customers") String targetTable) {
        return ApiResponse.ok(csvImportService.getSavedMappings(targetTable));
    }

    @GetMapping("/history")
    public ApiResponse<Page<ImportLog>> getImportHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(csvImportService.getImportHistory(PageRequest.of(page, size)));
    }
}
