package com.cd1.rfmanalytics.controller;

import com.cd1.rfmanalytics.dto.ApiResponse;
import com.cd1.rfmanalytics.dto.LoginRequestDto;
import com.cd1.rfmanalytics.dto.LoginResponseDto;
import com.cd1.rfmanalytics.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto request) {
        try {
            LoginResponseDto response = authService.login(request);
            return ApiResponse.ok("Login successful", response);
        } catch (Exception e) {
            return ApiResponse.error(e.getMessage());
        }
    }
}
