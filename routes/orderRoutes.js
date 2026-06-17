const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/orders
// @desc    Place a new order (checkout) - logged-in users only
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Validate each item against the database (don't trust client-side prices)
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${product.name}` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });

      totalAmount += product.price * item.quantity;

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: 'pending'
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error placing order', error: error.message });
  }
});

// @route   GET /api/orders/myorders
// @desc    Get the logged-in user's own orders
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (admin only)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    const updated = await order.save();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

module.exports = router;
