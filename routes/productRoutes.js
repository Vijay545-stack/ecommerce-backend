const express = require('express');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products (public, supports optional ?category= and ?search=)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get a single product by id (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// @route   POST /api/products
// @desc    Create a new product (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock } = req.body;

    if (!name || !description || price === undefined || !category) {
      return res.status(400).json({ message: 'Please provide name, description, price, and category' });
    }

    const product = await Product.create({
      name, description, price, category, imageUrl, stock,
      createdBy: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    Object.assign(product, req.body);
    const updated = await product.save();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

module.exports = router;
