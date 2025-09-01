# Classificador de E-mails com IA

Um classificador de e-mails inteligente que utiliza modelos de IA para categorizar e-mails como "Produtivo" ou "Improdutivo" e sugerir respostas adequadas.

## 📜 Descrição

Esta aplicação web permite que os usuários colem o texto de um e-mail ou façam o upload de um arquivo (.txt ou .pdf). O conteúdo é então analisado por um modelo de IA que o classifica e, em seguida, utiliza um segundo modelo de linguagem para gerar uma sugestão de resposta profissional ou cordial, dependendo da classificação.

## ✨ Features

* **Classificação de E-mails:** Categoriza os e-mails em `Produtivo` e `Improdutivo`.
* **Geração de Respostas com IA:** Sugere respostas contextuais com base na classificação do e-mail.
* **Suporte a Múltiplos Formatos:** Aceita entrada de texto direto ou upload de arquivos `.txt` e `.pdf`.
* **Interface Reativa:** Frontend moderno construído com React e TypeScript.

## 🛠️ Tecnologias Utilizadas

#### Backend
* **Python 3.10+**
* **Flask:** Microframework para a criação da API.
* **Spacy:** Para pré-processamento de texto em português.
* **Hugging Face API:** Para o modelo de classificação *zero-shot* (`facebook/bart-large-mnli`).
* **Google Generative AI (Gemini):** Para a geração das sugestões de resposta.
* **PyPDF2:** Para extração de texto de arquivos PDF.

#### Frontend
* **React 19**
* **TypeScript**
* **Vite:** Ferramenta de build e desenvolvimento.
* **Material-UI:** Para componentes de UI como o Tooltip e a barra de progresso.
* **Tailwind CSS:** Para estilização da interface.

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Node.js** (v20.x ou superior)
* **Python** (v3.10 ou superior)
* Chaves de API para **Hugging Face** e **Google AI**.

### 1. Configuração do Backend

Clone o repositório:
```bash
git clone [https://github.com/arthur-qob/classificador-de-emails.git](https://github.com/arthur-qob/classificador-de-emails.git)
cd classificador-de-emails/backend
```

Crie um ambiente virtual e instale as dependências:
```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Crie um arquivo `.env` na pasta `backend` e adicione suas chaves de API:
```
HF_API_KEY="sua_chave_hugging_face_aqui"
GOOGLE_API="sua_chave_google_api_aqui"
```

Execute o servidor Flask:
```bash
flask run
```
O backend estará rodando em `http://127.0.0.1:5000`.

### 2. Configuração do Frontend

Abra um novo terminal e navegue até a pasta `frontend`:
```bash
cd ../frontend
```

Instale as dependências do Node.js:
```bash
npm install
```

Crie um arquivo `.env.local` na pasta `frontend` para definir a URL do backend:
```
VITE_BACKEND_URL=[http://127.0.0.1:5000](http://127.0.0.1:5000)
```

Inicie a aplicação de desenvolvimento:
```bash
npm run dev
```
A aplicação estará acessível em `http://localhost:5173` (ou em outra porta, se a 5173 estiver em uso).

##  usage Como Usar

1.  **Abra a aplicação** no seu navegador.
2.  **Escolha uma das opções de entrada:**
    * Cole o texto do e-mail diretamente na área de texto.
    * Clique no botão "Carregar arquivo" para selecionar um arquivo `.txt` ou `.pdf`.
3.  **Clique em "Processar"**.
4.  **Visualize o resultado** na seção à direita, incluindo a categoria, a confiança da classificação e a resposta sugerida.
5.  **Copie a resposta** gerada com o botão "Copy" se desejar.