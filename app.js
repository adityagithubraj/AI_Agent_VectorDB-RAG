// ai-agent-server.js
require("dotenv").config();
const express = require("express");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { ChatOpenAI } = require("@langchain/openai");
const { Pinecone } = require("@pinecone-database/pinecone");
const sql = require('mssql');

const app = express();
app.use(express.json());

// Initialize OpenAI with specific model
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small", // 1024 dimensions
  dimensions: 1024
});

const chatModel = new ChatOpenAI({
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

let pineconeIndex;

// Initialize Pinecone Index
const initPinecone = async () => {
  try {
    console.log('Initializing Pinecone index...');
    pineconeIndex = pc.Index(process.env.PINECONE_INDEX);
    console.log('Pinecone index initialized successfully!');
  } catch (err) {
    console.error('Error initializing Pinecone:', err);
  }
};

// Initialize Pinecone on startup
initPinecone();

// Database configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Create a connection pool
let pool;

const initializePool = async () => {
  try {
    if (!pool) {
      console.log('Creating new connection pool...');
      pool = await sql.connect(config);
      console.log('Connected to database successfully!');
    }
    return pool;
  } catch (err) {
    console.error('Database connection error:', err.message);
    throw err;
  }
};

// Database query helper functions
const queryHelpers = {
  // User related queries
  async getUserData(pool, conditions = "isActive = 1") {
    return pool.request().query(`SELECT * FROM tbl_User WHERE ${conditions}`);
  },

  async getWalletData(pool, userId = null) {
    const query = userId 
      ? `SELECT userId, name, walletBal FROM tbl_User WHERE userId = '${userId}' AND isActive = 1`
      : "SELECT userId, name, walletBal FROM tbl_User WHERE isActive = 1";
    return pool.request().query(query);
  },

  async getKYCData(pool, userId = null) {
    const query = userId
      ? `SELECT userId, name, kyc_type, kyc_vfy, pan_vfy, aadhaar_vfy FROM tbl_User WHERE userId = '${userId}' AND isActive = 1`
      : "SELECT userId, name, kyc_type, kyc_vfy, pan_vfy, aadhaar_vfy FROM tbl_User WHERE isActive = 1";
    return pool.request().query(query);
  },

  // Transaction related queries
  async getTransactions(pool, userId = null, limit = 5) {
    const query = userId
      ? `SELECT TOP ${limit} * FROM tbl_Transactions WHERE userId = '${userId}' ORDER BY transactionDate DESC`
      : `SELECT TOP ${limit} * FROM tbl_Transactions ORDER BY transactionDate DESC`;
    return pool.request().query(query);
  },

  // Order related queries
  async getOrders(pool, userId = null, limit = 5) {
    const query = userId
      ? `SELECT TOP ${limit} * FROM tbl_Orders WHERE userId = '${userId}' ORDER BY orderDate DESC`
      : `SELECT TOP ${limit} * FROM tbl_Orders ORDER BY orderDate DESC`;
    return pool.request().query(query);
  },

  // Product related queries
  async getProducts(pool, category = null) {
    const query = category
      ? `SELECT * FROM tbl_Products WHERE category = '${category}' AND isActive = 1`
      : "SELECT * FROM tbl_Products WHERE isActive = 1";
    return pool.request().query(query);
  }
};

const queryDatabase = async (userQuery) => {
  try {
    const pool = await initializePool();
    let results = [];
    
    // Convert query to lowercase for easier matching
    const query = userQuery.toLowerCase();
    
    // Determine what data to fetch based on the query
    if (query.includes('wallet') || query.includes('balance')) {
      const walletData = await queryHelpers.getWalletData(pool);
      results.push({ type: 'wallet', data: walletData.recordset });
    }

    if (query.includes('kyc') || query.includes('verification')) {
      const kycData = await queryHelpers.getKYCData(pool);
      results.push({ type: 'kyc', data: kycData.recordset });
    }

    if (query.includes('transaction') || query.includes('payment')) {
      const transactionData = await queryHelpers.getTransactions(pool);
      results.push({ type: 'transactions', data: transactionData.recordset });
    }

    if (query.includes('order') || query.includes('purchase')) {
      const orderData = await queryHelpers.getOrders(pool);
      results.push({ type: 'orders', data: orderData.recordset });
    }

    if (query.includes('product') || query.includes('item')) {
      const productData = await queryHelpers.getProducts(pool);
      results.push({ type: 'products', data: productData.recordset });
    }

    // If no specific data was requested or query is general, get basic user info
    if (results.length === 0) {
      const userData = await queryHelpers.getUserData(pool);
      results.push({ type: 'user', data: userData.recordset });
    }

    // Format the results
    const formattedResults = results.map(result => {
      const entries = result.data.map(record => {
        const recordEntries = Object.entries(record)
          .filter(([key, value]) => value !== null && value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        return `${result.type.toUpperCase()}: ${recordEntries}`;
      }).join('\n');
      return entries;
    }).join('\n\n');

    return formattedResults || "No data found";
  } catch (error) {
    console.error('Database query error:', error.message);
    return "Unable to fetch data from database";
  }
};

// Add documents to Pinecone
app.post("/add-document", async (req, res) => {
  try {
    const { text, metadata = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Create embedding for the text
    const embedding = await embeddings.embedQuery(text);

    // Prepare the vector for Pinecone
    const vector = {
      id: `doc_${Date.now()}`,
      values: embedding,
      metadata: {
        text,
        ...metadata
      }
    };

    // Upsert to Pinecone
    await pineconeIndex.upsert([vector]);

    res.json({ 
      message: "Document added successfully",
      documentId: vector.id
    });
  } catch (err) {
    console.error('Error adding document:', err);
    res.status(500).json({ error: "Failed to add document" });
  }
});

// Search documents in Pinecone
const searchVectorDB = async (query) => {
  try {
    if (!pineconeIndex) {
      return "Vector database not initialized";
    }

    // Create embedding for the query
    const queryEmbedding = await embeddings.embedQuery(query);

    // Search Pinecone
    const searchResults = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true
    });

    if (!searchResults.matches?.length) {
      return "No relevant documents found";
    }

    // Format results
    return searchResults.matches
      .map(match => match.metadata.text)
      .join('\n');

  } catch (error) {
    console.error('Vector search error:', error);
    return "Unable to search knowledge base";
  }
};

app.post("/ask", async (req, res) => {
  const userQuery = req.body.query;

  try {
    // Get results from both sources
    const [dbResult, vectorResult] = await Promise.all([
      queryDatabase(userQuery),
      searchVectorDB(userQuery)
    ]);

    const messages = [
      {
        role: "system",
        content: `You are a company data assistant. You have access to:
        1. User information including details, wallet balance, KYC status, and contact information
        2. A knowledge base of company documents and FAQs
        Provide concise and relevant answers based on all available data.`,
      },
      {
        role: "user",
        content: `Database Results: ${dbResult}\nKnowledge Base Results: ${vectorResult}\n\nAnswer this query: ${userQuery}`,
      },
    ];

    const response = await chatModel.call(messages);
    res.json({ response: response.text });
  } catch (err) {
    console.error('Error processing request:', err);
    res.status(500).json({ error: "Failed to process the query" });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (pool) {
    try {
      await pool.close();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Agent server running at http://localhost:${PORT}`);
});
