package com.example.dblab.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "请输入邮箱") @Email(message = "邮箱格式不正确") @Size(max = 120, message = "邮箱过长")
        String email,
        @NotBlank(message = "请输入密码") @Size(min = 8, max = 72, message = "密码长度需为 8-72 位")
        String password
) {
}
