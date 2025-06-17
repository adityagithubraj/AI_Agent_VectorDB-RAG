# AI Agent with Vector DB and SQL Integration

This project implements an intelligent data retrieval system that combines Vector Database (Pinecone) capabilities with traditional SQL database operations, enhanced by OpenAI's language models.

## System Architecture

```mermaid
flowchart TD
    A[Client Application] --> B[Express Server]

    subgraph "Main API Endpoints"
        B --> C[/ask endpoint]
        B --> D[/add-document endpoint]
    end

    subgraph "Document Addition Flow"
        D --> E[Create Embeddings]
        E --> F[Store in Pinecone]
    end

    subgraph "Query Processing Flow"
        C --> G[Process User Query]
        G --> H{Parallel Processing}
        
        H --> I[Query SQL Database]
        H --> J[Search Vector DB]
        
        I --> K[Combine Results]
        J --> K
        
        K --> L[Send to ChatOpenAI]
        L --> M[Generate Response]
    end

    M --> N[Return to Client]
```

## System Components

### 1. API Endpoints

- **/add-document**: Adds new documents to the vector database
- **/ask**: Processes user queries and returns AI-generated responses

### 2. Database Integration

#### SQL Database Tables
- User profiles
- Wallet information
- KYC details
- Transaction records
- Order history
- Product information

#### Vector Database (Pinecone)
- Stores document embeddings
- Enables semantic search
- Retrieves contextually relevant information

### 3. AI Components

- **OpenAI Embeddings**: text-embedding-3-small model (1024 dimensions)
- **ChatOpenAI**: Processes combined data and generates natural responses

## Flow Description

1. **Document Addition Process**
   - Receives text input
   - Generates embeddings using OpenAI
   - Stores in Pinecone with metadata
   - Returns confirmation

2. **Query Processing**
   - Receives user query
   - Parallel processing:
     - Searches SQL database for relevant structured data
     - Searches Pinecone for relevant documents
   - Combines results
   - Processes through ChatOpenAI
   - Returns formatted response

## Setup Requirements

1. Environment Variables:
   ```
   OPENAI_API_KEY=your_openai_key
   PINECONE_API_KEY=your_pinecone_key
   PINECONE_INDEX=your_index_name
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   DB_HOST=your_db_host
   PORT=3000
   ```

2. Dependencies:
   - @langchain/openai
   - @pinecone-database/pinecone
   - express
   - mssql
   - dotenv

## Error Handling

- Database connection errors
- Query processing errors
- Vector database errors
- API errors
- Graceful shutdown handling

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start the server: `npm start`

The server will be available at `http://localhost:3000`

## API Usage

### Adding Documents
```bash
POST /add-document
Content-Type: application/json

{
    "text": "Your document text",
    "metadata": {
        "optional": "metadata"
    }
}
```

### Querying the System
```bash
POST /ask
Content-Type: application/json

{
    "query": "Your question here"
}
```



## License

[Your chosen license] 
