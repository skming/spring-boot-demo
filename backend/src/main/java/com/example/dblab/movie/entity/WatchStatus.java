package com.example.dblab.movie.entity;

/** 由观看记录是否为空推导的展示状态，不作为 movies 表中的第二份事实存储。 */
public enum WatchStatus {
    /** 没有观看记录，影片保留在想看片单。 */
    WANT_TO_WATCH("想看"),
    /** 至少有一次观看；每次观看有自己的日期、评分和笔记。 */
    WATCHED("已看");

    private final String label;

    WatchStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
