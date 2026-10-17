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
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

    @GetMapping("/files/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        try {
            Resource resource = csvImportService.downloadImportFile(id);
            String fileName = csvImportService.getImportFileName(id);
            String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/files/{id}/rerun")
    public ApiResponse<ImportLog> rerunImport(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean cleanBeforeImport) {
        try {
            ImportLog result = csvImportService.rerunImport(id, cleanBeforeImport);
            return ApiResponse.ok("Chạy lại phân tích tệp thành công", result);
        } catch (Exception e) {
            return ApiResponse.error("Chạy lại phân tích thất bại: " + e.getMessage());
        }
    }

    @DeleteMapping("/history/{id}")
    public ApiResponse<String> deleteImportLog(@PathVariable Long id) {
        try {
            csvImportService.deleteImportLog(id);
            return ApiResponse.ok("Xóa lịch sử nạp dữ liệu và tệp thành công", "DELETED");
        } catch (Exception e) {
            return ApiResponse.error("Xóa lịch sử thất bại: " + e.getMessage());
        }
    }
}
