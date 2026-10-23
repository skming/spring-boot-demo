package com.example.dblab.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "请输入邮箱") @Email(message = "邮箱格式不正确") @Size(max = 120, message = "邮箱过长")
        String email,
        @NotBlank(message = "请输入密码") @Size(max = 72, message = "密码过长")
        String password
) {
}
