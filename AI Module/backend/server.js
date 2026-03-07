// Setup Express server with:
// - MongoDB connection
// - dotenv config
// - JSON middleware
// - product routes
// - proper error handling

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const productRoutes = require('./product.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
	res.status(200).json({ success: true, message: 'Server is running' });
});

app.use('/api/products', productRoutes);

app.use((err, _req, res, _next) => {
	res.status(err.status || 500).json({
		success: false,
		message: err.message || 'Internal server error',
	});
});

async function startServer() {
	try {
		if (!MONGODB_URI) {
			throw new Error('MONGODB_URI is not defined in environment variables.');
		}

		await mongoose.connect(MONGODB_URI);
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error.message);
		process.exit(1);
	}
}

startServer();
