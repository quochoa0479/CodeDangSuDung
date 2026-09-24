package com.cd1.rfmanalytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportRequestDto {
    @NotBlank(message = "File ID is required")
    private String fileId;

    @NotBlank(message = "Target table is required")
    private String targetTable;

    @NotNull(message = "Column mapping is required")
    private Map<String, String> columnMapping;

    private String templateName;
    private boolean saveAsTemplate;
}
