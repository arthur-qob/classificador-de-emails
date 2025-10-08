from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import os
import PyPDF2
import io
import spacy
import google.generativeai as genai
from typing import Tuple, Optional
import asyncio
import hashlib
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

executor = ThreadPoolExecutor(max_workers=3)

HF_API_KEY = os.getenv("HF_API_KEY")
GOOGLE_API = os.getenv("GOOGLE_API")

if not HF_API_KEY or not GOOGLE_API:
    raise ValueError("Missing required environment variables: HF_API_KEY and GOOGLE_API")

genai.configure(api_key=GOOGLE_API)

try:
    nlp = spacy.load("pt_core_news_sm")
except OSError:
    raise RuntimeError("Spacy model 'pt_core_news_sm' not found. Install with: python -m spacy download pt_core_news_sm")

MAX_TEXT_LENGTH = 50000
ALLOWED_FILE_TYPES = {'.txt', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024

classification_cache = {}
response_cache = {}
CACHE_MAX_SIZE = 100

def get_text_hash(text: str) -> str:
    return hashlib.md5(text.encode('utf-8')).hexdigest()

def process_text(text: str) -> str:
    if not text or not text.strip():
        return ""
    doc = nlp(text[:MAX_TEXT_LENGTH])
    filtered_tokens = [
        token.lemma_ for token in doc
        if not token.is_stop and token.is_alpha
    ]
    return " ".join(filtered_tokens)

def extract_text_from_file(file) -> Tuple[Optional[str], Optional[Tuple]]:
    if not file or not file.filename:
        return None, (jsonify({"error": "Arquivo inválido"}), 400)

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_FILE_TYPES:
        return None, (jsonify({"error": "Formato de arquivo não suportado. Use .txt ou .pdf."}), 400)

    try:
        file_content = file.read()
        if len(file_content) > MAX_FILE_SIZE:
            return None, (jsonify({"error": "Arquivo muito grande. Tamanho máximo: 10MB"}), 400)

        if file_ext == '.txt':
            text = file_content.decode('utf-8', errors='ignore')
        elif file_ext == '.pdf':
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            if len(pdf_reader.pages) > 100:
                return None, (jsonify({"error": "PDF com muitas páginas. Máximo: 100 páginas"}), 400)
            pdf_text_list = [page.extract_text() for page in pdf_reader.pages]
            text = "\n".join(pdf_text_list)
        else:
            return None, (jsonify({"error": "Formato de arquivo não suportado"}), 400)

        return text, None
    except UnicodeDecodeError:
        return None, (jsonify({"error": "Erro ao decodificar arquivo. Verifique a codificação."}), 400)
    except Exception as e:
        return None, (jsonify({"error": f"Erro ao processar arquivo: {str(e)}"}), 400)

def classify_text_api(processed_text: str) -> dict:
    categories = ['produtivo', 'improdutivo']
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}

    text_hash = get_text_hash(processed_text)

    if text_hash in classification_cache:
        return classification_cache[text_hash]

    payload = {
        "inputs": processed_text,
        "parameters": {
            "candidate_labels": categories,
            "multi_label": False
        }
    }

    response = requests.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
        headers=headers,
        json=payload,
        timeout=30
    )

    if response.status_code == 503:
        raise Exception("Modelo está carregando. Tente novamente em alguns segundos.")
    elif response.status_code != 200:
        raise Exception(f"Falha na classificação: {response.text}")

    result = response.json()

    if isinstance(result, dict) and 'error' in result:
        raise Exception(result['error'])

    if len(classification_cache) >= CACHE_MAX_SIZE:
        classification_cache.pop(next(iter(classification_cache)))

    classification_cache[text_hash] = result

    return result

def generate_response_api(category: str, email_text: str) -> str:
    cache_key = get_text_hash(f"{category}:{email_text[:1000]}")

    if cache_key in response_cache:
        return response_cache[cache_key]

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')

        if category.lower() == 'produtivo':
            prompt = f"Sugira uma resposta curta e profissional para o seguinte email, acusando o recebimento e informando que a solicitação será processada:\n\nEmail: \"{email_text[:1000]}\"\n\nResposta:"
        else:
            prompt = f"Sugira uma resposta curta e cordial para o seguinte email de baixa prioridade:\n\nEmail: \"{email_text[:1000]}\"\n\nResposta:"

        response = model.generate_content(prompt)
        result = response.text if response.text else 'Não foi possível sugerir uma resposta.'

        if len(response_cache) >= CACHE_MAX_SIZE:
            response_cache.pop(next(iter(response_cache)))

        response_cache[cache_key] = result

        return result
    except Exception as e:
        app.logger.error(f"Erro ao gerar resposta: {str(e)}")
        return 'Não foi possível sugerir uma resposta.'

@app.route("/classificar", methods=["POST"])
def classify_email():
    email_text = ""

    if 'file' in request.files:
        file = request.files['file']
        text, error = extract_text_from_file(file)
        if error:
            return error
        email_text = text
    elif request.is_json:
        data = request.json
        email_text = data.get("text", "")

    if not email_text or not email_text.strip():
        return jsonify({"error": "Nenhum texto fornecido"}), 400

    if len(email_text) > MAX_TEXT_LENGTH:
        return jsonify({"error": f"Texto muito longo. Máximo: {MAX_TEXT_LENGTH} caracteres"}), 400

    try:
        processed_text = process_text(email_text)

        if not processed_text or not processed_text.strip():
            return jsonify({"error": "Não foi possível processar o texto"}), 400

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def process_parallel():
            classification_task = loop.run_in_executor(executor, classify_text_api, processed_text)
            classification_result = await classification_task

            best_category = classification_result['labels'][0]
            best_score = classification_result['scores'][0]

            response_task = loop.run_in_executor(executor, generate_response_api, best_category, email_text)
            generated_response = await response_task

            return best_category, best_score, generated_response

        best_category, best_score, generated_response = loop.run_until_complete(process_parallel())
        loop.close()

        return jsonify({
            'category': best_category.capitalize(),
            'confidence': f'{round(best_score * 100, 2)}%',
            'suggested_response': generated_response
        })
    except requests.exceptions.Timeout:
        return jsonify({"error": "Tempo de requisição excedido. Tente novamente."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Erro na requisição: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

if __name__ == "__main__":
    app.run()