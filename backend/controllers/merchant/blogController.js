const BlogPost = require('../../models/BlogPost');
const { sanitizeHtml } = require('../../utils/sanitizeHtml');

// Get all published posts (Public)
exports.getPublishedPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    const sanitizedPosts = posts.map(p => ({
      ...p,
      content: sanitizeHtml(p.content || '')
    }));

    res.json({ success: true, count: sanitizedPosts.length, data: sanitizedPosts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single post by slug (Public)
exports.getPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' })
      .populate('createdBy', 'name email')
      .lean();
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    post.content = sanitizeHtml(post.content || '');
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all posts for admin (both draft and published)
exports.getAllPostsAdmin = async (req, res) => {
  try {
    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    const sanitizedPosts = posts.map(p => ({
      ...p,
      content: sanitizeHtml(p.content || '')
    }));

    res.json({ success: true, count: sanitizedPosts.length, data: sanitizedPosts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a post
exports.createPost = async (req, res) => {
  try {
    const { title, slug, summary, content, coverImage, tags, status, author } = req.body;
    
    // Check if slug is unique
    const existing = await BlogPost.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Slug must be unique. An article with this slug already exists.' });
    }

    const sanitizedContent = sanitizeHtml(content || '');

    const newPost = new BlogPost({
      title,
      slug,
      summary,
      content: sanitizedContent,
      coverImage,
      tags: tags || [],
      status: status || 'draft',
      author: author || 'Kwickbot Team',
      createdBy: req.admin._id
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const { title, slug, summary, content, coverImage, tags, status, author } = req.body;

    // Check if slug is unique (excluding current post)
    if (slug) {
      const existing = await BlogPost.findOne({ slug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Slug must be unique. An article with this slug already exists.' });
      }
    }

    const updatePayload = { title, slug, summary, coverImage, tags, status, author };
    if (content !== undefined) {
      updatePayload.content = sanitizeHtml(content || '');
    }

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    res.json({ success: true, message: 'Blog post deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
