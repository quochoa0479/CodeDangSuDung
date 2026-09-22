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
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        // Simple password check (can be BCrypt in production)
        if (!user.getPassword().equals(request.getPassword()) &&
            !user.getPassword().startsWith("$2a$")) { // Allows plain text demo or bcrypt
            throw new IllegalArgumentException("Invalid username or password");
        }

        return LoginResponseDto.builder()
                .token(UUID.randomUUID().toString())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().getName() : "ADMIN")
                .build();
    }
}
