import { describe, expect, it } from "vitest";
import { parseLuexueScript } from "../src/inspect";

describe("Luexue script parser", () => {
  it("parses demo qdy.js metadata comments correctly", () => {
    const demoScript = `
/*!
 * @name 全豆要[聚合音源]
 * @description 迭代5.0版本，聚合 星海/溯音/念心/长青/歌一刀专属汽水音乐，多链路自动回退
 * @version v5.0
 * @author 全豆要 and Gemini优化 Toskysun去混淆 TZB679兼容性处理，修复部分平台播放无法获取链接语音问题
 */
`;
    const result = parseLuexueScript(demoScript);
    expect(result.name).toBe("全豆要[聚合音源]");
    expect(result.description).toBe("迭代5.0版本，聚合 星海/溯音/念心/长青/歌一刀专属汽水音乐，多链路自动回退");
    expect(result.version).toBe("5.0");
    expect(result.author).toBe("全豆要 and Gemini优化 Toskysun去混淆 TZB679兼容性处理，修复部分平台播放无法获取链接语音问题");
  });

  it("handles alternative comment styles and semver versions", () => {
    const script = `
/**
 * @name 测试音源
 * @desc 这是一个支持多音源的插件
 * @version 1.2.3
 * @author 开发者
 * @homepage https://example.com
 */
`;
    const result = parseLuexueScript(script);
    expect(result.name).toBe("测试音源");
    expect(result.description).toBe("这是一个支持多音源的插件");
    expect(result.version).toBe("1.2.3");
    expect(result.author).toBe("开发者");
    expect(result.homepage).toBe("https://example.com");
  });

  it("parses heavily obfuscated scripts like nianxin comments", () => {
    const obfScript = `
/**
 * @name 念心音源
 * @description 音源更新，关注微信公众号: 念心小站
 * @version 1.0.1
 * @author 念心小站
 */
`;
    const result = parseLuexueScript(obfScript);
    expect(result.name).toBe("念心音源");
    expect(result.version).toBe("1.0.1");
    expect(result.author).toBe("念心小站");
  });
});
