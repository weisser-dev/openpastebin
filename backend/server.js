const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Encryption key from environment - 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: No ENCRYPTION_KEY set in environment. Using random key. Data will not be recoverable after restart!');
}

// Encryption functions using AES-256-GCM
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv + authTag + encrypted (all in hex)
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/openpastebin';
mongoose.connect(MONGO_URI).catch(() => {});

// Paste Schema
const pasteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true },
  title: { type: String, default: 'Untitled' },
  type: { type: String, enum: ['text', 'code', 'file'], default: 'text' },
  language: { type: String, default: 'plaintext' },
  fileName: String,
  mimeType: String,
  password: { type: String }, // bcrypt hashed password
  isSplit: { type: Boolean, default: false },
  splitPartner: { type: String }, // ID of the other half if split
  maxViews: { type: Number, default: null }, // null = unlimited, 1 = burn after read, 2 = 2-time access
  viewCount: { type: Number, default: 0 },
  allowEdit: { type: Boolean, default: false }, // Allow editing after creation
  editPassword: { type: String }, // Optional password for editing
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastEditedAt: { type: Date }
});

const Paste = mongoose.model('Paste', pasteSchema);

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File type filter - only programming/text files and archives
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.json',
    '.py', '.java', '.c', '.cpp', '.h', '.hpp',
    '.cs', '.go', '.rs', '.php', '.rb',
    '.html', '.css', '.scss', '.sass', '.less',
    '.xml', '.yml', '.yaml', '.toml', '.ini',
    '.sql', '.sh', '.bash', '.zsh',
    '.txt', '.md', '.markdown', '.log',
    '.env', '.gitignore', '.dockerfile',
    '.zip'
  ];

  const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Only programming/text files and archives are supported.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Cleanup expired pastes every minute
setInterval(async () => {
  try {
    await Paste.deleteMany({ expiresAt: { $lt: new Date() } });
  } catch (error) {
    // Silent cleanup - no logging
  }
}, 60000);

// Helper function to calculate expiration time
const calculateExpirationMs = (value, unit, isFile = false) => {
  const val = parseInt(value) || 15;
  const multipliers = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000
  };

  // Enforce maximum limits
  const maxLimits = isFile ? {
    seconds: 86400,    // 24 hours in seconds
    minutes: 1440,     // 24 hours in minutes
    hours: 24,         // 24 hours
    days: 1            // 1 day
  } : {
    seconds: 2592000,  // 30 days in seconds
    minutes: 43200,    // 30 days in minutes
    hours: 720,        // 30 days in hours
    days: 30           // 30 days
  };

  const limitedVal = Math.min(val, maxLimits[unit] || maxLimits.minutes);
  return limitedVal * (multipliers[unit] || multipliers.minutes);
};

// Helper function to detect syntax/language from content
const detectLanguage = (content) => {
  const trimmed = content.trim();

  // HTML Detection
  if (/<\s*([a-z]+)[^>]*>/i.test(trimmed)) {
    return 'html';
  }

  // JSON Detection
  try {
    JSON.parse(trimmed);
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
  } catch (e) {}

  // XML Detection
  if (/^<\?xml/i.test(trimmed)) {
    return 'xml';
  }

  // JavaScript/TypeScript Detection
  if (/\b(function|const|let|var|=>|import|export|require)\b/.test(content)) {
    if (/\b(interface|type|enum|implements|extends)\b/.test(content) && /:.*=/.test(content)) {
      return 'typescript';
    }
    return 'javascript';
  }

  // Python Detection
  if (/\b(def|class|import|from|print|if __name__|elif)\b/.test(content)) {
    return 'python';
  }

  // PHP Detection
  if (/<\?php/.test(content)) {
    return 'php';
  }

  // CSS Detection
  if (/[.#][\w-]+\s*\{[^}]*\}/.test(content) && /[:;{}]/.test(content)) {
    return 'css';
  }

  // SQL Detection
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN)\b/i.test(content)) {
    return 'sql';
  }

  // Bash/Shell Detection
  if (/^#!\/bin\/(bash|sh)/.test(trimmed) || /\b(echo|cd|ls|mkdir|chmod|grep|awk|sed)\b/.test(content)) {
    return 'bash';
  }

  // Java Detection
  if (/\b(public|private|protected|class|interface|extends|implements)\b.*\{/.test(content)) {
    return 'java';
  }

  // C# Detection
  if (/\b(using|namespace|class)\b.*\{/.test(content) && /\bpublic\s+(static\s+)?void\b/.test(content)) {
    return 'csharp';
  }

  // Go Detection
  if (/\b(package|func|import|type|var)\b/.test(content) && /package\s+main/.test(content)) {
    return 'go';
  }

  // Rust Detection
  if (/\b(fn|let|mut|impl|trait|struct|enum|use)\b/.test(content)) {
    return 'rust';
  }

  return 'plaintext';
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper function to validate and generate custom URL
const generateCustomId = async (customUrl) => {
  // Validate length (minimum 6 characters)
  if (customUrl.length < 6) {
    throw new Error('Custom URL must be at least 6 characters long');
  }

  // Validate that it contains at least 1 number or special character
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(customUrl);
  if (!hasNumberOrSpecial) {
    throw new Error('Custom URL must contain at least 1 number or special character');
  }

  // Validate allowed characters (alphanumeric, hyphen, underscore, and common special chars)
  const validChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  if (!validChars.test(customUrl)) {
    throw new Error('Custom URL contains invalid characters');
  }

  // Generate ID with format: [2 digits][customUrl][1 digit]
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const prefix = String(Math.floor(Math.random() * 90) + 10); // 10-99
    const suffix = String(Math.floor(Math.random() * 10)); // 0-9
    const generatedId = `${prefix}${customUrl}${suffix}`;

    // Check if ID already exists
    const existing = await Paste.findOne({ id: generatedId });
    if (!existing) {
      return generatedId;
    }

    attempts++;
  }

  throw new Error('Unable to generate unique ID. Please try a different custom URL.');
};

// Create paste
app.post('/api/paste', async (req, res) => {
  try {
    const { content, title, type, language, expiresValue, expiresUnit, password, isSplit, maxViews, customUrl, allowEdit, editPassword } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const expiresMs = calculateExpirationMs(expiresValue || 15, expiresUnit || 'minutes');
    const expiresAt = new Date(Date.now() + expiresMs);

    // Auto-detect language if not specified or set to plaintext
    let detectedLanguage = language || 'plaintext';
    if (!language || language === 'plaintext') {
      detectedLanguage = detectLanguage(content);
    }

    // Handle password hashing if provided
    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Handle edit password hashing if provided
    let hashedEditPassword = null;
    if (allowEdit && editPassword && editPassword.trim()) {
      hashedEditPassword = await bcrypt.hash(editPassword, 10);
    }

    // Handle split token
    if (isSplit) {
      const midPoint = Math.floor(content.length / 2);
      const part1 = content.substring(0, midPoint);
      const part2 = content.substring(midPoint);

      let id1, id2;

      // Generate IDs - custom URL not supported for split tokens
      if (customUrl && customUrl.trim()) {
        return res.status(400).json({ error: 'Custom URL is not supported with Split Token feature' });
      }

      id1 = nanoid(8);
      id2 = nanoid(8);

      const paste1 = new Paste({
        id: id1,
        content: encrypt(part1), // Encrypted
        title: `${title || 'Untitled'} (Part 1/2)`,
        type: type || 'text',
        language: detectedLanguage,
        password: hashedPassword,
        isSplit: true,
        splitPartner: id2,
        maxViews: maxViews || null,
        allowEdit: allowEdit || false,
        editPassword: hashedEditPassword,
        expiresAt
      });

      const paste2 = new Paste({
        id: id2,
        content: encrypt(part2), // Encrypted
        title: `${title || 'Untitled'} (Part 2/2)`,
        type: type || 'text',
        language: detectedLanguage,
        password: hashedPassword,
        isSplit: true,
        splitPartner: id1,
        maxViews: maxViews || null,
        allowEdit: allowEdit || false,
        editPassword: hashedEditPassword,
        expiresAt
      });

      await paste1.save();
      await paste2.save();

      return res.json({
        success: true,
        isSplit: true,
        id1,
        id2,
        url1: `${req.protocol}://${req.get('host')}/${id1}`,
        url2: `${req.protocol}://${req.get('host')}/${id2}`,
        expiresAt: expiresAt.toISOString()
      });
    }

    // Regular paste
    let id;

    // Generate ID - custom or random
    if (customUrl && customUrl.trim()) {
      try {
        id = await generateCustomId(customUrl.trim());
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    } else {
      id = nanoid(8);
    }

    const paste = new Paste({
      id,
      content: encrypt(content), // Encrypted
      title: title || 'Untitled',
      type: type || 'text',
      language: detectedLanguage,
      password: hashedPassword,
      maxViews: maxViews || null,
      allowEdit: allowEdit || false,
      editPassword: hashedEditPassword,
      expiresAt
    });

    await paste.save();

    res.json({
      success: true,
      id,
      url: `${req.protocol}://${req.get('host')}/${id}`,
      expiresAt: expiresAt.toISOString(),
      detectedLanguage
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create paste' });
  }
});

// Edit paste
app.put('/api/paste/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, title, editPassword } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const paste = await Paste.findOne({ id });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    // Check if expired
    if (paste.expiresAt < new Date()) {
      await Paste.deleteOne({ id });
      return res.status(410).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    // Check if editing is allowed
    if (!paste.allowEdit) {
      return res.status(403).json({ error: 'This paste cannot be edited' });
    }

    // Check edit password if set
    if (paste.editPassword) {
      if (!editPassword) {
        return res.status(401).json({ error: 'Edit password is required' });
      }

      const isValid = await bcrypt.compare(editPassword, paste.editPassword);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid edit password' });
      }
    }

    // Update paste
    paste.content = encrypt(content); // Encrypted
    if (title) paste.title = title;
    paste.lastEditedAt = new Date();

    // Re-detect language
    paste.language = detectLanguage(content);

    await paste.save();

    res.json({
      success: true,
      id: paste.id,
      title: paste.title,
      content: content, // Return plaintext (not encrypted)
      language: paste.language,
      lastEditedAt: paste.lastEditedAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit paste' });
  }
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { expiresValue, expiresUnit, password, maxViews } = req.body;
    const expiresMs = calculateExpirationMs(expiresValue || 15, expiresUnit || 'minutes', true);
    const expiresAt = new Date(Date.now() + expiresMs);

    // Handle password hashing if provided
    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const id = nanoid(8);

    // Convert file buffer to base64 for storage, then encrypt
    const content = req.file.buffer.toString('base64');

    const paste = new Paste({
      id,
      content: encrypt(content), // Encrypted
      title: req.file.originalname,
      type: 'file',
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      password: hashedPassword,
      maxViews: maxViews ? parseInt(maxViews) : null,
      expiresAt
    });

    await paste.save();

    res.json({
      success: true,
      id,
      url: `${req.protocol}://${req.get('host')}/${id}`,
      fileName: req.file.originalname,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get paste by ID (check if password protected)
app.get('/api/paste/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paste = await Paste.findOne({ id });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    // Check if expired
    if (paste.expiresAt < new Date()) {
      await Paste.deleteOne({ id });
      return res.status(410).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    // If password protected, don't send content (but don't increment view count yet)
    if (paste.password) {
      return res.json({
        id: paste.id,
        title: paste.title,
        type: paste.type,
        language: paste.language,
        fileName: paste.fileName,
        mimeType: paste.mimeType,
        passwordProtected: true,
        isSplit: paste.isSplit,
        splitPartner: paste.splitPartner,
        maxViews: paste.maxViews,
        viewCount: paste.viewCount,
        allowEdit: paste.allowEdit,
        editPassword: paste.editPassword ? true : false,
        expiresAt: paste.expiresAt.toISOString(),
        createdAt: paste.createdAt.toISOString(),
        lastEditedAt: paste.lastEditedAt ? paste.lastEditedAt.toISOString() : null
      });
    }

    // Increment view count for non-password protected pastes
    paste.viewCount += 1;
    await paste.save();

    // Check if max views reached, delete if so
    if (paste.maxViews && paste.viewCount >= paste.maxViews) {
      const content = decrypt(paste.content); // Decrypted
      const pasteData = {
        id: paste.id,
        content,
        title: paste.title,
        type: paste.type,
        language: paste.language,
        fileName: paste.fileName,
        mimeType: paste.mimeType,
        isSplit: paste.isSplit,
        splitPartner: paste.splitPartner,
        maxViews: paste.maxViews,
        viewCount: paste.viewCount,
        burnAfterRead: true,
        allowEdit: paste.allowEdit,
        editPassword: paste.editPassword ? true : false,
        expiresAt: paste.expiresAt.toISOString(),
        createdAt: paste.createdAt.toISOString(),
        lastEditedAt: paste.lastEditedAt ? paste.lastEditedAt.toISOString() : null
      };

      await Paste.deleteOne({ id });
      return res.json(pasteData);
    }

    res.json({
      id: paste.id,
      content: decrypt(paste.content), // Decrypted
      title: paste.title,
      type: paste.type,
      language: paste.language,
      fileName: paste.fileName,
      mimeType: paste.mimeType,
      isSplit: paste.isSplit,
      splitPartner: paste.splitPartner,
      maxViews: paste.maxViews,
      viewCount: paste.viewCount,
      allowEdit: paste.allowEdit,
      editPassword: paste.editPassword ? true : false,
      expiresAt: paste.expiresAt.toISOString(),
      createdAt: paste.createdAt.toISOString(),
      lastEditedAt: paste.lastEditedAt ? paste.lastEditedAt.toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve paste' });
  }
});

// Verify password and get paste content
app.post('/api/paste/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const paste = await Paste.findOne({ id });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    // Check if expired
    if (paste.expiresAt < new Date()) {
      await Paste.deleteOne({ id });
      return res.status(410).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    if (!paste.password) {
      return res.status(400).json({ error: 'Paste is not password protected' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password || '', paste.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Increment view count after successful password verification
    paste.viewCount += 1;
    await paste.save();

    // Check if max views reached, delete if so
    if (paste.maxViews && paste.viewCount >= paste.maxViews) {
      const content = decrypt(paste.content); // Decrypted
      const pasteData = {
        id: paste.id,
        content,
        title: paste.title,
        type: paste.type,
        language: paste.language,
        fileName: paste.fileName,
        mimeType: paste.mimeType,
        isSplit: paste.isSplit,
        splitPartner: paste.splitPartner,
        maxViews: paste.maxViews,
        viewCount: paste.viewCount,
        burnAfterRead: true,
        allowEdit: paste.allowEdit,
        editPassword: paste.editPassword ? true : false,
        expiresAt: paste.expiresAt.toISOString(),
        createdAt: paste.createdAt.toISOString(),
        lastEditedAt: paste.lastEditedAt ? paste.lastEditedAt.toISOString() : null
      };

      await Paste.deleteOne({ id });
      return res.json(pasteData);
    }

    res.json({
      id: paste.id,
      content: decrypt(paste.content), // Decrypted
      title: paste.title,
      type: paste.type,
      language: paste.language,
      fileName: paste.fileName,
      mimeType: paste.mimeType,
      isSplit: paste.isSplit,
      splitPartner: paste.splitPartner,
      maxViews: paste.maxViews,
      viewCount: paste.viewCount,
      allowEdit: paste.allowEdit,
      editPassword: paste.editPassword ? true : false,
      expiresAt: paste.expiresAt.toISOString(),
      createdAt: paste.createdAt.toISOString(),
      lastEditedAt: paste.lastEditedAt ? paste.lastEditedAt.toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Get raw paste content
app.get('/api/raw/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paste = await Paste.findOne({ id });

    if (!paste) {
      return res.status(404).send('Paste not found, expired, or invalid URL');
    }

    if (paste.expiresAt < new Date()) {
      await Paste.deleteOne({ id });
      return res.status(410).send('Paste not found, expired, or invalid URL');
    }

    if (paste.type === 'file') {
      // Decrypt and send file with proper headers
      const decrypted = decrypt(paste.content);
      const buffer = Buffer.from(decrypted, 'base64');
      res.setHeader('Content-Type', paste.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${paste.fileName}"`);
      res.send(buffer);
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(decrypt(paste.content)); // Decrypted
    }
  } catch (error) {
    res.status(500).send('Failed to retrieve paste');
  }
});

// Delete paste (optional cleanup endpoint)
app.delete('/api/paste/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Paste.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Paste not found, expired, or invalid URL' });
    }

    res.json({ success: true, message: 'Paste deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete paste' });
  }
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const totalPastes = await Paste.countDocuments();
    const expiredCount = await Paste.countDocuments({ expiresAt: { $lt: new Date() } });

    res.json({
      totalPastes,
      activePastes: totalPastes - expiredCount,
      expiredPastes: expiredCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.listen(PORT, '0.0.0.0');
