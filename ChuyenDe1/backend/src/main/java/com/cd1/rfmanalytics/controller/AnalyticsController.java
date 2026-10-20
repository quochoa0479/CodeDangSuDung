package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.*;
import com.cd1.rfmanalytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

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
}
