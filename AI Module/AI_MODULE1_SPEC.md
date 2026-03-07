## Project: Rayeva AI Systems Assignment

### Module: AI Auto-Category & Tag Generator

### Tech Stack
- Node.js
- Express
- MongoDB
- React
- OpenAI API

### Requirements
1. Accept product name and description.
2. Call OpenAI API.
3. Strictly enforce predefined primary categories:
	- Packaging
	- Office Supplies
	- Kitchenware
	- Personal Care
	- Apparel
	- Home Essentials
4. Generate:
	- primary_category
	- sub_category
	- 5-10 seo_tags
	- sustainability_filters (plastic-free, compostable, biodegradable, vegan, recycled, reusable)
5. Return structured JSON.
6. Store AI result in MongoDB.
7. Separate:
	- AI service
	- Business logic
	- Controller
8. Log prompt + AI response.
9. Use environment variable for API key.
10. Add error handling.

### Technical Requirements
1. Structured JSON outputs
2. Prompt + response logging
3. Environment-based API key management
4. Clear separation of AI and business logic
5. Error handling and validation

### Evaluation Criteria
| Criteria | Weight |
| --- | --- |
| Structured AI Outputs | 20% |
| Business Logic Grounding | 20% |
| Clean Architecture | 20% |
| Practical Usefulness | 20% |
| Creativity & Reasoning | 20% |
