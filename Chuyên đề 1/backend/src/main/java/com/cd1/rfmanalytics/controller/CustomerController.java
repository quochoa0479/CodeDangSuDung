package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.ApiResponse;
import com.cd1.rfmanalytics.dto.CustomerSegmentDto;
import com.cd1.rfmanalytics.service.RfmAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final RfmAnalyticsService analyticsService;

    @GetMapping
    public ApiResponse<Page<CustomerSegmentDto>> getCustomers(
            @RequestParam(required = false) String segment,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(analyticsService.getCustomersBySegment(segment, PageRequest.of(page, size)));
    }
}
