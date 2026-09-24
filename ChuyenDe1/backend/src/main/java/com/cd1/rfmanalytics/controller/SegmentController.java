package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.ApiResponse;
import com.cd1.rfmanalytics.dto.CustomerSegmentDto;
import com.cd1.rfmanalytics.entity.SegmentHistory;
import com.cd1.rfmanalytics.service.SegmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/segments")
@RequiredArgsConstructor
public class SegmentController {

    private final SegmentService segmentService;

    @GetMapping
    public ApiResponse<Page<CustomerSegmentDto>> getSegments(
            @RequestParam(required = false) String segment,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(segmentService.getCustomersBySegment(segment, PageRequest.of(page, size)));
    }

    @GetMapping("/overview")
    public ApiResponse<List<Map<String, Object>>> getOverview() {
        return ApiResponse.ok("Lấy tổng quan phân khúc thành công", segmentService.getOverview());
    }

    @PostMapping("/recalculate")
    public ApiResponse<String> recalculate() {
        segmentService.recalculateSegments();
        return ApiResponse.ok("Tính toán phân loại khách hàng hoàn tất!", "SUCCESS");
    }

    @GetMapping("/history")
    public ApiResponse<Page<SegmentHistory>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ApiResponse.ok(segmentService.getHistory(PageRequest.of(page, size)));
    }
}
