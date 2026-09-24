package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.*;
import com.cd1.rfmanalytics.entity.SegmentHistory;
import com.cd1.rfmanalytics.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ApiResponse<Page<CustomerSegmentDto>> getCustomers(
            @RequestParam(required = false) String segment,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "monetary") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return ApiResponse.ok(customerService.getCustomers(segment, keyword, PageRequest.of(page, size, sort)));
    }

    @GetMapping("/{id}")
    public ApiResponse<CustomerDetailDto> getCustomerDetail(@PathVariable Long id) {
        return ApiResponse.ok(customerService.getCustomerDetail(id));
    }

    @GetMapping("/{id}/orders")
    public ApiResponse<Page<OrderDto>> getCustomerOrders(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(customerService.getCustomerOrders(id, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}/activities")
    public ApiResponse<Page<UserActivityLogDto>> getCustomerActivities(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ApiResponse.ok(customerService.getCustomerActivities(id, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}/segment-history")
    public ApiResponse<List<SegmentHistory>> getCustomerSegmentHistory(@PathVariable Long id) {
        return ApiResponse.ok(customerService.getCustomerSegmentHistory(id));
    }
}
