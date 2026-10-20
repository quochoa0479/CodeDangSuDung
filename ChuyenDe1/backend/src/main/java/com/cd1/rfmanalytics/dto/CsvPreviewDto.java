package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CsvPreviewDto {
    private String fileId;
    private String fileName;
    private long totalRows;
    private List<String> headers;
    private List<Map<String, String>> sampleRows;
    private List<String> targetFields;
    private String fileFormat;
    private String detectedTable;
}
