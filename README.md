# AI-Powered Data Assistant with Vector Database

This project implements an AI-powered data assistant that combines traditional database queries with vector-based document search capabilities. It uses OpenAI for embeddings and chat completions, Pinecone for vector storage, and MS SQL Server for structured data.

## Prerequisites

- Node.js (v14 or higher)
- MS SQL Server instance
- Pinecone account
- OpenAI API key

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name

# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_HOST=your_database_host

# Server Configuration
PORT=3000 # Optional, defaults to 3000
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [repository-name]
```

2. Install dependencies:
```bash
npm install
```

## Running the Server

Start the server with:
```bash
node app.js
```

The server will be available at `http://localhost:3000` (or your configured PORT).

## API Endpoints

### 1. Add Document
- **Endpoint:** POST `/add-document`
- **Purpose:** Add documents to the vector database (Pinecone)
- **Request Body:**
```json
{
    "text": "Your document text",
    "metadata": {} // Optional metadata
}
```

### 2. Ask Question
- **Endpoint:** POST `/ask`
- **Purpose:** Query both structured database and vector database
- **Request Body:**
```json
{
    "query": "Your question here"
}
```

## System Architecture

1. **Database Layer**
   - Uses MS SQL Server for structured data
   - Stores user information, transactions, orders, and products
   - Implements connection pooling for efficient database operations

2. **Vector Database Layer**
   - Uses Pinecone for document storage and similarity search
   - Stores document embeddings generated using OpenAI
   - Enables semantic search capabilities

3. **AI Integration**
   - Uses OpenAI for:
     - Text embeddings (text-embedding-3-small model)
     - Chat completions for natural language responses
   - Combines structured and unstructured data in responses

## Database Schema

The system works with the following tables:
- tbl_User (user information and KYC details)
- tbl_Transactions (transaction records)
- tbl_Orders (order information)
- tbl_Products (product catalog)

## Error Handling

- Implements graceful shutdown for database connections
- Includes error handling for database operations
- Handles vector database initialization failures
- Provides appropriate error responses for API endpoints

## Security Considerations

- Uses environment variables for sensitive configuration
- Implements database connection encryption
- Validates input data before processing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[Your chosen license] 