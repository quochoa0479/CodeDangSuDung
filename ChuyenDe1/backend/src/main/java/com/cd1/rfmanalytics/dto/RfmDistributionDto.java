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
public class RfmDistributionDto {
    private List<Map<String, Object>> rDistribution;
    private List<Map<String, Object>> fDistribution;
    private List<Map<String, Object>> mDistribution;
    private List<Map<String, Object>> heatmapMatrix; // (rScore, fScore, count)
}
