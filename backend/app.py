from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import os
import PyPDF2
import io
import spacy
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app)

HF_API_KEY = os.getenv("HF_API_KEY")
GOOGLE_API = os.getenv("GOOGLE_API")

genai.configure(api_key=GOOGLE_API)

nlp = spacy.load("pt_core_news_sm")

def process_text(text):
    doc = nlp(text)
    filtered_tokens = [
        token.lemma_ for token in doc
        if not token.is_stop and token.is_alpha
    ]
    return " ".join(filtered_tokens)

@app.route("/classificar", methods=["POST"])
def classify_email():
    email_text = ""
    
    if 'file' in request.files:
        file = request.files['file']
        if file.filename.endswith('.txt'):
            email_text = file.read().decode('utf-8')
        elif file.filename.endswith('.pdf'):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
                pdf_text_list = [page.extract_text() for page in pdf_reader.pages]
                email_text = "\n".join(pdf_text_list)
            except Exception as e:
                return jsonify({"error": f"Erro ao ler o arquivo PDF: {e}"}), 400
        else:
            return jsonify({"error": "Formato de arquivo não suportado. Use .txt ou .pdf."}), 400
    elif request.is_json:
        data = request.json
        email_text = data.get("text", "")
    
    if not email_text:
        return jsonify({"error": "Nenhum texto fornecido"}), 400

    categories = [
        'Produtivo',
        'Improdutivo'
    ]
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    processed_text = process_text(email_text)
    
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
        json=payload
    )

    if response.status_code != 200:
        return jsonify({"error": "Falha na API Hugging Face", "details": response.json()}), 500

    result = response.json()
    
    best_category = result['labels'][0]
    
    best_score = result['scores'][0]
    
    generated_response = generate_response(best_category, email_text)
    
    return jsonify({
        'category': best_category.capitalize(),
        'confidence': f'{round(best_score * 100, 2)}%',
        'suggested_response': generated_response
    })

def generate_response(category, email_text):
    model = genai.GenerativeModel('gemini-1.5-flash')

    if category.lower() == 'produtivo':
        prompt = f"Sugira uma resposta curta e profissional para o seguinte email, acusando o recebimento e informando que a solicitação será processada:\n\nEmail: \"{email_text}\"\n\nResposta:"
    else:
        prompt = f"Sugira uma resposta curta e cordial para o seguinte email de baixa prioridade:\n\nEmail: \"{email_text}\"\n\nResposta:"
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return 'Não foi possível sugerir uma resposta.'


if __name__ == "__main__":
    app.run()