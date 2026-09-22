package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.ApiResponse;
import com.cd1.rfmanalytics.dto.RfmSummaryDto;
import com.cd1.rfmanalytics.entity.SegmentHistory;
import com.cd1.rfmanalytics.service.RfmAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final RfmAnalyticsService analyticsService;

    @GetMapping("/summary")
    public ApiResponse<RfmSummaryDto> getSummary() {
        return ApiResponse.ok(analyticsService.getSummary());
    }

    @PostMapping("/calculate-rfm")
    public ApiResponse<String> calculateRfm() {
        analyticsService.triggerRfmCalculation();
        return ApiResponse.ok("RFM calculation triggered successfully", "OK");
    }

    @GetMapping("/history")
    public ApiResponse<Page<SegmentHistory>> getSegmentHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(analyticsService.getSegmentHistory(PageRequest.of(page, size)));
    }
}
