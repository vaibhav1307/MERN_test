import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { authenticateToken } from '../middleware/auth.js';
import CsvData from '../models/CsvData.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer to use disk storage instead of memory storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit (adjust as needed)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// Route: Upload CSV
router.post('/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create a readable stream from the saved file
    const fileStream = fs.createReadStream(req.file.path);
    const parser = fileStream.pipe(parse({
      columns: true,
      skip_empty_lines: true
    }));

    let batch = [];
    const batchSize = 1000;

    // Process CSV rows in a streaming fashion
    for await (const record of parser) {
      batch.push(record);

      if (batch.length === batchSize) {
        await CsvData.create({
          userId: req.user._id,
          fileName: req.file.originalname,
          data: batch
        });
        batch = [];
      }
    }

    // Insert any remaining rows
    if (batch.length > 0) {
      await CsvData.create({
        userId: req.user._id,
        fileName: req.file.originalname,
        data: batch
      });
    }

    // Clean up: delete the temporary file from disk
    fs.unlink(req.file.path, (err) => {
      if (err) console.error(`Error deleting file: ${req.file.path}`, err);
    });

    res.json({ message: 'CSV file processed successfully' });
  } catch (error) {
    next(error);
  }
});

// Route: Get CSV data with pagination
router.get('/data', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const data = await CsvData.find({ userId: req.user._id })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CsvData.countDocuments({ userId: req.user._id });

    res.json({
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
