package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryPreferenceDto {
    private String segment;
    private String categoryName;
    private Long totalItemsSold;
    private BigDecimal categoryRevenue;
}
