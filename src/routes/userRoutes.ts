import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User'; // Ensure this path is correct
import Product from '../models/product'; // Adjust path as necessary
import { verifyToken } from '../middleware/authmiddleware'; // Adjust import path if necessary

const router = express.Router();

router.use(cors());
router.use(bodyParser.json());

// User Registration
router.post('/register', async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({ firstName, lastName, email, password });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if JWT_SECRET is defined
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      secret,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      userData: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error('Login error:', err); // Log detailed error
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the folder to store uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
  }
});

const upload = multer({ storage: storage });

// Route to add a product
router.post('/api/products', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { name, description, price, location, shippingType, shippingPrice } = req.body;

    // Create a new product
    const newProduct = new Product({
      name,
      description,
      price,
      location,
      shippingType,
      shippingPrice: shippingType === 'priced' ? shippingPrice : undefined,
      image: req.file ? req.file.filename : null
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Route to get all products
router.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving products' });
  }
});


// Get Products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const products = await Product.find({
      name: new RegExp(search.toString(), 'i') // Case insensitive search
    });

    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await Product.find(); // Fetch all products from the database
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
