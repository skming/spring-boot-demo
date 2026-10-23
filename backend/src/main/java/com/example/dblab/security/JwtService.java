package com.example.dblab.security;

import com.example.dblab.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.example.dblab.common.exception.BusinessException;

/**
 * 教学用 HMAC-SHA256 JWT 实现（无第三方 JWT 库）。
 * <p>
 * 生产环境应使用成熟库与轮换密钥；这里刻意保持可读，方便对照 payload。
 */
@Service
public class JwtService {

    private final AppProperties appProperties;

    public JwtService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public String createToken(UUID userId, String email) {
        long now = Instant.now().getEpochSecond();
        long exp = now + appProperties.getSecurity().getJwtExpirationMinutes() * 60;
        String header = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = base64Url(
                "{\"sub\":\"" + userId + "\",\"email\":\"" + email + "\",\"iat\":" + now + ",\"exp\":" + exp + "}"
        );
        String signingInput = header + "." + payload;
        return signingInput + "." + sign(signingInput);
    }

    public JwtPayload parse(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw unauthorized("Invalid token");
        }
        String signingInput = parts[0] + "." + parts[1];
        if (!sign(signingInput).equals(parts[2])) {
            throw unauthorized("Invalid token signature");
        }
        String json = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        UUID userId = UUID.fromString(extract(json, "sub"));
        String email = extract(json, "email");
        long exp = Long.parseLong(extract(json, "exp"));
        if (Instant.now().getEpochSecond() >= exp) {
            throw unauthorized("Token expired");
        }
        return new JwtPayload(userId, email);
    }

    private String sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    appProperties.getSecurity().getJwtSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            ));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign JWT", ex);
        }
    }

    private static String base64Url(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String extract(String json, String field) {
        String key = "\"" + field + "\":";
        int start = json.indexOf(key);
        if (start < 0) {
            throw unauthorized("Invalid token payload");
        }
        start += key.length();
        if (json.charAt(start) == '"') {
            int end = json.indexOf('"', start + 1);
            return json.substring(start + 1, end);
        }
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            end++;
        }
        return json.substring(start, end);
    }

    private static BusinessException unauthorized(String message) {
        return new BusinessException(HttpStatus.UNAUTHORIZED, message);
    }

    public record JwtPayload(UUID userId, String email) {
    }
}
