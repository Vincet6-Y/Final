package com.example.FinalWeb.controller;

import com.rometools.rome.feed.synd.*;
import com.rometools.rome.io.*;

import org.springframework.web.bind.annotation.*;

import java.net.URL;
import java.util.*;

@RestController
@RequestMapping("/api/news")
@CrossOrigin(origins = "*")
public class JpNewsController {

    private final List<String> RSS_SOURCES = Arrays.asList(

            // Google 日本新聞
           // "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja"

            // NHK
           // "https://www3.nhk.or.jp/rss/news/cat0.xml"

            // Yahoo Japan
           "https://news.yahoo.co.jp/rss/topics/top-picks.xml"
    );

    @GetMapping("/japan")
    public List<Map<String, String>> getJapanNews() {

        List<Map<String, String>> newsList = new ArrayList<>();
        Set<String> titleSet = new HashSet<>();

        try {

            SyndFeedInput input = new SyndFeedInput();

            for (String rssUrl : RSS_SOURCES) {

                URL url = new URL(rssUrl);

                SyndFeed feed = input.build(new XmlReader(url));

                for (SyndEntry entry : feed.getEntries()) {

                    String title = entry.getTitle();

                    // 避免重複新聞
                    if (titleSet.contains(title)) continue;

                    titleSet.add(title);

                    Map<String, String> item = new HashMap<>();

                    item.put("title", title);

                    item.put(
                            "link",
                            "https://translate.google.com/translate?sl=ja&tl=zh-TW&u="
                                    + entry.getLink()
                    );

                    if (entry.getPublishedDate() != null) {
                        item.put("date", entry.getPublishedDate().toString());
                    } else {
                        item.put("date", "");
                    }

                    if (entry.getSource() != null) {
                        item.put("source", entry.getSource().getTitle());
                    } else {
                        item.put("source", "Japan News");
                    }

                    newsList.add(item);
                }
            }

            // 按時間排序
            newsList.sort((a, b) -> b.get("date").compareTo(a.get("date")));

        } catch (Exception e) {
            e.printStackTrace();
        }

        // 只回傳最新5筆
        if (newsList.size() > 5) {
            return newsList.subList(0, 5);
        }

        return newsList;
    }
}