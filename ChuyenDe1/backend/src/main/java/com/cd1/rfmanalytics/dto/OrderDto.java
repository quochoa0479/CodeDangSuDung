package com.cd1.rfmanalytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDto {
    private Long id;
    private String orderCode;
    private Long customerId;
    private String customerName;
    private BigDecimal totalAmount;
    private String orderStatus;
    private String paymentMethod;
    private LocalDateTime orderDate;
    private Integer itemsCount;
    private List<OrderDetailDto> items;
}
