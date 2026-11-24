import { defineDurable } from "@zapier/zapier-durable";
import { createZapierSdk } from "@zapier/zapier-sdk";
import { z } from "zod";
import { TOPICS } from "./lib/topics.ts";

const sdk = createZapierSdk();

const APPROVER_EMAIL = "chavdasamarth007@gmail.com";
const BANNER_BASE = "https://kwickbot.in/linkedin";
const DECIDE_PAGE = "https://kwickbot.in/linkedin/decide.html";
// First posting day; topic 1 is used on this date, then one topic per Mon–Sat day.
const ANCHOR_DATE = "2026-11-25";
const POST_HOUR_IST = 18; // 6:00 PM IST
const IST_OFFSET_MIN = 330;

const InputSchema = z.object({}).loose();

const PROMPT = `You write LinkedIn posts for Kwickbot (kwickbot.in), an AI WhatsApp customer support and automation platform for e-commerce brands (Shopify, WooCommerce). It uses the official WhatsApp Cloud API, answers order status, returns and cancellation questions 24/7 with AI, hands off to humans in a Live Chat inbox, has an AI knowledge base, scheduled broadcasts, analytics and a developer API. It is built in India by founder Samarth Chavda.

Write ONE LinkedIn post in English about today's topic. Rules:
- First line is a scroll-stopping hook (max 12 words), then a blank line.
- 4-7 short lines or a short list that explain the problem and how Kwickbot solves it. Speak to D2C / e-commerce founders and support heads.
- Do NOT invent statistics, customer names, numbers, testimonials or features beyond the ones given.
- End with one clear call to action that includes the link provided.
- Then a blank line and 4-6 relevant hashtags (always include #Kwickbot and #WhatsAppAutomation).
- Use 2-4 emojis max. Plain text only, no markdown, no bold.
- Total under 1200 characters.
Also return a short title (max 8 words) for the link card.`;

// Mon–Sat days elapsed between two YYYY-MM-DD dates (Sundays skipped).
function postingDaysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00Z");
  const to = new Date(toIso + "T00:00:00Z");
  let n = 0;
  for (let d = new Date(from); d < to; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) n++;
  }
  return n;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const workflow = defineDurable({
  name: "kwickbot-daily-linkedin-post",
  inputSchema: InputSchema,
  run: async (ctx, _rawInput) => {
    const clock = await ctx.step("capture-run-time", async () => {
      const nowMs = Date.now();
      const ist = new Date(nowMs + IST_OFFSET_MIN * 60_000);
      const istDate = ist.toISOString().slice(0, 10);
      const index = Math.max(0, postingDaysBetween(ANCHOR_DATE, istDate)) % TOPICS.length;
      return { nowMs, istDate, index };
    });

    const topic = TOPICS[clock.index];
    const dayLabel = String(topic.day).padStart(2, "0");
    const bannerUrl = `${BANNER_BASE}/day-${dayLabel}.png`;

    const draft = await ctx.step({
      name: "write-linkedin-caption",
      maxAttempts: 3,
      retryDelaySeconds: 10,
      run: async () =>
        sdk.runAction({
          appKey: "AICLIAPI",
          actionType: "write",
          actionKey: "get_completion",
          inputs: {
            authentication_id: "0",
            model_id: "advanced/auto",
            includeWorkflowData: false,
            instructions: PROMPT,
            inputFields: {
              topic_headline: topic.headline,
              topic_angle: topic.angle,
              banner_subtitle: topic.sub,
              link: topic.link,
            },
            outputFields: [
              { name: "post", type: "text", isRequired: true, description: "The full LinkedIn post text" },
              { name: "card_title", type: "text", isRequired: true, description: "Short title for the link card" },
            ],
          },
        }),
    });

    const item = (draft.data[0] ?? {}) as { post?: string; card_title?: string };
    const post = (item.post ?? "").trim();
    const cardTitle = (item.card_title ?? topic.headline).trim();
    if (!post) {
      throw new Error("AI returned an empty post");
    }

    // Approval window closes at 11 PM IST on the run day.
    const [approvePromise, approveUrl] = await ctx.createCallback({
      name: "wait-for-approve",
      payloadSchema: z.unknown(),
      timeoutSeconds: 6 * 3600,
    });
    const [skipPromise, skipUrl] = await ctx.createCallback({
      name: "wait-for-skip",
      payloadSchema: z.unknown(),
      timeoutSeconds: 6 * 3600,
    });

    // Email links open a confirm page on kwickbot.in that POSTs to the callback
    // (callbacks reject plain GET link clicks, and a confirm click stops link scanners from deciding).
    const approveLink = `${DECIDE_PAGE}?a=approve&cb=${encodeURIComponent(approveUrl)}`;
    const skipLink = `${DECIDE_PAGE}?a=skip&cb=${encodeURIComponent(skipUrl)}`;

    const html = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#1F2E12">
<p style="font-size:13px;color:#4F8A2B;letter-spacing:1px;font-weight:bold">KWICKBOT LINKEDIN · DAY ${dayLabel} · ${esc(topic.kicker)}</p>
<p>Today's LinkedIn post is ready. Approve it and it goes live at <b>6:00 PM IST</b> (or right away if it's already past 6).</p>
<p>
<a href="${approveLink}" style="background:#4F8A2B;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">✅ Approve &amp; post</a>
&nbsp;&nbsp;
<a href="${skipLink}" style="background:#EDF2E5;color:#1F2E12;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Skip today</a>
</p>
<img src="${bannerUrl}" width="600" style="width:100%;border-radius:10px;margin:16px 0" alt="Banner">
<div style="white-space:pre-wrap;background:#F5F8EF;border-radius:10px;padding:16px;font-size:15px;line-height:1.5">${esc(post)}</div>
<p style="font-size:13px;color:#4A5A3C">Link card: <b>${esc(cardTitle)}</b> → ${esc(topic.link)}<br>No reply by 11 PM IST means the post is skipped.</p>
</div>`;

    await ctx.step("send-approval-email", async () =>
      sdk.runAction({
        appKey: "GoogleMailV2CLIAPI",
        actionType: "write",
        actionKey: "message",
        connection: "gmail_main",
        inputs: {
          to: [APPROVER_EMAIL],
          subject: `Approve today's Kwickbot LinkedIn post: ${topic.headline}`,
          body_type: "html",
          body: html,
        },
      }),
    );

    const decision = await Promise.race([
      approvePromise.then((r) => (r.status === "delivered" ? "approved" : "expired")),
      skipPromise.then((r) => (r.status === "delivered" ? "skipped" : "expired")),
    ]);

    if (decision !== "approved") {
      return { posted: false, reason: decision, day: topic.day, headline: topic.headline };
    }

    const waitSeconds = await ctx.step("compute-wait-until-6pm", async () => {
      const istMidnightUtcMs = Date.parse(clock.istDate + "T00:00:00Z") - IST_OFFSET_MIN * 60_000;
      const target = istMidnightUtcMs + POST_HOUR_IST * 3600_000;
      return Math.max(0, Math.round((target - Date.now()) / 1000));
    });
    if (waitSeconds > 0) {
      await ctx.wait("wait-until-6pm-ist", waitSeconds);
    }

    const shared = await ctx.step("post-to-linkedin", async () =>
      sdk.runAction({
        appKey: "LinkedInCLIAPI",
        actionType: "write",
        actionKey: "share",
        connection: "linkedin_main",
        inputs: {
          comment: post,
          visibility__code: "anyone",
          content__title: cardTitle,
          content__description: topic.sub,
          content__submitted_url: topic.link,
          content__submitted_image_url: bannerUrl,
        },
      }),
    );

    return { posted: true, day: topic.day, headline: topic.headline, linkedin: shared.data[0] ?? null };
  },
});

export default workflow;
