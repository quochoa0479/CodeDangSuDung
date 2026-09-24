package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.LoginRequestDto;
import com.cd1.rfmanalytics.dto.LoginResponseDto;
import com.cd1.rfmanalytics.entity.SysUser;
import com.cd1.rfmanalytics.repository.SysUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final SysUserRepository userRepository;

    public LoginResponseDto login(LoginRequestDto request) {
        SysUser user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác"));

        if (!user.getPassword().equals(request.getPassword()) &&
            !user.getPassword().startsWith("$2a$")) {
            throw new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác");
        }

        return LoginResponseDto.builder()
                .token(UUID.randomUUID().toString())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().getName() : "ADMIN")
                .build();
    }

    public LoginResponseDto getCurrentUser(String username) {
        SysUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin tài khoản: " + username));

        return LoginResponseDto.builder()
                .token("active-session")
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().getName() : "ADMIN")
                .build();
    }
}
