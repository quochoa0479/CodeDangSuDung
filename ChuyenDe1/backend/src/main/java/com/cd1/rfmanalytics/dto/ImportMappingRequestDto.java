package com.cd1.rfmanalytics.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportMappingRequestDto {

    @NotBlank(message = "Tên cấu hình mapping không được để trống")
    private String name;

    @NotBlank(message = "Bảng đích không được để trống")
    private String tableTarget;

    private Map<String, String> mappingConfig;
}
