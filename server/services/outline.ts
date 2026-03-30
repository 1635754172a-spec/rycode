import type { AIAdapter } from './ai/types.js';
import type { GeneratedOutline, OutlineGenerationRequest } from './ai/types.js';

const OUTLINE_SYSTEM = `你是一位专业的编程教育课程设计师。你的任务是将提供的课程目录结构，原汁原味地转化为结构化JSON大纲。你的回复必须是且只能是一个合法的JSON对象，不含任何额外文字、解释、思考过程或markdown。`;

const buildOutlinePrompt = (req: OutlineGenerationRequest): string => {
  // If content looks like a gitsite directory listing, use specialized prompt
  const isDirectoryListing = req.content.includes('课程章节目录') || req.content.includes('▶ ');

  if (isDirectoryListing) {
    return `
以下是从「${req.sourceTitle ?? '教程'}」提取的完整章节目录结构。
请将其转化为结构化课程大纲，规则如下：

1. 【一级目录项】（无缩进，标记为 ▶）= 单元（unit）
2. 【二级目录项】（2格缩进，▶）= 课时（lesson），title 必须与目录原文完全一致，不得归纳、改写或合并
3. 【三级目录项】（4格缩进，▶）= 属于上一个二级课时的子课时，放入该课时的 children 数组，title 同样必须与原文完全一致
4. 每个单元必须包含至少1个课时，不能为空
5. 严禁遗漏任何目录项，严禁跨级合并，严禁自行归纳或重新命名
6. unit 的 title 格式：「第N单元：原文标题」，N从1开始递增
7. 难度：入门基础=EASY，核心概念=MID，高级特性=HARD，最难/异步/元编程=ELITE

目录内容：
${req.content.slice(0, 20000)}

输出 JSON（严格按此结构）：
{
  "title": "${req.sourceTitle ?? '课程'}",
  "description": "课程简介（2-3句话）",
  "units": [
    {
      "title": "第N单元：单元标题",
      "subtitle": "单元副标题",
      "lessons": [
        {
          "title": "课时标题",
          "difficulty": "EASY|MID|HARD|ELITE",
          "children": [
            { "title": "子课时标题", "difficulty": "EASY|MID|HARD|ELITE" }
          ]
        }
      ]
    }
  ]
}

注意：
- difficulty 只能是 EASY、MID、HARD、ELITE 之一
- 没有三级子项的课时，children 字段省略或设为空数组 []
- 标题使用中文`;
  }

  // Generic content prompt
  return `
请分析以下学习材料，为其设计一个完整的编程课程大纲。

材料标题: ${req.sourceTitle ?? '未知'}
目标学员: ${req.targetAudience ?? '编程初学者到中级开发者'}
难度定位: ${{ beginner: '初级', intermediate: '中级', advanced: '高级' }[req.difficulty ?? 'intermediate']}

材料内容:
${req.content.slice(0, 12000)}

请输出如下 JSON 结构：
{
  "title": "课程总标题",
  "description": "课程简介（2-3句话）",
  "units": [
    {
      "title": "第N单元：单元标题",
      "subtitle": "单元副标题，描述核心主题",
      "lessons": [
        {
          "title": "N.N 课时标题",
          "difficulty": "EASY|MID|HARD|ELITE"
        }
      ]
    }
  ]
}

要求：
- 单元数量：4-8个
- 每单元课时数：3-6个，每个单元必须有课时，不能为空
- 难度分布合理（从EASY到HARD循序渐进）
- 标题使用中文
- difficulty 字段只能是 EASY、MID、HARD、ELITE 之一
`;
};

export async function generateOutline(
  adapter: AIAdapter,
  req: OutlineGenerationRequest,
): Promise<GeneratedOutline> {
  return adapter.chatJSON<GeneratedOutline>(
    [{ role: 'user', content: buildOutlinePrompt(req) }],
    { systemPrompt: OUTLINE_SYSTEM, temperature: 0.4, jsonMode: true },
  );
}
