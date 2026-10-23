package com.example.dblab.auth.service;

import com.example.dblab.auth.dto.AuthResponse;
import com.example.dblab.auth.dto.LoginRequest;
import com.example.dblab.auth.dto.RegisterRequest;
import com.example.dblab.auth.entity.User;
import com.example.dblab.auth.repository.UserRepository;
import com.example.dblab.common.exception.BusinessException;
import com.example.dblab.oplog.service.OperationLogService;
import com.example.dblab.security.JwtService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 注册/登录用例。
 * <p>
 * 密码只存 BCrypt 哈希；注册和登录都要求审计成功。
 * 响应仅在外层事务提交成功后交给 Controller；审计失败不会向客户端返回 Token。
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OperationLogService operationLogService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            OperationLogService operationLogService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.operationLogService = operationLogService;
    }

    /** 注册用户并记录审计，成功后返回用户信息与 Token。 */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException(HttpStatus.CONFLICT, "该邮箱已注册，请直接登录");
        }
        User user = new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode(request.password()),
                Instant.now()
        );
        userRepository.save(user);
        operationLogService.recordForUser(
                user.getId(),
                "AUTH_REGISTER",
                "auth",
                user.getId().toString(),
                "email=" + email,
                true,
                "registered"
        );
        return toResponse(user);
    }

    /** 校验邮箱和密码，记录登录审计并返回认证结果。 */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "邮箱或密码错误"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "邮箱或密码错误");
        }
        operationLogService.recordForUser(
                user.getId(),
                "AUTH_LOGIN",
                "auth",
                user.getId().toString(),
                "email=" + email,
                true,
                "logged_in"
        );
        return toResponse(user);
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                jwtService.createToken(user.getId(), user.getEmail())
        );
    }
}
