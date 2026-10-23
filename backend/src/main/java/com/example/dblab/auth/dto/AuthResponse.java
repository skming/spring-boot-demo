package com.example.dblab.auth.dto;

import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        String accessToken
) {
}
