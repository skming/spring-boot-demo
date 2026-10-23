# B02 Auth

## 先看

- `auth/controller/AuthController.java`
- `auth/service/AuthService.java`
- `security/JwtService.java`
- `security/SecurityConfig.java`

## 目标

- 注册写 `users`
- 登录校验密码哈希并签发 JWT
- 注册/登录会记 `operation_logs`
- 受保护接口的未登录/无效/过期 Token 返回统一 JSON `401`；其他用户的观影记录返回 `404`，两者不要混淆

## 验证

注册后：

```sql
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;
```
