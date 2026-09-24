package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.*;
import com.cd1.rfmanalytics.entity.*;
import com.cd1.rfmanalytics.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerSegmentRepository segmentRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final SegmentHistoryRepository historyRepository;

    public Page<CustomerSegmentDto> getCustomers(String segment, String keyword, Pageable pageable) {
        Page<CustomerSegment> page = segmentRepository.findBySegmentAndKeyword(segment, keyword, pageable);
        return page.map(this::mapToSegmentDto);
    }

    @Transactional(readOnly = true)
    public CustomerDetailDto getCustomerDetail(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng với ID: " + customerId));

        CustomerSegment seg = segmentRepository.findByCustomerId(customerId).orElse(null);

        // Fetch recent orders (first 10)
        List<Order> recentOrders = orderRepository.findByCustomerIdOrderByOrderDateDesc(customerId);
        List<OrderDto> orderDtos = recentOrders.stream()
                .limit(10)
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());

        // Fetch recent activities (first 20)
        List<UserActivityLog> recentActivities = activityLogRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        List<UserActivityLogDto> activityDtos = recentActivities.stream()
                .limit(20)
                .map(this::mapToActivityDto)
                .collect(Collectors.toList());

        // Fetch segment history
        List<SegmentHistory> history = historyRepository.findByCustomerIdOrderByChangedAtDesc(customerId);

        CustomerDetailDto.CustomerDetailDtoBuilder builder = CustomerDetailDto.builder()
                .id(customer.getId())
                .customerCode(customer.getCustomerCode())
                .fullName(customer.getFullName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .gender(customer.getGender())
                .city(customer.getCity())
                .createdAt(customer.getCreatedAt())
                .recentOrders(orderDtos)
                .recentActivities(activityDtos)
                .segmentHistory(history);

        if (seg != null) {
            builder.segment(seg.getSegment())
                    .rScore(seg.getRScore())
                    .fScore(seg.getFScore())
                    .mScore(seg.getMScore())
                    .rfmTotal(seg.getRfmTotal())
                    .recencyDays(seg.getRecencyDays())
                    .frequency(seg.getFrequency())
                    .monetary(seg.getMonetary())
                    .avgOrderValue(seg.getAvgOrderValue())
                    .preferredCategory(seg.getPreferredCategory())
                    .lastPurchaseAt(seg.getLastPurchaseAt())
                    .lastActiveAt(seg.getLastActiveAt())
                    .calculatedAt(seg.getCalculatedAt())
                    .totalViews(seg.getTotalViews())
                    .totalCartAdds(seg.getTotalCartAdds())
                    .totalPurchases(seg.getTotalPurchases())
                    .totalReviews(seg.getTotalReviews());
        } else {
            builder.segment("NEW_CUSTOMERS")
                    .rScore(0).fScore(0).mScore(0)
                    .rfmTotal(BigDecimal.ZERO)
                    .recencyDays(999)
                    .frequency(0)
                    .monetary(BigDecimal.ZERO)
                    .avgOrderValue(BigDecimal.ZERO)
                    .totalViews(0).totalCartAdds(0).totalPurchases(0).totalReviews(0);
        }

        return builder.build();
    }

    public Page<OrderDto> getCustomerOrders(Long customerId, Pageable pageable) {
        Page<Order> orders = orderRepository.findByCustomerIdOrderByOrderDateDesc(customerId, pageable);
        return orders.map(this::mapToOrderDto);
    }

    public Page<UserActivityLogDto> getCustomerActivities(Long customerId, Pageable pageable) {
        Page<UserActivityLog> activities = activityLogRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
        return activities.map(this::mapToActivityDto);
    }

    public List<SegmentHistory> getCustomerSegmentHistory(Long customerId) {
        return historyRepository.findByCustomerIdOrderByChangedAtDesc(customerId);
    }

    private CustomerSegmentDto mapToSegmentDto(CustomerSegment s) {
        return CustomerSegmentDto.builder()
                .id(s.getId())
                .customerId(s.getCustomer().getId())
                .customerCode(s.getCustomer().getCustomerCode())
                .fullName(s.getCustomer().getFullName())
                .email(s.getCustomer().getEmail())
                .phone(s.getCustomer().getPhone())
                .city(s.getCustomer().getCity())
                .recencyDays(s.getRecencyDays())
                .frequency(s.getFrequency())
                .monetary(s.getMonetary())
                .rScore(s.getRScore())
                .fScore(s.getFScore())
                .mScore(s.getMScore())
                .rfmTotal(s.getRfmTotal())
                .segment(s.getSegment())
                .totalViews(s.getTotalViews())
                .totalCartAdds(s.getTotalCartAdds())
                .totalPurchases(s.getTotalPurchases())
                .totalReviews(s.getTotalReviews())
                .avgOrderValue(s.getAvgOrderValue())
                .preferredCategory(s.getPreferredCategory())
                .lastPurchaseAt(s.getLastPurchaseAt())
                .calculatedAt(s.getCalculatedAt())
                .build();
    }

    private OrderDto mapToOrderDto(Order o) {
        List<OrderDetail> details = orderDetailRepository.findByOrderId(o.getId());
        List<OrderDetailDto> itemDtos = details.stream().map(d -> OrderDetailDto.builder()
                .id(d.getId())
                .productId(d.getProduct() != null ? d.getProduct().getId() : null)
                .productName(d.getProduct() != null ? d.getProduct().getName() : "Sản phẩm #" + d.getId())
                .categoryName(d.getProduct() != null && d.getProduct().getCategory() != null ? d.getProduct().getCategory().getName() : null)
                .quantity(d.getQuantity())
                .unitPrice(d.getUnitPrice())
                .subtotal(d.getSubtotal())
                .build()).collect(Collectors.toList());

        return OrderDto.builder()
                .id(o.getId())
                .orderCode(o.getOrderCode())
                .customerId(o.getCustomer().getId())
                .customerName(o.getCustomer().getFullName())
                .totalAmount(o.getTotalAmount())
                .orderStatus(o.getOrderStatus())
                .paymentMethod(o.getPaymentMethod())
                .orderDate(o.getOrderDate())
                .itemsCount(itemDtos.size())
                .items(itemDtos)
                .build();
    }

    private UserActivityLogDto mapToActivityDto(UserActivityLog a) {
        return UserActivityLogDto.builder()
                .id(a.getId())
                .customerId(a.getCustomer().getId())
                .customerName(a.getCustomer().getFullName())
                .actionType(a.getActionType())
                .productId(a.getProduct() != null ? a.getProduct().getId() : null)
                .productName(a.getProduct() != null ? a.getProduct().getName() : null)
                .categoryId(a.getCategory() != null ? a.getCategory().getId() : null)
                .categoryName(a.getCategory() != null ? a.getCategory().getName() : null)
                .searchKeyword(a.getSearchKeyword())
                .durationSeconds(a.getDurationSeconds())
                .deviceType(a.getDeviceType())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
