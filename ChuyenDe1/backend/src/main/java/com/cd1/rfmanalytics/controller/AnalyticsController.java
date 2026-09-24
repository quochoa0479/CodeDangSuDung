package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.*;
import com.cd1.rfmanalytics.entity.SegmentHistory;
import com.cd1.rfmanalytics.service.AnalyticsService;
import com.cd1.rfmanalytics.service.RfmAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final RfmAnalyticsService rfmAnalyticsService;

    @GetMapping("/dashboard")
    public ApiResponse<DashboardSummaryDto> getDashboard() {
        return ApiResponse.ok(analyticsService.getDashboard());
    }

    @GetMapping("/rfm-distribution")
    public ApiResponse<RfmDistributionDto> getRfmDistribution() {
        return ApiResponse.ok(analyticsService.getRfmDistribution());
    }

    @GetMapping("/churn-risk")
    public ApiResponse<List<ChurnRiskCustomerDto>> getChurnRisk() {
        return ApiResponse.ok(analyticsService.getChurnRiskCustomers());
    }

    @GetMapping("/category-preference")
    public ApiResponse<List<CategoryPreferenceDto>> getCategoryPreference() {
        return ApiResponse.ok(analyticsService.getCategoryPreferences());
    }

    @GetMapping("/revenue-trends")
    public ApiResponse<List<MonthlyRevenueDto>> getRevenueTrends() {
        return ApiResponse.ok(analyticsService.getMonthlyRevenueTrends());
    }

    // --- Backward Compatible Endpoints ---
    @GetMapping("/summary")
    public ApiResponse<RfmSummaryDto> getSummary() {
        return ApiResponse.ok(rfmAnalyticsService.getSummary());
    }

    @PostMapping("/calculate-rfm")
    public ApiResponse<String> calculateRfm() {
        rfmAnalyticsService.triggerRfmCalculation();
        return ApiResponse.ok("RFM calculation triggered successfully", "OK");
    }

    @GetMapping("/history")
    public ApiResponse<Page<SegmentHistory>> getSegmentHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(rfmAnalyticsService.getSegmentHistory(PageRequest.of(page, size)));
    }
}
