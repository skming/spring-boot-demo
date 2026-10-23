package com.example.dblab.lab.service;

/** SQL 校验与执行共用的语句分类。 */
public enum StatementKind {
    /** 查询结果类型，也包括 WITH 和 EXPLAIN 开头的语句分类。 */
    SELECT("查询"),
    INSERT("新增"),
    UPDATE("更新"),
    DELETE("删除");

    private final String label;

    StatementKind(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
