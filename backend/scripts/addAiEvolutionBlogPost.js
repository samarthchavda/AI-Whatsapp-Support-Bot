const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const BlogPost = require('../models/BlogPost');

  const title = "The Evolution of Intelligence: From AI to AGI and ASI";
  const slug = "the-evolution-of-intelligence-from-ai-to-agi-and-asi";

  const content = `
<p>We live in the era of intelligence deployment. Over the past decade, artificial intelligence has transitioned from academic research laboratories to the core infrastructure of global industries. However, the term "AI" is often used to describe systems of vastly different capabilities. To chart the future of technology, we must understand the three distinct levels of artificial intelligence: Narrow AI (ANI), Artificial General Intelligence (AGI), and Artificial Superintelligence (ASI).</p>

<h3>1. Artificial Narrow Intelligence (ANI) — The Present Day</h3>
<p>Also known as Weak AI, ANI is designed to perform specific, predefined tasks. It operates under a limited set of constraints and cannot apply its learning to problems outside its domain. Modern examples include Netflix recommendation algorithms, Siri, autonomous driving systems, and current Large Language Models like GPT-4 or Gemini. While these systems feel highly conversational, they are technically master classes in specific pattern recognition tasks.</p>

<h3>2. Artificial General Intelligence (AGI) — The Human Threshold</h3>
<p>Often considered the "Holy Grail" of computer science, AGI represents a machine that possesses the ability to understand, learn, and apply knowledge across any intellectual task that a human being can. An AGI system could learn medicine, apply that logic to rocket engineering, and write a symphony about it. The consensus among leading AI researchers is that AGI is no longer a matter of "if," but "when"—with estimates suggesting emergence within the next 3 to 10 years.</p>

<h3>3. Artificial Superintelligence (ASI) — The Post-Human Era</h3>
<p>ASI represents an intelligence that surpasses the collective cognitive capacity of the entire human race across all disciplines—ranging from artistic creativity to scientific reasoning. Autonomous evolution is the key: once AGI is achieved, it can optimize its own hardware and software, transitioning to ASI within days, hours, or even minutes. This presents both the greatest opportunity and the most profound existential risk in human history.</p>

<h3>Comparison: The Three Tiers of Machine Intelligence</h3>
<p>To summarize, ANI is task-specific, AGI is human-level and generalized, and ASI is post-human and self-improving. Leading tech builders and business strategists are already adapting their roadmap to prepare for the inevitable shift toward AGI.</p>
  `.trim();

  // Check if blog post already exists to prevent duplicate entries
  const existingPost = await BlogPost.findOne({ slug });
  if (existingPost) {
    console.log("⚠️ Blog post already exists in database. Updating content...");
    existingPost.title = title;
    existingPost.content = content;
    existingPost.coverImage = "https://kwickbot.in/uploads/blog/ai-evolution.jpg";
    existingPost.summary = "Explore the three distinct eras of machine intelligence—ANI, AGI, and ASI—and learn how the roadmap of technology is shifting from task-specific tools to post-human cognition.";
    await existingPost.save();
    console.log("✅ Successfully updated existing AI Evolution blog post!");
  } else {
    const post = new BlogPost({
      title,
      slug,
      content,
      summary: "Explore the three distinct eras of machine intelligence—ANI, AGI, and ASI—and learn how the roadmap of technology is shifting from task-specific tools to post-human cognition.",
      coverImage: "https://kwickbot.in/uploads/blog/ai-evolution.jpg",
      status: "published",
      author: "Kwickbot Team",
      tags: ["AI", "AGI", "ASI", "Future of Work", "Machine Learning"],
      readTime: 4,
      createdBy: "6a46092f4121647c0e7a37da"
    });
    await post.save();
    console.log("✅ Successfully created new AI Evolution blog post in database!");
  }

  mongoose.disconnect();
}

run().catch(console.error);
