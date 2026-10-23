package com.example.dblab.security;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import com.example.dblab.common.exception.BusinessException;

/**
 * 读取当前登录用户 ID。
 * <p>
 * Movie 的 owner 隔离依赖这里，而不是只依赖“已登录”。
 */
@Component
public class CurrentUserService {

    public UUID requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return principal.getId();
    }
}
