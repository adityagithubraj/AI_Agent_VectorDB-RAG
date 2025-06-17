from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
import pinecone
import pymssql
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI embeddings
embeddings = OpenAIEmbeddings(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    model="text-embedding-3-small"
)

# Initialize Chat model
chat_model = ChatOpenAI(
    temperature=0.2,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

# Initialize Pinecone
pinecone.init(
    api_key=os.getenv("PINECONE_API_KEY"),
    environment=os.getenv("PINECONE_ENVIRONMENT")
)
pinecone_index = pinecone.Index(os.getenv("PINECONE_INDEX"))

# Database configuration
DB_CONFIG = {
    "server": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

# Pydantic models for request validation
class DocumentRequest(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = {}

class QueryRequest(BaseModel):
    query: str

# Database helper functions
def get_db_connection():
    return pymssql.connect(**DB_CONFIG)

class QueryHelpers:
    @staticmethod
    def get_user_data(cursor, conditions="isActive = 1"):
        cursor.execute(f"SELECT * FROM tbl_User WHERE {conditions}")
        return cursor.fetchall()

    @staticmethod
    def get_wallet_data(cursor, user_id=None):
        if user_id:
            cursor.execute(f"SELECT userId, name, walletBal FROM tbl_User WHERE userId = '{user_id}' AND isActive = 1")
        else:
            cursor.execute("SELECT userId, name, walletBal FROM tbl_User WHERE isActive = 1")
        return cursor.fetchall()

    @staticmethod
    def get_kyc_data(cursor, user_id=None):
        if user_id:
            cursor.execute(f"SELECT userId, name, kyc_type, kyc_vfy, pan_vfy, aadhaar_vfy FROM tbl_User WHERE userId = '{user_id}' AND isActive = 1")
        else:
            cursor.execute("SELECT userId, name, kyc_type, kyc_vfy, pan_vfy, aadhaar_vfy FROM tbl_User WHERE isActive = 1")
        return cursor.fetchall()

    @staticmethod
    def get_transactions(cursor, user_id=None, limit=5):
        if user_id:
            cursor.execute(f"SELECT TOP {limit} * FROM tbl_Transactions WHERE userId = '{user_id}' ORDER BY transactionDate DESC")
        else:
            cursor.execute(f"SELECT TOP {limit} * FROM tbl_Transactions ORDER BY transactionDate DESC")
        return cursor.fetchall()

    @staticmethod
    def get_orders(cursor, user_id=None, limit=5):
        if user_id:
            cursor.execute(f"SELECT TOP {limit} * FROM tbl_Orders WHERE userId = '{user_id}' ORDER BY orderDate DESC")
        else:
            cursor.execute(f"SELECT TOP {limit} * FROM tbl_Orders ORDER BY orderDate DESC")
        return cursor.fetchall()

    @staticmethod
    def get_products(cursor, category=None):
        if category:
            cursor.execute(f"SELECT * FROM tbl_Products WHERE category = '{category}' AND isActive = 1")
        else:
            cursor.execute("SELECT * FROM tbl_Products WHERE isActive = 1")
        return cursor.fetchall()

async def query_database(user_query: str) -> str:
    try:
        conn = get_db_connection()
        cursor = conn.cursor(as_dict=True)
        results = []
        
        query = user_query.lower()
        
        if 'wallet' in query or 'balance' in query:
            wallet_data = QueryHelpers.get_wallet_data(cursor)
            results.append({"type": "wallet", "data": wallet_data})

        if 'kyc' in query or 'verification' in query:
            kyc_data = QueryHelpers.get_kyc_data(cursor)
            results.append({"type": "kyc", "data": kyc_data})

        if 'transaction' in query or 'payment' in query:
            transaction_data = QueryHelpers.get_transactions(cursor)
            results.append({"type": "transactions", "data": transaction_data})

        if 'order' in query or 'purchase' in query:
            order_data = QueryHelpers.get_orders(cursor)
            results.append({"type": "orders", "data": order_data})

        if 'product' in query or 'item' in query:
            product_data = QueryHelpers.get_products(cursor)
            results.append({"type": "products", "data": product_data})

        if not results:
            user_data = QueryHelpers.get_user_data(cursor)
            results.append({"type": "user", "data": user_data})

        formatted_results = []
        for result in results:
            entries = []
            for record in result["data"]:
                record_entries = [f"{key}: {value}" for key, value in record.items() if value is not None]
                entries.append(f"{result['type'].upper()}: {', '.join(record_entries)}")
            formatted_results.append("\n".join(entries))

        cursor.close()
        conn.close()
        return "\n\n".join(formatted_results) or "No data found"

    except Exception as error:
        print('Database query error:', str(error))
        return "Unable to fetch data from database"

async def search_vector_db(query: str) -> str:
    try:
        query_embedding = await embeddings.aembed_query(query)
        
        search_results = pinecone_index.query(
            vector=query_embedding,
            top_k=3,
            include_metadata=True
        )

        if not search_results.matches:
            return "No relevant documents found"

        return "\n".join(match.metadata["text"] for match in search_results.matches)

    except Exception as error:
        print('Vector search error:', str(error))
        return "Unable to search knowledge base"

@app.post("/add-document")
async def add_document(request: DocumentRequest):
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text is required")

        embedding = await embeddings.aembed_query(request.text)
        
        vector = {
            "id": f"doc_{int(time.time())}",
            "values": embedding,
            "metadata": {
                "text": request.text,
                **request.metadata
            }
        }

        pinecone_index.upsert([vector])

        return {
            "message": "Document added successfully",
            "documentId": vector["id"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
async def ask_question(request: QueryRequest):
    try:
        # Get relevant context from vector database
        vector_context = await search_vector_db(request.query)
        
        # Get relevant data from SQL database
        db_context = await query_database(request.query)
        
        # Combine contexts
        combined_context = f"Vector DB Context:\n{vector_context}\n\nDatabase Context:\n{db_context}"
        
        # Create messages for the chat model
        messages = [
            SystemMessage(content="You are a helpful AI assistant. Use the following context to answer the user's question:"),
            HumanMessage(content=f"Context: {combined_context}\n\nQuestion: {request.query}")
        ]
        
        # Get response from chat model
        response = await chat_model.ainvoke(messages)
        
        return {"response": response.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 