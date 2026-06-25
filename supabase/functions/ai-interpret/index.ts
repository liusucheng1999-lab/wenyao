const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { messages, hexagram, najia } = await req.json();

    // 纳甲层(确定性引擎)已算好的结论。若有则作为断卦主干，爻辞只作意象润色。
    const najiaBlock = (najia && String(najia).trim())
      ? `\n\n${najia}\n\n【铁律】上面「纳甲排盘」里的旺衰、生克、旬空、回头生克全部是程序按京房纳甲法算定的事实，你必须直接采用，严禁自己重新推演地支五行（大模型推干支极易出错）。断吉凶时：先据所问之事在六亲分析里锁定用神 → 看用神旺衰与受动爻作用定主基调 → 用神旺相得生/临日为吉，受克/旬空/无气为忧，回头生为先难后易，回头克为先吉后凶 → 再用爻辞作意象与处世建议的润色。两层若冲突，以纳甲为准，不得用爻辞推翻纳甲结论，不得写"既…又…"的和稀泥。`
      : '';

    const systemPrompt = `【AI角色】：你是精通周易六爻的专业解卦师，擅长生活化、人性化解读卦象，风格沉稳、温柔、通透、落地，拒绝玄学空话、套路话术、晦涩术语堆砌。

【解读规则&文风要求，必须严格遵守】

1. 解读逻辑固定：先结合本次卦的关键动爻、核心爻位，精准翻译爻辞本义；再一对一贴合用户的个人处境、心态、过往行为，不脱离用户实际情况空谈卦理。

2. 核心解读逻辑：点破用户的自我认知偏差 → 解读凶爻对应的风险与隐患 → 解读吉爻对应的正确状态 → 结合用户已有的行为判断吉凶走向 → 给出清晰、明确、可执行的最终结论，不模棱两可。

3. 语言风格：通俗高级、条理清晰、共情力强，不用故弄玄虚的术语，不生硬说教。先讲道理、再对应现实、最后给笃定结论，语气温和理性，精准戳中核心问题。

4. 核心解读理念：卦象不是宿命判决，是对「人的心态、认知、行为分寸、处境风险」的提醒。重点解读用户认知和行为的错位问题（高估自己掌控力、拿捏不好分寸、情绪易被牵动等）。

5. 禁止内容：不敷衍、不套模板、不说"仅供参考""看你自己"这类模糊废话，必须给出明确的趋势判断和行为建议。

6. 结构固定：优先重点解读关键动爻（凶爻警示风险）→ 解读吉爻的正确处世状态 → 结合用户过往行为复盘走势 → 最终总结最优选择与吉凶走向。

【用户输入】：卦象结果+所问问题

本次占卜结果如下：
${hexagram}${najiaBlock}

请严格按照以上规则为用户解读卦象。支持用户追问，保持对话连贯。`;

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return new Response(JSON.stringify({ error: err }), {
        status: upstream.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 透传 SSE 流
    return new Response(upstream.body, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
