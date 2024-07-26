import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer, { diskStorage, StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './routes/userRoutes'; // Adjust the path if necessary
import Product from './models/product'; // Adjust the path if necessary
import User from './models/User'; // Adjust the path if necessary
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://tonnel:tonnel@cluster0.eyeqbwd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
const allowedOrigin = 'https://ecomyecommerce.onrender.com'; 
app.use(cors({ origin: allowedOrigin })); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));


// Create uploads folder if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

connectToDatabase().catch(error => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1); // Exit the process if connection fails
});

type MulterCallback = (error: Error | null, filename: string) => void;

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the folder to store uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
  }
});


const upload = multer({ storage });

// Routes
app.post('/api/products', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { name, description, price, location, shippingType, shippingPrice } = req.body;

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

app.get('/', (req:Request,res:Response) => {
  res.status(200).json({message:"Server is running"});
})

app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving products' });
  }
});

app.get('/api/products/search', async (req: Request, res: Response) => {
  const { search } = req.query;

  if (!search || typeof search !== 'string') {
    return res.status(400).json({ error: 'Search term is required and must be a string' });
  }

  try {
    const products = await Product.find({
      name: { $regex: new RegExp(search, 'i') }
    });
    res.json({ products });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/user', async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (user) {
      return res.json(user);
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Middleware to verify JWT
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
    (req as any).userId = (decoded as JwtPayload).userId;
    next();
  });
};

app.use('/api/users', userRoutes);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
