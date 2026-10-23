package com.example.dblab.auth.repository;

import com.example.dblab.auth.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** 用户查询与持久化；实体类型为 User，主键类型为 UUID。 */
public interface UserRepository extends JpaRepository<User, UUID> {
    /** 按邮箱查询用户，忽略大小写。 */
    Optional<User> findByEmailIgnoreCase(String email);
    /** 检查邮箱是否已注册，忽略大小写。 */
    boolean existsByEmailIgnoreCase(String email);
}
