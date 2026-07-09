const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const superAdminController = require('../controllers/superAdmin/superAdminController');
const blogController = require('../controllers/merchant/blogController');

// Public routes
router.get('/', blogController.getPublishedPosts);
router.get('/post/:slug', blogController.getPostBySlug);

// Admin-only routes (requires Super Admin authentication)
router.use(verifyToken);
router.use(superAdminController.requireSuperAdmin);

router.get('/admin/all', blogController.getAllPostsAdmin);
router.post('/', blogController.createPost);
router.put('/:id', blogController.updatePost);
router.delete('/:id', blogController.deletePost);

module.exports = router;
