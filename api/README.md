# FastAPI Vector DB RAG Application

This is a FastAPI implementation of the Vector DB RAG (Retrieval-Augmented Generation) application. It provides endpoints for adding documents to a vector database and querying both the vector database and SQL database using natural language.

## Features

- Document addition to Pinecone vector database
- Natural language querying of both vector and SQL databases
- Integration with OpenAI's language models
- SQL Server database integration
- CORS support for cross-origin requests

## Prerequisites

- Python 3.8 or higher
- SQL Server database
- Pinecone account and API key
- OpenAI API key

## Environment Variables

Create a `.env` file in the `api` directory with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX=your_pinecone_index_name
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

## Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

Start the FastAPI server:
```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## API Endpoints

### 1. Add Document
- **URL**: `/add-document`
- **Method**: POST
- **Body**:
```json
{
    "text": "Your document text",
    "metadata": {
        "key": "value"
    }
}
```

### 2. Ask Question
- **URL**: `/ask`
- **Method**: POST
- **Body**:
```json
{
    "query": "Your question here"
}
```

## API Documentation

Once the server is running, you can access:
- Swagger UI documentation: `http://localhost:8000/docs`
- ReDoc documentation: `http://localhost:8000/redoc`

## Error Handling

The API includes comprehensive error handling for:
- Invalid requests
- Database connection issues
- Vector database errors
- OpenAI API errors

## Security Considerations

- All sensitive information is stored in environment variables
- CORS is configured to allow cross-origin requests
- Input validation is implemented using Pydantic models 