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
public class OrderDetailDto {
    private Long id;
    private Long productId;
    private String productName;
    private String categoryName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}
