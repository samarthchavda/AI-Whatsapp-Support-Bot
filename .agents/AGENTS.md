# Kwickbot Project Rules & Guidelines

## 🔒 Styling-Only Merges (Collaborator Files)
When the user asks to merge styling changes from a ZIP archive or collaborator folder:
1. **Scope Restriction:** ONLY copy, merge, or replace styling-related files (such as `.css` stylesheets, layout stylesheets) and visual page code (`.js`/`.jsx` markup classes) along with design assets (images, logos, SVG icons).
2. **Logic Protection:** DO NOT modify, replace, or delete any backend endpoints, MongoDB schemas, authorization controllers, environment configurations (`.env`), payment integrations (Razorpay), or mail delivery services (SMTP).
3. **Dry-Run Check:** Always run a file diff comparison and display the list of files to be changed to the user for review before making the actual updates.
